import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSubmissions,
  getVerifications,
} from "../services/api";

function History() {
  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const [historyRecords, setHistoryRecords] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  // --------------------------------------------------
  // FORMAT DATE
  // --------------------------------------------------

  const formatVerifiedDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return "Unknown";
    }

    const normalizedDate =
      dateValue.replace(" ", "T");

    const date = new Date(
      normalizedDate
    );

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --------------------------------------------------
  // LOAD REAL HISTORY
  // --------------------------------------------------

  const loadHistory = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [
        verificationData,
        submissionData,
      ] = await Promise.all([
        getVerifications(),
        getSubmissions(),
      ]);

      const formattedRecords =
        verificationData.map(
          (verification) => {
            const submission =
              submissionData.find(
                (item) =>
                  item.submission_id ===
                  verification.submission_id
              );

            return {
              id:
                verification.verification_id,

              submissionId:
                verification.submission_id,

              studentName:
                submission?.student_name ||
                "Unknown Student",

              studentId:
                submission?.student_id ||
                "Not available",

              subject:
                submission?.subject ||
                "Not available",

              assignment:
                submission
                  ?.assignment_title ||
                "Unknown Assignment",

              description:
                submission?.description ||
                "No description provided.",

              filename:
                verification.uploaded_filename,

              referenceCrc:
                verification.reference_crc,

              currentCrc:
                verification.current_crc,

              status:
                verification.status,

              verifiedAt:
                formatVerifiedDate(
                  verification.verified_at
                ),
            };
          }
        );

      setHistoryRecords(
        formattedRecords
      );
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Unable to load verification history."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // --------------------------------------------------
  // FILTER HISTORY
  // --------------------------------------------------

  const filteredHistory =
    useMemo(() => {
      return historyRecords.filter(
        (record) => {
          const search =
            searchTerm.toLowerCase();

          const matchesSearch =
            record.id
              .toLowerCase()
              .includes(search) ||
            record.submissionId
              .toLowerCase()
              .includes(search) ||
            record.studentName
              .toLowerCase()
              .includes(search) ||
            record.studentId
              .toLowerCase()
              .includes(search) ||
            record.subject
              .toLowerCase()
              .includes(search) ||
            record.assignment
              .toLowerCase()
              .includes(search) ||
            record.filename
              .toLowerCase()
              .includes(search);

          const matchesStatus =
            statusFilter === "All" ||
            record.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      historyRecords,
      searchTerm,
      statusFilter,
    ]);

  // --------------------------------------------------
  // COUNTS
  // --------------------------------------------------

  const matches =
    historyRecords.filter(
      (record) =>
        record.status === "Match"
    ).length;

  const mismatches =
    historyRecords.filter(
      (record) =>
        record.status ===
        "Mismatch"
    ).length;

  // --------------------------------------------------
  // STATUS CLASS
  // --------------------------------------------------

  const getStatusClass = (
    status
  ) => {
    if (status === "Match") {
      return "history-status match";
    }

    return "history-status mismatch";
  };

  return (
    <main className="history-page">
      <section className="page-heading">
        <div>
          <span className="section-label">
            VERIFICATION RECORDS
          </span>

          <h2>
            Verification History
          </h2>

          <p>
            Review real CRC-32
            integrity verification
            results stored in SQLite.
          </p>
        </div>

        <div className="history-summary-card">
          <div>
            <i className="bi bi-clock-history"></i>
          </div>

          <div>
            <strong>
              {historyRecords.length}
            </strong>

            <span>
              Total Verifications
            </span>
          </div>
        </div>
      </section>

      <section className="history-stats">
        <div className="history-stat-card">
          <div className="history-stat-icon total">
            <i className="bi bi-list-check"></i>
          </div>

          <div>
            <span>
              Total Checks
            </span>

            <strong>
              {historyRecords.length}
            </strong>
          </div>
        </div>

        <div className="history-stat-card">
          <div className="history-stat-icon success">
            <i className="bi bi-check-circle"></i>
          </div>

          <div>
            <span>
              CRC Matches
            </span>

            <strong>
              {matches}
            </strong>
          </div>
        </div>

        <div className="history-stat-card">
          <div className="history-stat-icon failed">
            <i className="bi bi-exclamation-triangle"></i>
          </div>

          <div>
            <span>
              CRC Mismatches
            </span>

            <strong>
              {mismatches}
            </strong>
          </div>
        </div>
      </section>

      <section className="history-card">
        <div className="history-toolbar">
          <div className="history-search">
            <i className="bi bi-search"></i>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search student, ID, subject, submission, assignment, or file..."
            />
          </div>

          <div className="history-filter">
            <i className="bi bi-funnel"></i>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All Results
              </option>

              <option value="Match">
                Match
              </option>

              <option value="Mismatch">
                Mismatch
              </option>
            </select>
          </div>
        </div>

        <div className="history-table-info">
          {isLoading ? (
            <span>
              Loading real verification
              history...
            </span>
          ) : (
            <span>
              Showing{" "}
              <strong>
                {
                  filteredHistory.length
                }
              </strong>{" "}
              of{" "}
              <strong>
                {
                  historyRecords.length
                }
              </strong>{" "}
              verification records
            </span>
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
                  verification history.
                </strong>
              </p>

              <p>
                {errorMessage}
              </p>

              <button
                type="button"
                className="text-btn"
                onClick={
                  loadHistory
                }
                style={{
                  marginTop: "7px",
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="history-empty">
            <div>
              <i className="bi bi-arrow-repeat"></i>
            </div>

            <h3>
              Loading History
            </h3>

            <p>
              Getting real verification
              records from FastAPI and
              SQLite...
            </p>
          </div>
        )}

        {!isLoading &&
        !errorMessage &&
        filteredHistory.length >
          0 ? (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>
                    Verification
                  </th>

                  <th>
                    Submission
                  </th>

                  <th>
                    Student
                  </th>

                  <th>
                    File
                  </th>

                  <th>
                    Reference CRC
                  </th>

                  <th>
                    Current CRC
                  </th>

                  <th>
                    Result
                  </th>

                  <th>
                    Verified At
                  </th>

                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map(
                  (record) => (
                    <tr key={record.id}>
                      <td>
                        <span className="history-id">
                          {record.id}
                        </span>
                      </td>

                      <td>
                        <span className="history-submission-id">
                          {
                            record.submissionId
                          }
                        </span>
                      </td>

                      <td>
                        <div className="history-student">
                          <div>
                            <i className="bi bi-person"></i>
                          </div>

                          <div>
                            <strong>
                              {
                                record.studentName
                              }
                            </strong>

                            <span>
                              {
                                record.studentId
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="history-file">
                          <i className="bi bi-file-earmark"></i>

                          <div>
                            <strong>
                              {
                                record.filename
                              }
                            </strong>

                            <span>
                              {
                                record.assignment
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <code>
                          {
                            record.referenceCrc
                          }
                        </code>
                      </td>

                      <td>
                        <code>
                          {
                            record.currentCrc
                          }
                        </code>
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            record.status
                          )}
                        >
                          {record.status ===
                          "Match" ? (
                            <i className="bi bi-check-circle"></i>
                          ) : (
                            <i className="bi bi-x-circle"></i>
                          )}

                          {record.status}
                        </span>
                      </td>

                      <td>
                        <span className="history-date">
                          {
                            record.verifiedAt
                          }
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="table-action-btn"
                          title="View verification details"
                          onClick={() =>
                            setSelectedRecord(
                              record
                            )
                          }
                        >
                          <i className="bi bi-eye"></i>
                        </button>
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
            <div className="history-empty">
              <div>
                <i className="bi bi-search"></i>
              </div>

              <h3>
                No verification records
                found
              </h3>

              <p>
                Run an integrity check
                from Verify Integrity or
                change your search/filter.
              </p>
            </div>
          )
        )}
      </section>

      {selectedRecord && (
        <div
          className="history-modal-overlay"
          onClick={() =>
            setSelectedRecord(null)
          }
        >
          <div
            className="history-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="history-modal-header">
              <div>
                <span className="section-label">
                  REAL VERIFICATION
                  DETAILS
                </span>

                <h3>
                  {selectedRecord.id}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(
                    null
                  )
                }
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="history-modal-status">
              <span
                className={getStatusClass(
                  selectedRecord.status
                )}
              >
                {selectedRecord.status ===
                "Match" ? (
                  <i className="bi bi-check-circle"></i>
                ) : (
                  <i className="bi bi-x-circle"></i>
                )}

                CRC{" "}
                {
                  selectedRecord.status
                }
              </span>
            </div>

            <div className="history-modal-grid">
              <div>
                <span>
                  Submission ID
                </span>

                <strong>
                  {
                    selectedRecord.submissionId
                  }
                </strong>
              </div>

              <div>
                <span>
                  Student
                </span>

                <strong>
                  {
                    selectedRecord.studentName
                  }
                </strong>
              </div>

              <div>
                <span>
                  Student ID
                </span>

                <strong>
                  {
                    selectedRecord.studentId
                  }
                </strong>
              </div>

              <div>
                <span>
                  Subject
                </span>

                <strong>
                  {
                    selectedRecord.subject
                  }
                </strong>
              </div>

              <div>
                <span>
                  Assignment
                </span>

                <strong>
                  {
                    selectedRecord.assignment
                  }
                </strong>
              </div>

              <div>
                <span>
                  Filename
                </span>

                <strong>
                  {
                    selectedRecord.filename
                  }
                </strong>
              </div>

              <div>
                <span>
                  Verified At
                </span>

                <strong>
                  {
                    selectedRecord.verifiedAt
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
                  selectedRecord.description
                }
              </p>
            </div>

            <div className="history-crc-section">
              <div>
                <span>
                  Reference CRC-32
                </span>

                <strong>
                  {
                    selectedRecord.referenceCrc
                  }
                </strong>
              </div>

              <div className="history-crc-symbol">
                {selectedRecord.status ===
                "Match" ? (
                  <i className="bi bi-check-lg"></i>
                ) : (
                  <i className="bi bi-x-lg"></i>
                )}
              </div>

              <div>
                <span>
                  Current CRC-32
                </span>

                <strong>
                  {
                    selectedRecord.currentCrc
                  }
                </strong>
              </div>
            </div>

            <div
              className={`history-result-message ${
                selectedRecord.status ===
                "Match"
                  ? "success"
                  : "failed"
              }`}
            >
              {selectedRecord.status ===
              "Match" ? (
                <i className="bi bi-shield-check"></i>
              ) : (
                <i className="bi bi-shield-exclamation"></i>
              )}

              <div>
                <strong>
                  {selectedRecord.status ===
                  "Match"
                    ? "Integrity Verified"
                    : "Integrity Issue Detected"}
                </strong>

                <p>
                  {selectedRecord.status ===
                  "Match"
                    ? "The received file CRC-32 matched the stored reference CRC-32."
                    : "The received file CRC-32 did not match the stored reference CRC-32."}
                </p>
              </div>
            </div>

            <div className="history-demo-notice">
              <i className="bi bi-database-check"></i>

              <p>
                This verification record
                is loaded from SQLite and
                linked to its real
                submission details,
                including Student ID,
                Subject and Description.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default History;