import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { renderAsync } from "docx-preview";

import {
  getSubmissionDownloadUrl,
  getSubmissionFileUrl,
  getSubmissions,
  getVerifications,
} from "../services/api";

function Submissions() {
  const [submissions, setSubmissions] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [subjectFilter, setSubjectFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [
    selectedSubmission,
    setSelectedSubmission,
  ] = useState(null);

  const [
    previewSubmission,
    setPreviewSubmission,
  ] = useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isDocxLoading,
    setIsDocxLoading,
  ] = useState(false);

  const [
    docxPreviewError,
    setDocxPreviewError,
  ] = useState("");

  const docxPreviewRef =
    useRef(null);

  // --------------------------------------------------
  // FORMAT FILE SIZE
  // --------------------------------------------------

  const formatFileSize = (
    bytes
  ) => {
    if (
      bytes === null ||
      bytes === undefined
    ) {
      return "Unknown";
    }

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
  // FORMAT DATE
  // --------------------------------------------------

  const formatSubmittedDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return "Unknown";
    }

    const normalizedDate =
      dateValue.replace(
        " ",
        "T"
      );

    const date = new Date(
      normalizedDate
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateValue;
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // --------------------------------------------------
  // GET FILE TYPE
  // --------------------------------------------------

  const getFileType = (
    filename
  ) => {
    if (!filename) {
      return "FILE";
    }

    const parts =
      filename.split(".");

    if (parts.length < 2) {
      return "FILE";
    }

    return parts[
      parts.length - 1
    ].toUpperCase();
  };

  // --------------------------------------------------
  // GET STATUS
  // --------------------------------------------------

  const getSubmissionStatus = (
    submissionId,
    verifications
  ) => {
    const records =
      verifications.filter(
        (verification) =>
          verification.submission_id ===
          submissionId
      );

    if (records.length === 0) {
      return "Pending";
    }

    const latest =
      records[0];

    if (
      latest.status === "Match"
    ) {
      return "Verified";
    }

    return "Integrity Issue";
  };

  // --------------------------------------------------
  // LOAD SUBMISSIONS
  // --------------------------------------------------

  const loadSubmissions = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [
        submissionData,
        verificationData,
      ] = await Promise.all([
        getSubmissions(),
        getVerifications(),
      ]);

      const formattedData =
        submissionData.map(
          (submission) => ({
            id:
              submission.submission_id,

            studentName:
              submission.student_name,

            studentId:
              submission.student_id ||
              "Not available",

            subject:
              submission.subject ||
              "Not available",

            assignment:
              submission.assignment_title,

            description:
              submission.description ||
              "No description provided.",

            filename:
              submission.filename,

            fileSize:
              formatFileSize(
                submission.file_size
              ),

            submittedAt:
              formatSubmittedDate(
                submission.submitted_at
              ),

            status:
              getSubmissionStatus(
                submission.submission_id,
                verificationData
              ),

            crc:
              submission.reference_crc,

            type:
              getFileType(
                submission.filename
              ),
          })
        );

      setSubmissions(
        formattedData
      );
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
  // DOCX PREVIEW
  // --------------------------------------------------

  useEffect(() => {
    const renderDocx =
      async () => {
        if (
          !previewSubmission ||
          previewSubmission.type !==
            "DOCX" ||
          !docxPreviewRef.current
        ) {
          return;
        }

        setIsDocxLoading(true);
        setDocxPreviewError("");

        docxPreviewRef.current.innerHTML =
          "";

        try {
          const response =
            await fetch(
              getSubmissionFileUrl(
                previewSubmission.id
              )
            );

          if (!response.ok) {
            throw new Error(
              "Unable to load the DOCX file."
            );
          }

          const arrayBuffer =
            await response.arrayBuffer();

          await renderAsync(
            arrayBuffer,
            docxPreviewRef.current,
            null,
            {
              className:
                "docx-preview-content",

              inWrapper: true,

              ignoreWidth: false,

              ignoreHeight: false,

              ignoreFonts: false,

              breakPages: true,

              useBase64URL: true,
            }
          );
        } catch (error) {
          setDocxPreviewError(
            error.message ||
              "DOCX preview could not be generated."
          );
        } finally {
          setIsDocxLoading(false);
        }
      };

    renderDocx();
  }, [previewSubmission]);

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredSubmissions =
    useMemo(() => {
      return submissions.filter(
        (submission) => {
          const search =
            searchTerm.toLowerCase();

          const matchesSearch =
            submission.studentName
              .toLowerCase()
              .includes(search) ||
            submission.studentId
              .toLowerCase()
              .includes(search) ||
            submission.subject
              .toLowerCase()
              .includes(search) ||
            submission.assignment
              .toLowerCase()
              .includes(search) ||
            submission.filename
              .toLowerCase()
              .includes(search) ||
            submission.id
              .toLowerCase()
              .includes(search);

          const matchesSubject =
            subjectFilter ===
              "All" ||
            submission.subject ===
              subjectFilter;

          const matchesStatus =
            statusFilter ===
              "All" ||
            submission.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesSubject &&
            matchesStatus
          );
        }
      );
    }, [
      submissions,
      searchTerm,
      subjectFilter,
      statusFilter,
    ]);

  // --------------------------------------------------
  // STATUS CLASS
  // --------------------------------------------------

  const getStatusClass = (
    status
  ) => {
    if (
      status === "Verified"
    ) {
      return "status-badge verified-status";
    }

    if (
      status === "Pending"
    ) {
      return "status-badge pending-status";
    }

    return "status-badge issue-status";
  };

  // --------------------------------------------------
  // FILE ICON
  // --------------------------------------------------

  const getFileIcon = (
    type
  ) => {
    switch (type) {
      case "PDF":
        return "bi-file-earmark-pdf";

      case "DOC":
      case "DOCX":
        return "bi-file-earmark-word";

      case "TXT":
        return "bi-file-earmark-text";

      case "CSV":
        return "bi-file-earmark-spreadsheet";

      case "ZIP":
        return "bi-file-earmark-zip";

      case "JPG":
      case "JPEG":
      case "PNG":
        return "bi-file-earmark-image";

      default:
        return "bi-file-earmark";
    }
  };

  // --------------------------------------------------
  // PREVIEW
  // --------------------------------------------------

  const canBrowserPreview = (
    type
  ) => {
    return [
      "PDF",
      "TXT",
      "CSV",
      "JPG",
      "JPEG",
      "PNG",
    ].includes(type);
  };

  const isImageFile = (
    type
  ) => {
    return [
      "JPG",
      "JPEG",
      "PNG",
    ].includes(type);
  };

  const openPreview = (
    submission
  ) => {
    setDocxPreviewError("");
    setPreviewSubmission(
      submission
    );
  };

  const closePreview = () => {
    setPreviewSubmission(null);
    setDocxPreviewError("");

    if (
      docxPreviewRef.current
    ) {
      docxPreviewRef.current.innerHTML =
        "";
    }
  };

  const openInNewTab = (
    submission
  ) => {
    window.open(
      getSubmissionFileUrl(
        submission.id
      ),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const downloadFile = (
    submission
  ) => {
    const link =
      document.createElement(
        "a"
      );

    link.href =
      getSubmissionDownloadUrl(
        submission.id
      );

    link.download =
      submission.filename;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  };

  // --------------------------------------------------
  // COUNTS
  // --------------------------------------------------

  const verifiedCount =
    submissions.filter(
      (item) =>
        item.status ===
        "Verified"
    ).length;

  const pendingCount =
    submissions.filter(
      (item) =>
        item.status ===
        "Pending"
    ).length;

  const issueCount =
    submissions.filter(
      (item) =>
        item.status ===
        "Integrity Issue"
    ).length;

  return (
    <main className="submissions-page">
      <section className="page-heading">
        <div>
          <span className="section-label">
            ASSIGNMENT RECORDS
          </span>

          <h2>
            Submissions
          </h2>

          <p>
            Search, review, preview,
            and monitor real student
            assignment submissions
            stored in SQLite.
          </p>
        </div>

        <div className="submission-count-card">
          <div>
            <i className="bi bi-files"></i>
          </div>

          <div>
            <strong>
              {
                submissions.length
              }
            </strong>

            <span>
              Real Records
            </span>
          </div>
        </div>
      </section>

      <section className="submission-stats-mini">
        <div>
          <span>Total</span>
          <strong>
            {submissions.length}
          </strong>
        </div>

        <div>
          <span>Verified</span>
          <strong>
            {verifiedCount}
          </strong>
        </div>

        <div>
          <span>Pending</span>
          <strong>
            {pendingCount}
          </strong>
        </div>

        <div>
          <span>
            Integrity Issues
          </span>
          <strong>
            {issueCount}
          </strong>
        </div>
      </section>

      <section className="submissions-card">
        <div className="submissions-toolbar">
          <div className="submission-search">
            <i className="bi bi-search"></i>

            <input
              type="text"
              placeholder="Search student, ID, subject, filename, submission ID, or assignment..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />
          </div>

          <div className="submission-filters">
            <div className="filter-control">
              <i className="bi bi-book"></i>

              <select
                value={
                  subjectFilter
                }
                onChange={(event) =>
                  setSubjectFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  All Subjects
                </option>

                <option value="Computer Networks">
                  Computer Networks
                </option>

                <option value="Operating Systems">
                  Operating Systems
                </option>

                <option value="Web Technologies">
                  Web Technologies
                </option>

                <option value="Information Management Systems">
                  Information Management Systems
                </option>

                <option value="Cloud Computing">
                  Cloud Computing
                </option>
              </select>
            </div>

            <div className="filter-control">
              <i className="bi bi-funnel"></i>

              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  All Status
                </option>

                <option value="Pending">
                  Pending
                </option>

                <option value="Verified">
                  Verified
                </option>

                <option value="Integrity Issue">
                  Integrity Issue
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-info-row">
          {isLoading ? (
            <p>
              Loading real submissions
              from backend...
            </p>
          ) : (
            <p>
              Showing{" "}
              <strong>
                {
                  filteredSubmissions.length
                }
              </strong>{" "}
              of{" "}
              <strong>
                {
                  submissions.length
                }
              </strong>{" "}
              real submissions
            </p>
          )}
        </div>

        {errorMessage && (
          <div
            className="submission-notice"
            style={{
              margin: "18px",
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

            <div>
              <p>
                <strong>
                  Unable to load
                  submissions.
                </strong>
              </p>

              <p>
                {errorMessage}
              </p>

              <button
                type="button"
                className="text-btn"
                onClick={
                  loadSubmissions
                }
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!isLoading &&
        !errorMessage &&
        filteredSubmissions.length >
          0 ? (
          <div className="submission-table-wrapper">
            <table className="submission-table">
              <thead>
                <tr>
                  <th>Submission</th>
                  <th>Student</th>
                  <th>Assignment</th>
                  <th>File</th>
                  <th>CRC-32</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredSubmissions.map(
                  (submission) => (
                    <tr
                      key={
                        submission.id
                      }
                    >
                      <td>
                        <span className="submission-id">
                          {submission.id}
                        </span>
                      </td>

                      <td>
                        <div className="student-table-info">
                          <div className="student-mini-avatar">
                            <i className="bi bi-person"></i>
                          </div>

                          <div>
                            <strong>
                              {
                                submission.studentName
                              }
                            </strong>

                            <span>
                              {
                                submission.studentId
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="assignment-table-info">
                          <strong>
                            {
                              submission.assignment
                            }
                          </strong>

                          <span>
                            {
                              submission.subject
                            }
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="file-table-info">
                          <div className="table-file-icon">
                            <i
                              className={`bi ${getFileIcon(
                                submission.type
                              )}`}
                            ></i>
                          </div>

                          <div>
                            <strong>
                              {
                                submission.filename
                              }
                            </strong>

                            <span>
                              {
                                submission.fileSize
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <code className="crc-value">
                          {
                            submission.crc
                          }
                        </code>
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            submission.status
                          )}
                        >
                          {submission.status ===
                            "Verified" && (
                            <i className="bi bi-check-circle"></i>
                          )}

                          {submission.status ===
                            "Pending" && (
                            <i className="bi bi-hourglass-split"></i>
                          )}

                          {submission.status ===
                            "Integrity Issue" && (
                            <i className="bi bi-exclamation-triangle"></i>
                          )}

                          {submission.status}
                        </span>
                      </td>

                      <td>
                        <span className="submitted-time">
                          {
                            submission.submittedAt
                          }
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                          }}
                        >
                          <button
                            type="button"
                            className="table-action-btn"
                            title="View submission details"
                            onClick={() =>
                              setSelectedSubmission(
                                submission
                              )
                            }
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          <button
                            type="button"
                            className="table-action-btn"
                            title="Preview assignment"
                            onClick={() =>
                              openPreview(
                                submission
                              )
                            }
                          >
                            <i className="bi bi-file-earmark-richtext"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          !isLoading &&
          !errorMessage && (
            <div className="submission-empty-state">
              <div>
                <i className="bi bi-search"></i>
              </div>

              <h3>
                No submissions found
              </h3>

              <p>
                Submit an assignment or
                change your search
                filters.
              </p>
            </div>
          )
        )}

        {isLoading && (
          <div className="submission-empty-state">
            <div>
              <i className="bi bi-arrow-repeat"></i>
            </div>

            <h3>
              Loading Submissions
            </h3>

            <p>
              Getting real records from
              FastAPI and SQLite...
            </p>
          </div>
        )}
      </section>

      {selectedSubmission && (
        <div
          className="submission-modal-overlay"
          onClick={() =>
            setSelectedSubmission(
              null
            )
          }
        >
          <div
            className="submission-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="section-label">
                  REAL SUBMISSION DETAILS
                </span>

                <h3>
                  {
                    selectedSubmission.id
                  }
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() =>
                  setSelectedSubmission(
                    null
                  )
                }
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-status-section">
              <span
                className={getStatusClass(
                  selectedSubmission.status
                )}
              >
                {selectedSubmission.status ===
                  "Verified" && (
                  <i className="bi bi-check-circle"></i>
                )}

                {selectedSubmission.status ===
                  "Pending" && (
                  <i className="bi bi-hourglass-split"></i>
                )}

                {selectedSubmission.status ===
                  "Integrity Issue" && (
                  <i className="bi bi-exclamation-triangle"></i>
                )}

                {
                  selectedSubmission.status
                }
              </span>
            </div>

            <div className="modal-details-grid">
              <div>
                <span>Student Name</span>
                <strong>
                  {
                    selectedSubmission.studentName
                  }
                </strong>
              </div>

              <div>
                <span>Student ID</span>
                <strong>
                  {
                    selectedSubmission.studentId
                  }
                </strong>
              </div>

              <div>
                <span>Subject</span>
                <strong>
                  {
                    selectedSubmission.subject
                  }
                </strong>
              </div>

              <div>
                <span>Assignment</span>
                <strong>
                  {
                    selectedSubmission.assignment
                  }
                </strong>
              </div>

              <div>
                <span>Filename</span>
                <strong>
                  {
                    selectedSubmission.filename
                  }
                </strong>
              </div>

              <div>
                <span>File Size</span>
                <strong>
                  {
                    selectedSubmission.fileSize
                  }
                </strong>
              </div>

              <div>
                <span>File Type</span>
                <strong>
                  {
                    selectedSubmission.type
                  }
                </strong>
              </div>

              <div>
                <span>Submitted</span>
                <strong>
                  {
                    selectedSubmission.submittedAt
                  }
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop: "14px",
                padding: "15px",
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
                  marginBottom: "6px",
                }}
              >
                Description
              </span>

              <p
                style={{
                  margin: 0,
                  fontSize: "10px",
                  lineHeight: 1.6,
                }}
              >
                {
                  selectedSubmission.description
                }
              </p>
            </div>

            <div
              style={{
                marginTop: "14px",
                padding: "15px",
                borderRadius: "11px",
                border:
                  "1px solid var(--border)",
                background:
                  "var(--bg-secondary)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                }}
              >
                <div className="table-file-icon">
                  <i
                    className={`bi ${getFileIcon(
                      selectedSubmission.type
                    )}`}
                  ></i>
                </div>

                <strong>
                  {
                    selectedSubmission.filename
                  }
                </strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "8px",
                  marginTop: "13px",
                }}
              >
                <button
                  type="button"
                  className="verify-btn"
                  onClick={() =>
                    openPreview(
                      selectedSubmission
                    )
                  }
                >
                  <i className="bi bi-eye"></i>
                  Preview Assignment
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    downloadFile(
                      selectedSubmission
                    )
                  }
                >
                  <i className="bi bi-download"></i>
                  Download
                </button>
              </div>
            </div>

            <div className="modal-crc-card">
              <div>
                <i className="bi bi-shield-check"></i>
              </div>

              <div>
                <span>
                  Real Reference CRC-32
                </span>

                <strong>
                  {
                    selectedSubmission.crc
                  }
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewSubmission && (
        <div
          className="submission-modal-overlay"
          onClick={closePreview}
          style={{
            zIndex: 1200,
          }}
        >
          <div
            className="submission-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width:
                "min(1050px, 95vw)",
              maxWidth: "1050px",
              maxHeight: "94vh",
              overflowY: "auto",
            }}
          >
            <div className="modal-header">
              <div>
                <span className="section-label">
                  ASSIGNMENT PREVIEW
                </span>

                <h3>
                  {
                    previewSubmission.filename
                  }
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closePreview}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              {[
                [
                  "Submission ID",
                  previewSubmission.id,
                ],
                [
                  "File Type",
                  previewSubmission.type,
                ],
                [
                  "File Size",
                  previewSubmission.fileSize,
                ],
                [
                  "CRC-32",
                  previewSubmission.crc,
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    style={{
                      padding: "12px",
                      borderRadius:
                        "10px",
                      border:
                        "1px solid var(--border)",
                      background:
                        "var(--bg-secondary)",
                    }}
                  >
                    <span
                      style={{
                        display:
                          "block",
                        color:
                          "var(--text-muted)",
                        fontSize:
                          "8px",
                        marginBottom:
                          "4px",
                      }}
                    >
                      {label}
                    </span>

                    <strong
                      style={{
                        fontSize:
                          "10px",
                      }}
                    >
                      {value}
                    </strong>
                  </div>
                )
              )}
            </div>

            {previewSubmission.type ===
            "DOCX" ? (
              <div
                style={{
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "12px",
                  background:
                    "#e5e7eb",
                  minHeight:
                    "550px",
                  maxHeight:
                    "68vh",
                  overflow: "auto",
                  padding:
                    "20px",
                }}
              >
                {isDocxLoading && (
                  <div
                    style={{
                      minHeight:
                        "500px",
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      color:
                        "#334155",
                    }}
                  >
                    <i
                      className="bi bi-arrow-repeat"
                      style={{
                        fontSize:
                          "28px",
                      }}
                    ></i>

                    <strong
                      style={{
                        marginTop:
                          "10px",
                      }}
                    >
                      Loading Word
                      Preview...
                    </strong>

                    <span
                      style={{
                        marginTop:
                          "5px",
                      }}
                    >
                      Rendering the DOCX
                      document locally.
                    </span>
                  </div>
                )}

                {docxPreviewError && (
                  <div
                    style={{
                      minHeight:
                        "500px",
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      textAlign:
                        "center",
                      color:
                        "#334155",
                    }}
                  >
                    <i
                      className="bi bi-exclamation-triangle"
                      style={{
                        fontSize:
                          "28px",
                      }}
                    ></i>

                    <strong
                      style={{
                        marginTop:
                          "10px",
                      }}
                    >
                      DOCX Preview Failed
                    </strong>

                    <p>
                      {
                        docxPreviewError
                      }
                    </p>
                  </div>
                )}

                <div
                  ref={docxPreviewRef}
                  style={{
                    display:
                      isDocxLoading ||
                      docxPreviewError
                        ? "none"
                        : "block",
                  }}
                ></div>
              </div>
            ) : canBrowserPreview(
                previewSubmission.type
              ) ? (
              <div
                style={{
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "12px",
                  overflow: "hidden",
                  minHeight:
                    "500px",
                  background:
                    "var(--bg-secondary)",
                }}
              >
                {isImageFile(
                  previewSubmission.type
                ) ? (
                  <div
                    style={{
                      minHeight:
                        "500px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      padding:
                        "18px",
                    }}
                  >
                    <img
                      src={getSubmissionFileUrl(
                        previewSubmission.id
                      )}
                      alt={
                        previewSubmission.filename
                      }
                      style={{
                        maxWidth:
                          "100%",
                        maxHeight:
                          "70vh",
                        objectFit:
                          "contain",
                      }}
                    />
                  </div>
                ) : (
                  <iframe
                    src={getSubmissionFileUrl(
                      previewSubmission.id
                    )}
                    title={
                      previewSubmission.filename
                    }
                    style={{
                      width: "100%",
                      height:
                        "65vh",
                      minHeight:
                        "500px",
                      border: 0,
                      background:
                        "#ffffff",
                    }}
                  ></iframe>
                )}
              </div>
            ) : (
              <div
                className="submission-empty-state"
                style={{
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "12px",
                  padding:
                    "40px 20px",
                }}
              >
                <div>
                  <i
                    className={`bi ${getFileIcon(
                      previewSubmission.type
                    )}`}
                  ></i>
                </div>

                <h3>
                  Browser Preview Not
                  Available
                </h3>

                <p>
                  {previewSubmission.type ===
                  "DOC"
                    ? "Legacy DOC files cannot be rendered by the DOCX preview engine. Download the original file and open it in Microsoft Word."
                    : previewSubmission.type ===
                      "ZIP"
                    ? "ZIP archives cannot be previewed directly. Download the archive to inspect its contents."
                    : "This file type cannot be previewed directly."}
                </p>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "14px",
              }}
            >
              {canBrowserPreview(
                previewSubmission.type
              ) && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    openInNewTab(
                      previewSubmission
                    )
                  }
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                  Open in New Tab
                </button>
              )}

              <button
                type="button"
                className="verify-btn"
                onClick={() =>
                  downloadFile(
                    previewSubmission
                  )
                }
              >
                <i className="bi bi-download"></i>
                Download Original
              </button>
            </div>

            <div
              className="modal-notice"
              style={{
                marginTop: "14px",
              }}
            >
              <i className="bi bi-shield-check"></i>

              <p>
                DOCX preview is rendered
                locally inside the
                IntegrityCheck frontend.
                The assignment is not
                uploaded to an external
                document-viewing service.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Submissions;