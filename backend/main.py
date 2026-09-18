from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
from urllib.parse import quote
from io import BytesIO
import mimetypes
import os
import uuid
import zlib

from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from supabase import Client, create_client


load_dotenv()


app = FastAPI(
    title="IntegrityCheck API",
    description=(
        "Backend API for Student Assignment "
        "Submission Integrity Checker"
    ),
    version="2.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://student-assignment-integrity-checke.vercel.app",
]

VERCEL_ORIGIN_REGEX = (
    r"^https://student-assignment-integrity-checker"
    r"(?:-[a-z0-9-]+)?\.vercel\.app$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=VERCEL_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# SUPABASE CONFIGURATION
# --------------------------------------------------

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "",
).strip()

SUPABASE_SECRET_KEY = os.getenv(
    "SUPABASE_SECRET_KEY",
    "",
).strip()

SUPABASE_BUCKET = os.getenv(
    "SUPABASE_BUCKET",
    "assignments",
).strip()


if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL environment variable is missing."
    )

if not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_SECRET_KEY environment variable is missing."
    )

if not SUPABASE_BUCKET:
    raise RuntimeError(
        "SUPABASE_BUCKET environment variable is missing."
    )


supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
)


# --------------------------------------------------
# FILE SETTINGS
# --------------------------------------------------

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".csv",
    ".zip",
    ".jpg",
    ".jpeg",
    ".png",
}

MAX_FILE_SIZE = 50 * 1024 * 1024


# --------------------------------------------------
# FILE VALIDATION
# --------------------------------------------------

def validate_filename(
    filename: str | None,
):
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="No filename was provided.",
        )

    original_filename = Path(
        filename
    ).name

    file_extension = Path(
        original_filename
    ).suffix.lower()

    if (
        file_extension
        not in ALLOWED_EXTENSIONS
    ):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type.",
        )

    return (
        original_filename,
        file_extension,
    )


# --------------------------------------------------
# CRC-32
# --------------------------------------------------

def calculate_crc32_bytes(
    file_bytes: bytes,
):
    crc_value = (
        zlib.crc32(file_bytes)
        & 0xFFFFFFFF
    )

    return f"{crc_value:08X}"


# --------------------------------------------------
# READ UPLOADED FILE
# --------------------------------------------------

async def read_uploaded_file(
    file: UploadFile,
):
    (
        original_filename,
        file_extension,
    ) = validate_filename(
        file.filename
    )

    try:
        file_bytes = await file.read()

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to read uploaded file."
            ),
        ) from exc

    finally:
        await file.close()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=(
                "File is too large. "
                "Maximum allowed size is 50 MB."
            ),
        )

    return {
        "original_filename":
            original_filename,

        "file_extension":
            file_extension,

        "file_size":
            len(file_bytes),

        "file_bytes":
            file_bytes,

        "crc32":
            calculate_crc32_bytes(
                file_bytes
            ),
    }


# --------------------------------------------------
# SAVE ORIGINAL FILE TO SUPABASE STORAGE
# --------------------------------------------------

async def save_original_file(
    file: UploadFile,
):
    uploaded = (
        await read_uploaded_file(
            file
        )
    )

    storage_path = (
        "submissions/"
        f"{uuid.uuid4().hex}"
        f"{uploaded['file_extension']}"
    )

    content_type = (
        mimetypes.guess_type(
            uploaded[
                "original_filename"
            ]
        )[0]
        or "application/octet-stream"
    )

    try:
        supabase.storage.from_(
            SUPABASE_BUCKET
        ).upload(
            path=storage_path,
            file=BytesIO(
                uploaded[
                    "file_bytes"
                ]
            ),
            file_options={
                "content-type":
                    content_type,

                "upsert":
                    "false",
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to store assignment file."
            ),
        ) from exc

    uploaded["storage_path"] = (
        storage_path
    )

    return uploaded


# --------------------------------------------------
# REMOVE STORAGE FILE
# --------------------------------------------------

def remove_stored_file(
    storage_path: str,
):
    try:
        supabase.storage.from_(
            SUPABASE_BUCKET
        ).remove(
            [storage_path]
        )

    except Exception:
        # Best-effort cleanup only.
        pass


# --------------------------------------------------
# VALIDATE STORED FILE PATH
# --------------------------------------------------

def validate_storage_path(
    storage_path: str,
):
    path = PurePosixPath(
        storage_path
    )

    if (
        path.is_absolute()
        or ".." in path.parts
        or not path.parts
        or path.parts[0]
        != "submissions"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid stored file path."
            ),
        )

    return str(path)


# --------------------------------------------------
# GET ONE SUBMISSION
# --------------------------------------------------

def get_submission(
    submission_id: str,
):
    try:
        response = (
            supabase.table(
                "submissions"
            )
            .select("*")
            .eq(
                "submission_id",
                submission_id,
            )
            .limit(1)
            .execute()
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to access submission data."
            ),
        ) from exc

    rows = response.data or []

    if not rows:
        return None

    return rows[0]


# --------------------------------------------------
# GENERATE SUBMISSION ID
# --------------------------------------------------

def generate_submission_id():
    try:
        response = (
            supabase.table(
                "submissions"
            )
            .select("id")
            .order(
                "id",
                desc=True,
            )
            .limit(1)
            .execute()
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to generate submission ID."
            ),
        ) from exc

    rows = response.data or []

    next_number = (
        int(rows[0]["id"]) + 1
        if rows
        else 1
    )

    return (
        f"SUB-2026-{next_number:03d}"
    )


# --------------------------------------------------
# GENERATE VERIFICATION ID
# --------------------------------------------------

def generate_verification_id():
    try:
        response = (
            supabase.table(
                "verifications"
            )
            .select("id")
            .order(
                "id",
                desc=True,
            )
            .limit(1)
            .execute()
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to generate verification ID."
            ),
        ) from exc

    rows = response.data or []

    next_number = (
        int(rows[0]["id"]) + 1
        if rows
        else 1
    )

    return (
        f"VER-2026-{next_number:03d}"
    )


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message":
            "IntegrityCheck Backend is running",

        "status":
            "online",
    }


# --------------------------------------------------
# STATUS
# --------------------------------------------------

@app.get("/api/status")
def get_status():
    try:
        (
            supabase.table(
                "submissions"
            )
            .select("id")
            .limit(1)
            .execute()
        )

        database_status = (
            "Supabase PostgreSQL active"
        )

    except Exception:
        database_status = (
            "Supabase PostgreSQL unavailable"
        )

    return {
        "status":
            "online",

        "service":
            "IntegrityCheck API",

        "backend":
            "FastAPI",

        "database":
            database_status,

        "storage":
            "Supabase Storage active",

        "crc_engine":
            "CRC-32 active",

        "crc_library":
            "Python zlib",

        "submission_details":
            (
                "Student ID, Subject "
                "and Description active"
            ),

        "file_preview":
            "Active",
    }


# --------------------------------------------------
# CREATE SUBMISSION
# --------------------------------------------------

@app.post("/api/submissions")
async def create_submission(
    student_name: str = Form(...),

    student_id: str = Form(""),

    subject: str = Form(""),

    assignment_title: str = Form(...),

    description: str = Form(""),

    file: UploadFile = File(...),
):
    student_name = (
        student_name.strip()
    )

    student_id = (
        student_id.strip()
    )

    subject = (
        subject.strip()
    )

    assignment_title = (
        assignment_title.strip()
    )

    description = (
        description.strip()
    )

    if not student_name:
        raise HTTPException(
            status_code=400,
            detail=(
                "Student name is required."
            ),
        )

    if not assignment_title:
        raise HTTPException(
            status_code=400,
            detail=(
                "Assignment title is required."
            ),
        )

    uploaded = (
        await save_original_file(
            file
        )
    )

    submission_id = (
        generate_submission_id()
    )

    submitted_at = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    record = {
        "submission_id":
            submission_id,

        "student_name":
            student_name,

        "student_id":
            student_id,

        "subject":
            subject,

        "assignment_title":
            assignment_title,

        "description":
            description,

        "original_filename":
            uploaded[
                "original_filename"
            ],

        "stored_filename":
            uploaded[
                "storage_path"
            ],

        "file_size":
            uploaded[
                "file_size"
            ],

        "reference_crc":
            uploaded[
                "crc32"
            ],

        "submitted_at":
            submitted_at,
    }

    try:
        response = (
            supabase.table(
                "submissions"
            )
            .insert(
                record
            )
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "Submission insert "
                "returned no data."
            )

    except Exception as exc:
        remove_stored_file(
            uploaded[
                "storage_path"
            ]
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save submission."
            ),
        ) from exc

    return {
        "message":
            "Submission created successfully.",

        "submission_id":
            submission_id,

        "student_name":
            student_name,

        "student_id":
            student_id,

        "subject":
            subject,

        "assignment_title":
            assignment_title,

        "description":
            description,

        "filename":
            uploaded[
                "original_filename"
            ],

        "file_size":
            uploaded[
                "file_size"
            ],

        "reference_crc":
            uploaded[
                "crc32"
            ],

        "submitted_at":
            submitted_at,

        "status":
            "stored",
    }


# --------------------------------------------------
# LIST SUBMISSIONS
# --------------------------------------------------

@app.get("/api/submissions")
def list_submissions():
    try:
        response = (
            supabase.table(
                "submissions"
            )
            .select(
                (
                    "submission_id,"
                    "student_name,"
                    "student_id,"
                    "subject,"
                    "assignment_title,"
                    "description,"
                    "original_filename,"
                    "file_size,"
                    "reference_crc,"
                    "submitted_at"
                )
            )
            .order(
                "id",
                desc=True,
            )
            .execute()
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load submissions."
            ),
        ) from exc

    rows = response.data or []

    return [
        {
            "submission_id":
                row[
                    "submission_id"
                ],

            "student_name":
                row[
                    "student_name"
                ],

            "student_id":
                row.get(
                    "student_id"
                ) or "",

            "subject":
                row.get(
                    "subject"
                ) or "",

            "assignment_title":
                row[
                    "assignment_title"
                ],

            "description":
                row.get(
                    "description"
                ) or "",

            "filename":
                row[
                    "original_filename"
                ],

            "file_size":
                row[
                    "file_size"
                ],

            "reference_crc":
                row[
                    "reference_crc"
                ],

            "submitted_at":
                row[
                    "submitted_at"
                ],
        }
        for row in rows
    ]


# --------------------------------------------------
# PREVIEW / DOWNLOAD FILE
# --------------------------------------------------

@app.get(
    "/api/submissions/{submission_id}/file"
)
def get_submission_file(
    submission_id: str,
    download: bool = False,
):
    submission = get_submission(
        submission_id
    )

    if submission is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Submission not found."
            ),
        )

    storage_path = (
        validate_storage_path(
            submission[
                "stored_filename"
            ]
        )
    )

    original_filename = Path(
        submission[
            "original_filename"
        ]
    ).name

    try:
        file_bytes = (
            supabase.storage.from_(
                SUPABASE_BUCKET
            ).download(
                storage_path
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=(
                "Stored assignment file "
                "was not found."
            ),
        ) from exc

    media_type = (
        mimetypes.guess_type(
            original_filename
        )[0]
        or "application/octet-stream"
    )

    disposition_type = (
        "attachment"
        if download
        else "inline"
    )

    encoded_filename = quote(
        original_filename
    )

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition":
                (
                    f"{disposition_type}; "
                    f"filename*=UTF-8''"
                    f"{encoded_filename}"
                )
        },
    )


# --------------------------------------------------
# VERIFY SUBMISSION
# --------------------------------------------------

@app.post(
    "/api/verify/{submission_id}"
)
async def verify_submission(
    submission_id: str,
    file: UploadFile = File(...),
):
    submission = get_submission(
        submission_id
    )

    if submission is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Submission not found."
            ),
        )

    uploaded = (
        await read_uploaded_file(
            file
        )
    )

    reference_crc = (
        submission[
            "reference_crc"
        ]
    )

    current_crc = (
        uploaded[
            "crc32"
        ]
    )

    status = (
        "Match"
        if reference_crc
        == current_crc
        else "Mismatch"
    )

    verification_id = (
        generate_verification_id()
    )

    verified_at = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    record = {
        "verification_id":
            verification_id,

        "submission_id":
            submission_id,

        "uploaded_filename":
            uploaded[
                "original_filename"
            ],

        "current_crc":
            current_crc,

        "reference_crc":
            reference_crc,

        "status":
            status,

        "verified_at":
            verified_at,
    }

    try:
        response = (
            supabase.table(
                "verifications"
            )
            .insert(
                record
            )
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "Verification insert "
                "returned no data."
            )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save verification."
            ),
        ) from exc

    return {
        "message":
            "Verification completed.",

        "verification_id":
            verification_id,

        "submission_id":
            submission_id,

        "student_name":
            submission[
                "student_name"
            ],

        "student_id":
            submission.get(
                "student_id"
            ) or "",

        "subject":
            submission.get(
                "subject"
            ) or "",

        "assignment_title":
            submission[
                "assignment_title"
            ],

        "reference_crc":
            reference_crc,

        "current_crc":
            current_crc,

        "status":
            status,

        "verified_at":
            verified_at,
    }


# --------------------------------------------------
# VERIFICATION HISTORY
# --------------------------------------------------

@app.get("/api/verifications")
def list_verifications():
    try:
        response = (
            supabase.table(
                "verifications"
            )
            .select(
                (
                    "verification_id,"
                    "submission_id,"
                    "uploaded_filename,"
                    "current_crc,"
                    "reference_crc,"
                    "status,"
                    "verified_at"
                )
            )
            .order(
                "id",
                desc=True,
            )
            .execute()
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load "
                "verification history."
            ),
        ) from exc

    rows = response.data or []

    return [
        {
            "verification_id":
                row[
                    "verification_id"
                ],

            "submission_id":
                row[
                    "submission_id"
                ],

            "uploaded_filename":
                row[
                    "uploaded_filename"
                ],

            "current_crc":
                row[
                    "current_crc"
                ],

            "reference_crc":
                row[
                    "reference_crc"
                ],

            "status":
                row[
                    "status"
                ],

            "verified_at":
                row[
                    "verified_at"
                ],
        }
        for row in rows
    ]