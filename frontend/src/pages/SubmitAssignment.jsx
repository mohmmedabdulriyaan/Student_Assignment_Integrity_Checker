import { useRef, useState } from "react";
import { createSubmission } from "../services/api";

function SubmitAssignment() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) {
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".csv",
      ".zip",
      ".jpg",
      ".jpeg",
      ".png",
    ];

    const extension = `.${file.name
      .split(".")
      .pop()
      .toLowerCase()}`;

    if (!allowedExtensions.includes(extension)) {
      alert("Unsupported file type.");
      return;
    }

    const maxSize = 25 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "File is larger than the recommended maximum size of 25 MB."
      );
      return;
    }

    setSelectedFile(file);
    setSubmissionResult(null);
    setErrorMessage("");
  };

  const handleFileChange = (event) => {
    handleFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];

    handleFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setSubmissionResult(null);
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) {
      return "0 Bytes";
    }

    const sizes = ["Bytes", "KB", "MB", "GB"];

    const index = Math.floor(
      Math.log(bytes) / Math.log(1024)
    );

    return `${(
      bytes / Math.pow(1024, index)
    ).toFixed(2)} ${sizes[index]}`;
  };

  const clearForm = () => {
    setStudentName("");
    setStudentId("");
    setSubject("");
    setAssignmentTitle("");
    setDescription("");
    setSelectedFile(null);
    setSubmissionResult(null);
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !studentName.trim() ||
      !studentId.trim() ||
      !subject ||
      !assignmentTitle.trim()
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!selectedFile) {
      alert("Please select an assignment file.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSubmissionResult(null);

    const formData = new FormData();

    formData.append(
      "student_name",
      studentName.trim()
    );

    formData.append(
      "student_id",
      studentId.trim()
    );

    formData.append(
      "subject",
      subject
    );

    formData.append(
      "assignment_title",
      assignmentTitle.trim()
    );

    formData.append(
      "description",
      description.trim()
    );

    formData.append(
      "file",
      selectedFile
    );

    try {
      const result = await createSubmission(
        formData
      );

      setSubmissionResult(result);

      setStudentName("");
      setStudentId("");
      setSubject("");
      setAssignmentTitle("");
      setDescription("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Unable to submit assignment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="submit-page">
      <section className="page-heading">
        <div>
          <span className="section-label">
            STUDENT PORTAL
          </span>

          <h2>Submit Assignment</h2>

          <p>
            Upload your assignment securely for
            CRC-32 based integrity verification.
          </p>
        </div>

        <div className="submission-security">
          <i className="bi bi-shield-check"></i>

          <div>
            <strong>
              Integrity Protected
            </strong>

            <span>
              Real CRC-32 verification system
            </span>
          </div>
        </div>
      </section>

      <div className="submission-layout">
        <form
          className="submission-card"
          onSubmit={handleSubmit}
        >
          <div className="form-section-header">
            <div className="form-header-icon">
              <i className="bi bi-file-earmark-arrow-up"></i>
            </div>

            <div>
              <h3>
                Assignment Details
              </h3>

              <p>
                Enter the required information
                before uploading your file.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>
                Student Name <span>*</span>
              </label>

              <div className="input-wrapper">
                <i className="bi bi-person"></i>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={studentName}
                  onChange={(event) =>
                    setStudentName(
                      event.target.value
                    )
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Student ID <span>*</span>
              </label>

              <div className="input-wrapper">
                <i className="bi bi-person-badge"></i>

                <input
                  type="text"
                  placeholder="Example: 2503A51133"
                  value={studentId}
                  onChange={(event) =>
                    setStudentId(
                      event.target.value
                    )
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Subject <span>*</span>
              </label>

              <div className="input-wrapper">
                <i className="bi bi-book"></i>

                <select
                  required
                  value={subject}
                  onChange={(event) =>
                    setSubject(
                      event.target.value
                    )
                  }
                >
                  <option value="" disabled>
                    Select subject
                  </option>

                  <option value="Operating Systems">
                    Operating Systems
                  </option>

                  <option value="Computer Networks">
                    Computer Networks
                  </option>

                  <option value="Information Management Systems">
                    Information Management Systems
                  </option>

                  <option value="Web Technologies">
                    Web Technologies
                  </option>

                  <option value="Cloud Computing">
                    Cloud Computing
                  </option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                Assignment Title{" "}
                <span>*</span>
              </label>

              <div className="input-wrapper">
                <i className="bi bi-card-text"></i>

                <input
                  type="text"
                  placeholder="Example: CRC Laboratory Assignment"
                  value={assignmentTitle}
                  onChange={(event) =>
                    setAssignmentTitle(
                      event.target.value
                    )
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Description</label>

            <textarea
              rows="4"
              placeholder="Add a short description about the assignment..."
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
            ></textarea>
          </div>

          <div className="upload-section">
            <div className="upload-label-row">
              <label>
                Assignment File{" "}
                <span>*</span>
              </label>

              <small>
                Maximum recommended size:
                25 MB
              </small>
            </div>

            {!selectedFile ? (
              <div
                className={`upload-zone ${
                  dragActive
                    ? "drag-active"
                    : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={
                  handleDragLeave
                }
                onDrop={handleDrop}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <div className="upload-icon">
                  <i className="bi bi-cloud-arrow-up"></i>
                </div>

                <h4>
                  Drop your assignment here
                </h4>

                <p>
                  Drag and drop your file or{" "}
                  <span>
                    click to browse
                  </span>
                </p>

                <div className="supported-files">
                  <span>PDF</span>
                  <span>DOCX</span>
                  <span>TXT</span>
                  <span>CSV</span>
                  <span>ZIP</span>
                  <span>JPG</span>
                  <span>PNG</span>
                </div>

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
              <div className="selected-file-card">
                <div className="file-left">
                  <div className="file-type-icon">
                    <i className="bi bi-file-earmark-check"></i>
                  </div>

                  <div>
                    <strong>
                      {selectedFile.name}
                    </strong>

                    <div className="file-meta">
                      <span>
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </span>

                      <span>•</span>

                      <span>
                        {selectedFile.type ||
                          "File selected"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={removeFile}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div
              className="submission-notice"
              style={{
                borderColor:
                  "rgba(255, 107, 122, 0.2)",
                background:
                  "rgba(255, 107, 122, 0.05)",
              }}
            >
              <i
                className="bi bi-exclamation-triangle"
                style={{
                  color: "#ff6b7a",
                }}
              ></i>

              <p>{errorMessage}</p>
            </div>
          )}

          {submissionResult && (
            <div
              className="submission-notice"
              style={{
                borderColor:
                  "rgba(81, 214, 160, 0.2)",
                background:
                  "rgba(81, 214, 160, 0.05)",
              }}
            >
              <i
                className="bi bi-check-circle"
                style={{
                  color: "#51d6a0",
                }}
              ></i>

              <div>
                <p>
                  <strong>
                    Assignment submitted
                    successfully.
                  </strong>
                </p>

                <p>
                  Submission ID:{" "}
                  <strong>
                    {
                      submissionResult.submission_id
                    }
                  </strong>
                </p>

                <p>
                  Student ID:{" "}
                  <strong>
                    {
                      submissionResult.student_id
                    }
                  </strong>
                </p>

                <p>
                  Subject:{" "}
                  <strong>
                    {
                      submissionResult.subject
                    }
                  </strong>
                </p>

                <p>
                  Reference CRC-32:{" "}
                  <strong>
                    {
                      submissionResult.reference_crc
                    }
                  </strong>
                </p>
              </div>
            </div>
          )}

          <div className="submission-notice">
            <i className="bi bi-info-circle"></i>

            <p>
              Student details, subject,
              description, assignment metadata,
              file information and the real
              CRC-32 reference value are now
              stored in SQLite by the FastAPI
              backend.
            </p>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={clearForm}
              disabled={isSubmitting}
            >
              Clear Form
            </button>

            <button
              type="submit"
              className="submit-assignment-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-arrow-repeat"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-arrow-up"></i>
                  Submit Assignment
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="submission-info-column">
          <div className="info-card">
            <div className="info-card-heading">
              <i className="bi bi-shield-lock"></i>

              <div>
                <h3>How It Works</h3>

                <p>
                  Assignment integrity workflow
                </p>
              </div>
            </div>

            <div className="workflow-list">
              <div className="workflow-step">
                <span>1</span>

                <div>
                  <strong>
                    Upload Assignment
                  </strong>

                  <p>
                    Student enters their
                    details and submits the
                    original assignment file.
                  </p>
                </div>
              </div>

              <div className="workflow-line"></div>

              <div className="workflow-step">
                <span>2</span>

                <div>
                  <strong>
                    Generate CRC-32
                  </strong>

                  <p>
                    FastAPI calculates the
                    real reference CRC from
                    the exact uploaded file.
                  </p>
                </div>
              </div>

              <div className="workflow-line"></div>

              <div className="workflow-step">
                <span>3</span>

                <div>
                  <strong>
                    Store Submission
                  </strong>

                  <p>
                    Student details,
                    assignment details and
                    CRC-32 are stored in
                    SQLite.
                  </p>
                </div>
              </div>

              <div className="workflow-line"></div>

              <div className="workflow-step">
                <span>4</span>

                <div>
                  <strong>
                    Verify Later
                  </strong>

                  <p>
                    Instructor compares a
                    later file against the
                    stored reference CRC.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="supported-card">
            <div className="supported-heading">
              <i className="bi bi-file-earmark-check"></i>

              <div>
                <h4>
                  Supported Files
                </h4>

                <p>
                  Common assignment formats
                </p>
              </div>
            </div>

            <div className="format-grid">
              <div>
                <i className="bi bi-file-earmark-pdf"></i>
                <span>PDF</span>
              </div>

              <div>
                <i className="bi bi-file-earmark-word"></i>
                <span>DOCX</span>
              </div>

              <div>
                <i className="bi bi-file-earmark-text"></i>
                <span>TXT</span>
              </div>

              <div>
                <i className="bi bi-file-earmark-spreadsheet"></i>
                <span>CSV</span>
              </div>

              <div>
                <i className="bi bi-file-earmark-zip"></i>
                <span>ZIP</span>
              </div>

              <div>
                <i className="bi bi-file-earmark-image"></i>
                <span>IMAGE</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default SubmitAssignment;