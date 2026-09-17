import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getSubmissions,
  getVerifications,
} from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError("");

        const [
          submissionData,
          verificationData,
        ] = await Promise.all([
          getSubmissions(),
          getVerifications(),
        ]);

        setSubmissions(
          Array.isArray(submissionData)
            ? submissionData
            : []
        );

        setVerifications(
          Array.isArray(verificationData)
            ? verificationData
            : []
        );
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        setError(
          "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const latestVerificationMap =
    useMemo(() => {
      const map = new Map();

      verifications.forEach(
        (verification) => {
          if (
            !map.has(
              verification.submission_id
            )
          ) {
            map.set(
              verification.submission_id,
              verification
            );
          }
        }
      );

      return map;
    }, [verifications]);

  function getSubmissionStatus(
    submission
  ) {
    const latestVerification =
      latestVerificationMap.get(
        submission.submission_id
      );

    if (!latestVerification) {
      return "Pending";
    }

    if (
      latestVerification.status ===
      "Match"
    ) {
      return "Verified";
    }

    if (
      latestVerification.status ===
      "Mismatch"
    ) {
      return "Integrity Issue";
    }

    return "Pending";
  }

  const dashboardStats =
    useMemo(() => {
      let verified = 0;
      let integrityIssues = 0;
      let pending = 0;

      submissions.forEach(
        (submission) => {
          const status =
            getSubmissionStatus(
              submission
            );

          if (status === "Verified") {
            verified += 1;
          } else if (
            status ===
            "Integrity Issue"
          ) {
            integrityIssues += 1;
          } else {
            pending += 1;
          }
        }
      );

      return {
        total: submissions.length,
        verified,
        integrityIssues,
        pending,
      };
    }, [
      submissions,
      latestVerificationMap,
    ]);

  const recentSubmissions =
    useMemo(() => {
      return [...submissions]
        .sort((a, b) => {
          const aDate = new Date(
            a.submitted_at || 0
          );

          const bDate = new Date(
            b.submitted_at || 0
          );

          return bDate - aDate;
        })
        .slice(0, 5);
    }, [submissions]);

  function getStatusColor(status) {
    if (status === "Verified") {
      return "#22c55e";
    }

    if (
      status === "Integrity Issue"
    ) {
      return "#ef4444";
    }

    return "#f59e0b";
  }

  return (
    <main className="dashboard">
      <section className="welcome-section">
        <div>
          <span className="section-label">
            SYSTEM OVERVIEW
          </span>

          <h2>
            Assignment Integrity
            Dashboard
          </h2>

          <p>
            Monitor assignment
            submissions and verify file
            integrity using CRC-32 error
            detection.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() =>
            navigate("/submit")
          }
        >
          <i className="bi bi-cloud-arrow-up"></i>
          New Submission
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="bi bi-files"></i>
          </div>

          <div>
            <span>
              Total Submissions
            </span>

            <h3>
              {loading
                ? "..."
                : dashboardStats.total}
            </h3>

            <p>
              {dashboardStats.total ===
              0
                ? "No submissions yet"
                : "Registered assignments"}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon verified">
            <i className="bi bi-check-circle"></i>
          </div>

          <div>
            <span>Verified</span>

            <h3>
              {loading
                ? "..."
                : dashboardStats.verified}
            </h3>

            <p>
              Integrity confirmed
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon corrupted">
            <i className="bi bi-exclamation-triangle"></i>
          </div>

          <div>
            <span>
              Integrity Issues
            </span>

            <h3>
              {loading
                ? "..."
                : dashboardStats.integrityIssues}
            </h3>

            <p>
              {dashboardStats.integrityIssues ===
              0
                ? "No corruption detected"
                : "Mismatch detected"}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <i className="bi bi-hourglass-split"></i>
          </div>

          <div>
            <span>Pending</span>

            <h3>
              {loading
                ? "..."
                : dashboardStats.pending}
            </h3>

            <p>
              Waiting for verification
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">
                RECENT ACTIVITY
              </span>

              <h3>
                Recent Submissions
              </h3>
            </div>

            <button
              className="text-btn"
              onClick={() =>
                navigate(
                  "/submissions"
                )
              }
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="bi bi-arrow-repeat"></i>
              </div>

              <h4>
                Loading submissions
              </h4>

              <p>
                Retrieving real
                assignment records from
                the backend.
              </p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="bi bi-exclamation-circle"></i>
              </div>

              <h4>
                Unable to load data
              </h4>

              <p>{error}</p>
            </div>
          ) : recentSubmissions.length ===
            0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="bi bi-folder2-open"></i>
              </div>

              <h4>
                No assignments
                submitted yet
              </h4>

              <p>
                Student assignment
                submissions will appear
                here once files are
                uploaded.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              {recentSubmissions.map(
                (submission) => {
                  const status =
                    getSubmissionStatus(
                      submission
                    );

                  return (
                    <div
                      key={
                        submission.submission_id
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap: "16px",
                        padding:
                          "14px 16px",
                        border:
                          "1px solid rgba(148, 163, 184, 0.16)",
                        borderRadius:
                          "12px",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            marginBottom:
                              "4px",
                          }}
                        >
                          {submission.assignment_title ||
                            "Untitled Assignment"}
                        </strong>

                        <span
                          style={{
                            fontSize:
                              "0.85rem",
                            opacity:
                              "0.75",
                          }}
                        >
                          {submission.student_name ||
                            "Unknown Student"}{" "}
                          •{" "}
                          {submission.submission_id}
                        </span>
                      </div>

                      <span
                        style={{
                          whiteSpace:
                            "nowrap",
                          fontWeight:
                            "600",
                          fontSize:
                            "0.82rem",
                          color:
                            getStatusColor(
                              status
                            ),
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        <div className="dashboard-panel system-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">
                SYSTEM
              </span>

              <h3>
                Integrity Engine
              </h3>
            </div>

            <span className="online-badge">
              <span></span>
              {error
                ? "Unavailable"
                : "Ready"}
            </span>
          </div>

          <div className="engine-card">
            <div className="engine-icon">
              <i className="bi bi-shield-lock"></i>
            </div>

            <h4>
              CRC-32 Verification
            </h4>

            <p>
              CRC-32 calculates a
              reference checksum for the
              originally submitted file
              and compares it with the
              received copy during
              verification.
            </p>

            <div className="engine-details">
              <div>
                <span>
                  Algorithm
                </span>

                <strong>
                  CRC-32
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong>
                  {loading
                    ? "Connecting..."
                    : error
                      ? "Unavailable"
                      : "Connected"}
                </strong>
              </div>

              <div>
                <span>Backend</span>

                <strong>
                  {error
                    ? "Connection Error"
                    : "FastAPI + SQLite"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;