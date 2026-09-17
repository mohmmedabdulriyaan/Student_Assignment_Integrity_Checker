import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getSubmissions,
  verifySubmission,
} from "../services/api";

function VerifyIntegrity() {
  const fileInputRef = useRef(null);

  const [submissions, setSubmissions] =
    useState([]);

  const [selectedId, setSelectedId] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [currentCrc, setCurrentCrc] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [dragActive, setDragActive] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [verificationId, setVerificationId] =
    useState("");

  // --------------------------------------------------
  // LOAD REAL SUBMISSIONS
  // --------------------------------------------------

  const loadSubmissions = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data =
        await getSubmissions();

      const formatted = data.map(
        (submission) => ({
          id:
            submission.submission_id,

          studentName:
            submission.student_name,

          studentId:
            submission.student_id ||
            "Not available",

          assignment:
            submission.assignment_title,

          subject:
            submission.subject ||
            "Not available",

          description:
            submission.description ||
            "No description provided.",

          filename:
            submission.filename,

          referenceCrc:
            submission.reference_crc,
        })
      );

      setSubmissions(formatted);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Unable to load submissions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // --------------------------------------------------
  // SELECTED SUBMISSION
  // --------------------------------------------------

  const selectedSubmission =
    submissions.find(
      (submission) =>
        submission.id === selectedId
    );

  // --------------------------------------------------
  // FILE HANDLING
  // --------------------------------------------------

  const handleFile = (file) => {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setCurrentCrc("");
    setResult(null);
    setVerificationId("");
    setErrorMessage("");
  };

  const handleFileChange = (event) => {
    handleFile(
      event.target.files[0]
    );
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setDragActive(false);

    const file =
      event.dataTransfer.files[0];

    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();

    setDragActive(false);
  };

  // --------------------------------------------------
  // FILE SIZE
  // --------------------------------------------------

  const formatFileSize = (bytes) => {
    if (bytes === 0) {
      return "0 Bytes";
    }

    const sizes = [
      "Bytes",
      "KB",
      "MB",
      "GB",
    ];

    const index = Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    );

    return `${(
      bytes /
      Math.pow(1024, index)
    ).toFixed(2)} ${sizes[index]}`;
  };

  // --------------------------------------------------
  // REAL VERIFICATION
  // --------------------------------------------------

  const handleVerification =
    async () => {
      if (!selectedSubmission) {
        alert(
          "Please select a submission."
        );

        return;
      }

      if (!selectedFile) {
        alert(
          "Please upload the received assignment file."
        );

        return;
      }

      setIsVerifying(true);
      setErrorMessage("");
      setCurrentCrc("");
      setResult(null);
      setVerificationId("");

      try {
        const response =
          await verifySubmission(
            selectedSubmission.id,
            selectedFile
          );

        setCurrentCrc(
          response.current_crc
        );

        setVerificationId(
          response.verification_id
        );

        if (
          response.status === "Match"
        ) {
          setResult("verified");
        } else {
          setResult("issue");
        }
      } catch (error) {
        setErrorMessage(
          error.message ||
            "Verification failed."
        );
      } finally {
        setIsVerifying(false);
      }
    };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const resetVerification = () => {
    setSelectedFile(null);
    setCurrentCrc("");
    setResult(null);
    setVerificationId("");
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --------------------------------------------------
  // CHANGE SUBMISSION
  // --------------------------------------------------

  const handleSubmissionChange = (
    event
  ) => {
    setSelectedId(
      event.target.value
    );

    setSelectedFile(null);
    setCurrentCrc("");
    setResult(null);
    setVerificationId("");
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="verify-page">
      <section className="page-heading">
        <div>
          <span className="section-label">
            CRC-32 VERIFICATION
          </span>

          <h2>
            Verify Assignment Integrity
          </h2>

          <p>
            Compare the received
            assignment against its stored
            reference CRC-32 value.
          </p>
        </div>

        <div className="verification-ready-card">
          <div>
            <i className="bi bi-shield-check"></i>
          </div>

          <div>
            <strong>
              Verification Engine
            </strong>

            <span>
              Real FastAPI CRC-32 engine
            </span>
          </div>
        </div>
      </section>

      <div className="verify-layout">
        <section className="verify-main-card">
          <div className="verify-section-header">
            <div className="verify-header-icon">
              <i className="bi bi-search"></i>
            </div>

            <div>
              <h3>
                Select Submission
              </h3>

              <p>
                Choose a real student
                submission stored in
                SQLite.
              </p>
            </div>
          </div>

          <div className="verify-select-group">
            <label>
              Submission <span>*</span>
            </label>

            <div className="verify-select-wrapper">
              <i className="bi bi-files"></i>

              <select
                value={selectedId}
                onChange={
                  handleSubmissionChange
                }
                disabled={isLoading}
              >
                <option value="">
                  {isLoading
                    ? "Loading submissions..."
                    : "Select a submission"}
                </option>

                {submissions.map(
                  (submission) => (
                    <option
                      key={submission.id}
                      value={submission.id}
                    >
                      {submission.id}
                      {" - "}
                      {submission.studentName}
                      {" - "}
                      {submission.assignment}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {errorMessage &&
            !isVerifying && (
              <div
                className="submission-notice"
                style={{
                  marginTop:
                    "14px",
                  borderColor:
                    "rgba(255, 107, 122, 0.2)",
                  background:
                    "rgba(255, 107, 122, 0.05)",
                }}
              >
                <i
                  className="bi bi-exclamation-triangle"
                  style={{
                    color:
                      "#ff6b7a",
                  }}
                ></i>

                <div>
                  <p>
                    <strong>
                      Something went
                      wrong.
                    </strong>
                  </p>

                  <p>
                    {
                      errorMessage
                    }
                  </p>
                </div>
              </div>
            )}

          {selectedSubmission && (
            <div className="reference-section">
              <div className="reference-title-row">
                <div>
                  <span className="section-label">
                    REFERENCE RECORD
                  </span>

                  <h3>
                    Original Submission
                  </h3>
                </div>

                <span className="reference-badge">
                  <i className="bi bi-database-check"></i>
                  Stored
                </span>
              </div>

              <div className="reference-details-grid">
                <div>
                  <span>
                    Submission ID
                  </span>

                  <strong>
                    {
                      selectedSubmission.id
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Student
                  </span>

                  <strong>
                    {
                      selectedSubmission.studentName
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Student ID
                  </span>

                  <strong>
                    {
                      selectedSubmission.studentId
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Subject
                  </span>

                  <strong>
                    {
                      selectedSubmission.subject
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Assignment
                  </span>

                  <strong>
                    {
                      selectedSubmission.assignment
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Original File
                  </span>

                  <strong>
                    {
                      selectedSubmission.filename
                    }
                  </strong>
                </div>
              </div>

              <div
                style={{
                  marginTop: "14px",
                  padding: "14px",
                  borderRadius: "11px",
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-secondary)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color:
                      "var(--text-muted)",
                    fontSize: "8px",
                    marginBottom: "5px",
                  }}
                >
                  Description
                </span>

                <p
                  style={{
                    margin: 0,
                    color:
                      "var(--text-main)",
                    fontSize: "10px",
                    lineHeight: 1.6,
                  }}
                >
                  {
                    selectedSubmission.description
                  }
                </p>
              </div>

              <div className="reference-crc-box">
                <div className="reference-crc-icon">
                  <i className="bi bi-fingerprint"></i>
                </div>

                <div>
                  <span>
                    Real Reference
                    CRC-32
                  </span>

                  <strong>
                    {
                      selectedSubmission.referenceCrc
                    }
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div className="received-file-section">
            <div className="verify-section-header received-header">
              <div className="verify-header-icon">
                <i className="bi bi-cloud-arrow-up"></i>
              </div>

              <div>
                <h3>
                  Upload Received File
                </h3>

                <p>
                  Select the assignment
                  copy received by the
                  instructor for real
                  CRC-32 verification.
                </p>
              </div>
            </div>

            {!selectedFile ? (
              <div
                className={`verify-upload-zone ${
                  dragActive
                    ? "drag-active"
                    : ""
                }`}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                onDrop={handleDrop}
                onDragOver={
                  handleDragOver
                }
                onDragLeave={
                  handleDragLeave
                }
              >
                <div className="verify-upload-icon">
                  <i className="bi bi-cloud-arrow-up"></i>
                </div>

                <h4>
                  Upload received
                  assignment
                </h4>

                <p>
                  Drag and drop the file
                  or{" "}
                  <span>
                    click to browse
                  </span>
                </p>

                <small>
                  The exact file bytes
                  will be sent to FastAPI
                  and processed using
                  Python zlib CRC-32.
                </small>

                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={
                    handleFileChange
                  }
                  accept=".pdf,.doc,.docx,.txt,.csv,.zip,.jpg,.jpeg,.png"
                />
              </div>
            ) : (
              <div className="verify-selected-file">
                <div className="verify-file-left">
                  <div className="verify-file-icon">
                    <i className="bi bi-file-earmark-check"></i>
                  </div>

                  <div>
                    <strong>
                      {
                        selectedFile.name
                      }
                    </strong>

                    <span>
                      {formatFileSize(
                        selectedFile.size
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    resetVerification
                  }
                  className="verify-remove-btn"
                  disabled={
                    isVerifying
                  }
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            )}
          </div>

          <div className="verification-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={
                resetVerification
              }
              disabled={isVerifying}
            >
              Reset
            </button>

            <button
              type="button"
              className="verify-btn"
              onClick={
                handleVerification
              }
              disabled={
                isVerifying ||
                !selectedSubmission ||
                !selectedFile
              }
            >
              {isVerifying ? (
                <>
                  <i className="bi bi-arrow-repeat"></i>
                  Verifying...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check"></i>
                  Verify Integrity
                </>
              )}
            </button>
          </div>
        </section>

        <aside className="verify-side-column">
          <div className="comparison-card">
            <div className="comparison-card-header">
              <i className="bi bi-arrow-left-right"></i>

              <div>
                <h3>
                  CRC Comparison
                </h3>

                <p>
                  Reference vs received
                  file
                </p>
              </div>
            </div>

            <div className="crc-comparison-area">
              <div className="crc-comparison-box">
                <span>
                  Reference CRC-32
                </span>

                <strong>
                  {selectedSubmission
                    ? selectedSubmission.referenceCrc
                    : "--------"}
                </strong>
              </div>

              <div className="comparison-symbol">
                <i className="bi bi-arrow-down-up"></i>
              </div>

              <div className="crc-comparison-box">
                <span>
                  Current CRC-32
                </span>

                <strong>
                  {currentCrc ||
                    "--------"}
                </strong>
              </div>
            </div>

            {!result && (
              <div className="verification-waiting">
                <i className="bi bi-hourglass-split"></i>

                <div>
                  <strong>
                    {isVerifying
                      ? "Verification in progress"
                      : "Waiting for verification"}
                  </strong>

                  <span>
                    {isVerifying
                      ? "FastAPI is calculating the real CRC-32."
                      : "Select a submission and upload a received file."}
                  </span>
                </div>
              </div>
            )}

            {result ===
              "verified" && (
              <div className="verification-result verified-result">
                <div className="verification-result-icon">
                  <i className="bi bi-check-circle-fill"></i>
                </div>

                <h3>
                  Integrity Verified
                </h3>

                <p>
                  The current CRC-32
                  matches the stored
                  reference CRC-32.
                </p>

                <div className="result-status-pill">
                  <i className="bi bi-check-circle"></i>
                  MATCH
                </div>

                {verificationId && (
                  <p
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    Verification ID:{" "}
                    <strong>
                      {
                        verificationId
                      }
                    </strong>
                  </p>
                )}
              </div>
            )}

            {result === "issue" && (
              <div className="verification-result issue-result">
                <div className="verification-result-icon">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>

                <h3>
                  Integrity Issue
                  Detected
                </h3>

                <p>
                  The current CRC-32 does
                  not match the stored
                  reference CRC-32.
                </p>

                <div className="result-status-pill">
                  <i className="bi bi-x-circle"></i>
                  MISMATCH
                </div>

                {verificationId && (
                  <p
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    Verification ID:{" "}
                    <strong>
                      {
                        verificationId
                      }
                    </strong>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="verify-info-card">
            <div className="verify-info-header">
              <i className="bi bi-info-circle"></i>

              <div>
                <h4>
                  Verification Logic
                </h4>

                <p>
                  Real CRC-32 workflow
                </p>
              </div>
            </div>

            <div className="verify-logic-list">
              <div>
                <span>1</span>

                <p>
                  Retrieve the stored
                  submission details and
                  reference CRC from
                  SQLite.
                </p>
              </div>

              <div>
                <span>2</span>

                <p>
                  Send the received file
                  to FastAPI.
                </p>
              </div>

              <div>
                <span>3</span>

                <p>
                  Calculate its CRC-32
                  using Python zlib.
                </p>
              </div>

              <div>
                <span>4</span>

                <p>
                  Compare the reference
                  and current CRC values.
                </p>
              </div>

              <div>
                <span>5</span>

                <p>
                  Store the Match or
                  Mismatch result in
                  SQLite history.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default VerifyIntegrity;