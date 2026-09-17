from pathlib import Path
from datetime import datetime
import mimetypes
import shutil
import sqlite3
import uuid
import zlib

from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


app = FastAPI(
    title="IntegrityCheck API",
    description=(
        "Backend API for Student Assignment "
        "Submission Integrity Checker"
    ),
    version="1.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# DIRECTORIES
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"

DATABASE_PATH = (
    BASE_DIR / "integritycheck.db"
)

UPLOAD_DIR.mkdir(exist_ok=True)


# --------------------------------------------------
# ALLOWED FILE TYPES
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


# --------------------------------------------------
# DATABASE CONNECTION
# --------------------------------------------------

def get_db_connection():
    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = (
        sqlite3.Row
    )

    return connection


# --------------------------------------------------
# CHECK DATABASE COLUMN
# --------------------------------------------------

def column_exists(
    cursor,
    table_name,
    column_name,
):
    cursor.execute(
        f"PRAGMA table_info({table_name})"
    )

    columns = cursor.fetchall()

    return any(
        column["name"] == column_name
        for column in columns
    )


# --------------------------------------------------
# CREATE / UPGRADE DATABASE TABLES
# --------------------------------------------------

def initialize_database():
    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id TEXT UNIQUE NOT NULL,
            student_name TEXT NOT NULL,
            student_id TEXT,
            subject TEXT,
            assignment_title TEXT NOT NULL,
            description TEXT,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            reference_crc TEXT NOT NULL,
            submitted_at TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            verification_id TEXT UNIQUE NOT NULL,
            submission_id TEXT NOT NULL,
            uploaded_filename TEXT NOT NULL,
            current_crc TEXT NOT NULL,
            reference_crc TEXT NOT NULL,
            status TEXT NOT NULL,
            verified_at TEXT NOT NULL
        )
        """
    )

    # Safe migration for older databases.

    if not column_exists(
        cursor,
        "submissions",
        "student_id",
    ):
        cursor.execute(
            """
            ALTER TABLE submissions
            ADD COLUMN student_id TEXT
            """
        )

    if not column_exists(
        cursor,
        "submissions",
        "subject",
    ):
        cursor.execute(
            """
            ALTER TABLE submissions
            ADD COLUMN subject TEXT
            """
        )

    if not column_exists(
        cursor,
        "submissions",
        "description",
    ):
        cursor.execute(
            """
            ALTER TABLE submissions
            ADD COLUMN description TEXT
            """
        )

    connection.commit()
    connection.close()


initialize_database()


# --------------------------------------------------
# CRC-32 FROM FILE
# --------------------------------------------------

def calculate_crc32(
    file_path: Path,
):
    crc_value = 0

    with file_path.open("rb") as file:
        while True:
            chunk = file.read(8192)

            if not chunk:
                break

            crc_value = zlib.crc32(
                chunk,
                crc_value,
            )

    crc_value = (
        crc_value & 0xFFFFFFFF
    )

    return f"{crc_value:08X}"


# --------------------------------------------------
# GENERATE SUBMISSION ID
# --------------------------------------------------

def generate_submission_id():
    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM submissions
        """
    )

    total = cursor.fetchone()[
        "total"
    ]

    connection.close()

    next_number = total + 1

    return (
        f"SUB-2026-{next_number:03d}"
    )


# --------------------------------------------------
# GENERATE VERIFICATION ID
# --------------------------------------------------

def generate_verification_id():
    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM verifications
        """
    )

    total = cursor.fetchone()[
        "total"
    ]

    connection.close()

    next_number = total + 1

    return (
        f"VER-2026-{next_number:03d}"
    )


# --------------------------------------------------
# SAVE UPLOADED FILE
# --------------------------------------------------

async def save_uploaded_file(
    file: UploadFile,
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail=(
                "No filename was provided."
            ),
        )

    original_filename = Path(
        file.filename
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
            detail=(
                "Unsupported file type."
            ),
        )

    unique_filename = (
        f"{uuid.uuid4().hex}_"
        f"{original_filename}"
    )

    saved_file_path = (
        UPLOAD_DIR / unique_filename
    )

    try:
        with saved_file_path.open(
            "wb"
        ) as buffer:
            shutil.copyfileobj(
                file.file,
                buffer,
            )

    except Exception:
        if saved_file_path.exists():
            saved_file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save uploaded file."
            ),
        )

    finally:
        await file.close()

    file_size = (
        saved_file_path.stat().st_size
    )

    crc32_value = calculate_crc32(
        saved_file_path
    )

    return {
        "original_filename":
            original_filename,

        "stored_filename":
            unique_filename,

        "file_size":
            file_size,

        "file_path":
            saved_file_path,

        "crc32":
            crc32_value,
    }


# --------------------------------------------------
# HOME ROUTE
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
# STATUS ROUTE
# --------------------------------------------------

@app.get("/api/status")
def get_status():
    return {
        "status":
            "online",

        "service":
            "IntegrityCheck API",

        "backend":
            "FastAPI",

        "database":
            "SQLite active",

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
# ORIGINAL SUBMISSION ROUTE
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
        await save_uploaded_file(
            file
        )
    )

    submission_id = (
        generate_submission_id()
    )

    submitted_at = (
        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    )

    connection = (
        get_db_connection()
    )

    cursor = (
        connection.cursor()
    )

    try:
        cursor.execute(
            """
            INSERT INTO submissions (
                submission_id,
                student_name,
                student_id,
                subject,
                assignment_title,
                description,
                original_filename,
                stored_filename,
                file_size,
                reference_crc,
                submitted_at
            )
            VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )
            """,
            (
                submission_id,
                student_name,
                student_id,
                subject,
                assignment_title,
                description,
                uploaded[
                    "original_filename"
                ],
                uploaded[
                    "stored_filename"
                ],
                uploaded[
                    "file_size"
                ],
                uploaded[
                    "crc32"
                ],
                submitted_at,
            ),
        )

        connection.commit()

    except Exception:
        connection.rollback()

        if uploaded[
            "file_path"
        ].exists():
            uploaded[
                "file_path"
            ].unlink()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save submission."
            ),
        )

    finally:
        connection.close()

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
    connection = (
        get_db_connection()
    )

    cursor = (
        connection.cursor()
    )

    cursor.execute(
        """
        SELECT
            submission_id,
            student_name,
            student_id,
            subject,
            assignment_title,
            description,
            original_filename,
            file_size,
            reference_crc,
            submitted_at
        FROM submissions
        ORDER BY id DESC
        """
    )

    rows = cursor.fetchall()

    connection.close()

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
                row[
                    "student_id"
                ] or "",

            "subject":
                row[
                    "subject"
                ] or "",

            "assignment_title":
                row[
                    "assignment_title"
                ],

            "description":
                row[
                    "description"
                ] or "",

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
# PREVIEW / DOWNLOAD STORED FILE
# --------------------------------------------------

@app.get(
    "/api/submissions/{submission_id}/file"
)
def get_submission_file(
    submission_id: str,
    download: bool = False,
):
    connection = (
        get_db_connection()
    )

    cursor = (
        connection.cursor()
    )

    cursor.execute(
        """
        SELECT
            submission_id,
            original_filename,
            stored_filename
        FROM submissions
        WHERE submission_id = ?
        """,
        (submission_id,),
    )

    submission = (
        cursor.fetchone()
    )

    connection.close()

    if submission is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Submission not found."
            ),
        )

    stored_filename = Path(
        submission[
            "stored_filename"
        ]
    ).name

    original_filename = Path(
        submission[
            "original_filename"
        ]
    ).name

    file_path = (
        UPLOAD_DIR /
        stored_filename
    ).resolve()

    upload_directory = (
        UPLOAD_DIR.resolve()
    )

    # Security check:
    # only files inside backend/uploads
    # can be served.

    try:
        file_path.relative_to(
            upload_directory
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid stored file path."
            ),
        )

    if (
        not file_path.exists()
        or not file_path.is_file()
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Stored assignment file "
                "was not found."
            ),
        )

    media_type, _ = (
        mimetypes.guess_type(
            original_filename
        )
    )

    if not media_type:
        media_type = (
            "application/octet-stream"
        )

    disposition_type = (
        "attachment"
        if download
        else "inline"
    )

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=original_filename,
        content_disposition_type=(
            disposition_type
        ),
    )


# --------------------------------------------------
# REAL VERIFICATION ROUTE
# --------------------------------------------------

@app.post(
    "/api/verify/{submission_id}"
)
async def verify_submission(
    submission_id: str,
    file: UploadFile = File(...),
):
    connection = (
        get_db_connection()
    )

    cursor = (
        connection.cursor()
    )

    cursor.execute(
        """
        SELECT *
        FROM submissions
        WHERE submission_id = ?
        """,
        (submission_id,),
    )

    submission = (
        cursor.fetchone()
    )

    connection.close()

    if submission is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Submission not found."
            ),
        )

    uploaded = (
        await save_uploaded_file(
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

    if (
        reference_crc
        == current_crc
    ):
        status = "Match"

    else:
        status = "Mismatch"

    verification_id = (
        generate_verification_id()
    )

    verified_at = (
        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    )

    connection = (
        get_db_connection()
    )

    cursor = (
        connection.cursor()
    )

    cursor.execute(
        """
        INSERT INTO verifications (
            verification_id,
            submission_id,
            uploaded_filename,
            current_crc,
            reference_crc,
            status,
            verified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            verification_id,
            submission_id,
            uploaded[
                "original_filename"
            ],
            current_crc,
            reference_crc,
            status,
            verified_at,
        ),
    )

    connection.commit()
    connection.close()

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
            submission[
                "student_id"
            ] or "",

        "subject":
            submission[
                "subject"
            ] or "",

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
    connection = (
        get_db_connection()
    )

    cursor = (
        connection.cursor()
    )

    cursor.execute(
        """
        SELECT
            verification_id,
            submission_id,
            uploaded_filename,
            current_crc,
            reference_crc,
            status,
            verified_at
        FROM verifications
        ORDER BY id DESC
        """
    )

    rows = cursor.fetchall()

    connection.close()

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