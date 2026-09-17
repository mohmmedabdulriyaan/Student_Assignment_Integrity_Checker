import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <main className="dashboard">
      <section className="welcome-section">
        <div>
          <span className="section-label">SYSTEM OVERVIEW</span>

          <h2>Assignment Integrity Dashboard</h2>

          <p>
            Monitor assignment submissions and verify file integrity using
            CRC-32 error detection.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => navigate("/submit")}
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
            <span>Total Submissions</span>
            <h3>0</h3>
            <p>No submissions yet</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon verified">
            <i className="bi bi-check-circle"></i>
          </div>

          <div>
            <span>Verified</span>
            <h3>0</h3>
            <p>Integrity confirmed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon corrupted">
            <i className="bi bi-exclamation-triangle"></i>
          </div>

          <div>
            <span>Integrity Issues</span>
            <h3>0</h3>
            <p>No corruption detected</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <i className="bi bi-hourglass-split"></i>
          </div>

          <div>
            <span>Pending</span>
            <h3>0</h3>
            <p>Waiting for verification</p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">RECENT ACTIVITY</span>
              <h3>Recent Submissions</h3>
            </div>

            <button
              className="text-btn"
              onClick={() => navigate("/submissions")}
            >
              View All
            </button>
          </div>

          <div className="empty-state">
            <div className="empty-icon">
              <i className="bi bi-folder2-open"></i>
            </div>

            <h4>No assignments submitted yet</h4>

            <p>
              Student assignment submissions will appear here once files are
              uploaded.
            </p>
          </div>
        </div>

        <div className="dashboard-panel system-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">SYSTEM</span>
              <h3>Integrity Engine</h3>
            </div>

            <span className="online-badge">
              <span></span>
              Ready
            </span>
          </div>

          <div className="engine-card">
            <div className="engine-icon">
              <i className="bi bi-shield-lock"></i>
            </div>

            <h4>CRC-32 Verification</h4>

            <p>
              CRC-32 will be used to calculate and compare reference values for
              submitted assignment files.
            </p>

            <div className="engine-details">
              <div>
                <span>Algorithm</span>
                <strong>CRC-32</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>Not Connected</strong>
              </div>

              <div>
                <span>Backend</span>
                <strong>Coming Soon</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;