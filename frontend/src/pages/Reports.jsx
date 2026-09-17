import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSubmissions,
  getVerifications,
} from "../services/api";

function Reports() {
  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [reportType, setReportType] =
    useState("All");

  const [reportRecords, setReportRecords] =
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
  // LOAD REAL REPORT DATA
  // --------------------------------------------------

  const loadReports = async () => {
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
              verificationId:
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

      setReportRecords(
        formattedRecords
      );
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Unable to load report data."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // --------------------------------------------------
  // SUMMARY VALUES
  // --------------------------------------------------

  const matches =
    reportRecords.filter(
      (record) =>
        record.status === "Match"
    ).length;

  const mismatches =
    reportRecords.filter(
      (record) =>
        record.status ===
        "Mismatch"
    ).length;

  const successRate =
    reportRecords.length > 0
      ? Math.round(
          (matches /
            reportRecords.length) *
            100
        )
      : 0;

  // --------------------------------------------------
  // FILTERING
  // --------------------------------------------------

  const filteredRecords =
    useMemo(() => {
      return reportRecords.filter(
        (record) => {
          const search =
            searchTerm.toLowerCase();

          const matchesSearch =
            record.verificationId
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
            record.description
              .toLowerCase()
              .includes(search) ||
            record.filename
              .toLowerCase()
              .includes(search);

          const matchesStatus =
            statusFilter === "All" ||
            record.status ===
              statusFilter;

          const matchesReportType =
            reportType === "All" ||
            record.status ===
              reportType;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesReportType
          );
        }
      );
    }, [
      reportRecords,
      searchTerm,
      statusFilter,
      reportType,
    ]);

  // --------------------------------------------------
  // CSV ESCAPE
  // --------------------------------------------------

  const escapeCsvValue = (
    value
  ) => {
    const stringValue = String(
      value ?? ""
    );

    return `"${stringValue.replace(
      /"/g,
      '""'
    )}"`;
  };

  // --------------------------------------------------
  // REAL CSV EXPORT
  // --------------------------------------------------

  const downloadCsvReport = () => {
    if (
      filteredRecords.length === 0
    ) {
      alert(
        "No report records are available to export."
      );

      return;
    }

    const headers = [
      "Verification ID",
      "Submission ID",
      "Student Name",
      "Student ID",
      "Subject",
      "Assignment",
      "Description",
      "Filename",
      "Reference CRC-32",
      "Current CRC-32",
      "Result",
      "Verified At",
    ];

    const rows =
      filteredRecords.map(
        (record) => [
          record.verificationId,
          record.submissionId,
          record.studentName,
          record.studentId,
          record.subject,
          record.assignment,
          record.description,
          record.filename,
          record.referenceCrc,
          record.currentCrc,
          record.status,
          record.verifiedAt,
        ]
      );

    const csvContent = [
      headers
        .map(escapeCsvValue)
        .join(","),

      ...rows.map((row) =>
        row
          .map(escapeCsvValue)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "IntegrityCheck_Verification_Report.csv";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  };

  return (
    <main className="reports-page">
      <section className="page-heading">
        <div>
          <span className="section-label">
            CRC-32 REPORTING
          </span>

          <h2>Reports</h2>

          <p>
            Review and export real
            assignment integrity
            verification records.
          </p>
        </div>

        <button
          type="button"
          className="report-export-btn"
          onClick={downloadCsvReport}
          disabled={
            isLoading ||
            filteredRecords.length === 0
          }
        >
          <i className="bi bi-download"></i>
          Export CSV
        </button>
      </section>

      <section className="report-stats-grid">
        <div className="report-stat-card">
          <div className="report-stat-icon total">
            <i className="bi bi-file-earmark-text"></i>
          </div>

          <div>
            <span>
              Total Verifications
            </span>

            <strong>
              {reportRecords.length}
            </strong>

            <p>
              Recorded integrity checks
            </p>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon success">
            <i className="bi bi-check-circle"></i>
          </div>

          <div>
            <span>
              CRC Matches
            </span>

            <strong>
              {matches}
            </strong>

            <p>
              Files passed integrity
              check
            </p>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon failed">
            <i className="bi bi-exclamation-triangle"></i>
          </div>

          <div>
            <span>
              CRC Mismatches
            </span>

            <strong>
              {mismatches}
            </strong>

            <p>
              Integrity issues detected
            </p>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon rate">
            <i className="bi bi-bar-chart"></i>
          </div>

          <div>
            <span>
              Verification Rate
            </span>

            <strong>
              {successRate}%
            </strong>

            <p>
              Successful CRC comparisons
            </p>
          </div>
        </div>
      </section>

      <section className="report-controls-card">
        <div className="report-control-heading">
          <div>
            <i className="bi bi-sliders"></i>
          </div>

          <div>
            <h3>
              Report Configuration
            </h3>

            <p>
              Choose which real
              verification records
              should appear in the
              report.
            </p>
          </div>
        </div>

        <div className="report-controls-grid">
          <div className="report-control-group">
            <label>
              Report Type
            </label>

            <div className="report-select-wrapper">
              <i className="bi bi-file-earmark-bar-graph"></i>

              <select
                value={reportType}
                onChange={(event) =>
                  setReportType(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  Complete Report
                </option>

                <option value="Match">
                  Verified Files Only
                </option>

                <option value="Mismatch">
                  Integrity Issues Only
                </option>
              </select>
            </div>
          </div>

          <div className="report-control-group">
            <label>
              Result Filter
            </label>

            <div className="report-select-wrapper">
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

          <div className="report-control-group report-search-group">
            <label>
              Search Records
            </label>

            <div className="report-search-wrapper">
              <i className="bi bi-search"></i>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search student, ID, subject, file, assignment..."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="report-preview-card">
        <div className="report-preview-header">
          <div>
            <span className="section-label">
              REPORT PREVIEW
            </span>

            <h3>
              Verification Records
            </h3>

            <p>
              {isLoading
                ? "Loading real verification data..."
                : `Showing ${filteredRecords.length} of ${reportRecords.length} records`}
            </p>
          </div>

          <div className="report-format-badge">
            <i className="bi bi-filetype-csv"></i>
            Real CSV Data
          </div>
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
                  Unable to load reports.
                </strong>
              </p>

              <p>
                {errorMessage}
              </p>

              <button
                type="button"
                className="text-btn"
                onClick={loadReports}
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
          <div className="report-empty">
            <div>
              <i className="bi bi-arrow-repeat"></i>
            </div>

            <h3>
              Loading Reports
            </h3>

            <p>
              Getting real verification
              data from FastAPI and
              SQLite...
            </p>
          </div>
        )}

        {!isLoading &&
        !errorMessage &&
        filteredRecords.length >
          0 ? (
          <div className="report-table-wrapper">
            <table className="report-table">
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
                    Student ID
                  </th>

                  <th>
                    Subject
                  </th>

                  <th>
                    Assignment
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
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map(
                  (record) => (
                    <tr
                      key={
                        record.verificationId
                      }
                    >
                      <td>
                        <span className="report-id">
                          {
                            record.verificationId
                          }
                        </span>
                      </td>

                      <td>
                        <span className="report-submission-id">
                          {
                            record.submissionId
                          }
                        </span>
                      </td>

                      <td>
                        <div className="report-student">
                          <div>
                            <i className="bi bi-person"></i>
                          </div>

                          <strong>
                            {
                              record.studentName
                            }
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span className="report-text">
                          {
                            record.studentId
                          }
                        </span>
                      </td>

                      <td>
                        <span className="report-text">
                          {
                            record.subject
                          }
                        </span>
                      </td>

                      <td>
                        <span className="report-text">
                          {
                            record.assignment
                          }
                        </span>
                      </td>

                      <td>
                        <div className="report-file">
                          <i className="bi bi-file-earmark"></i>

                          <span>
                            {
                              record.filename
                            }
                          </span>
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
                          className={`report-status ${
                            record.status ===
                            "Match"
                              ? "match"
                              : "mismatch"
                          }`}
                        >
                          {record.status ===
                          "Match" ? (
                            <i className="bi bi-check-circle"></i>
                          ) : (
                            <i className="bi bi-x-circle"></i>
                          )}

                          {
                            record.status
                          }
                        </span>
                      </td>

                      <td>
                        <span className="report-date">
                          {
                            record.verifiedAt
                          }
                        </span>
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
            <div className="report-empty">
              <div>
                <i className="bi bi-file-earmark-x"></i>
              </div>

              <h3>
                No report records
              </h3>

              <p>
                Change your report
                filters or search terms.
              </p>
            </div>
          )
        )}

        <div className="report-footer">
          <div className="report-footer-info">
            <i className="bi bi-database-check"></i>

            <p>
              Reports now combine real
              verification records with
              their linked submission
              details, including Student
              ID, Subject and Description.
              The CSV export contains the
              currently filtered real
              records.
            </p>
          </div>

          <button
            type="button"
            className="report-download-secondary"
            onClick={
              downloadCsvReport
            }
            disabled={
              isLoading ||
              filteredRecords.length ===
                0
            }
          >
            <i className="bi bi-filetype-csv"></i>
            Download Report
          </button>
        </div>
      </section>
    </main>
  );
}

export default Reports;