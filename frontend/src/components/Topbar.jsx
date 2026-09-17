import { useLocation } from "react-router-dom";

function Topbar({ theme, toggleTheme }) {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case "/":
        return {
          title: "Dashboard",
          subtitle: "Student Assignment Submission Integrity Checker",
        };

      case "/submit":
        return {
          title: "Submit Assignment",
          subtitle: "Upload a new assignment for integrity protection",
        };

      case "/submissions":
        return {
          title: "Submissions",
          subtitle: "View and manage assignment submissions",
        };

      case "/verify":
        return {
          title: "Verify Integrity",
          subtitle: "Compare assignment files using CRC-32",
        };

      case "/simulator":
        return {
          title: "Error Simulator",
          subtitle: "Test CRC-32 against simulated file corruption",
        };

      case "/history":
        return {
          title: "Verification History",
          subtitle: "Review previous assignment verification results",
        };

      case "/reports":
        return {
          title: "Reports",
          subtitle: "Generate assignment integrity reports",
        };

      default:
        return {
          title: "IntegrityCheck",
          subtitle: "Student Assignment Submission Integrity Checker",
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="topbar">
      <div>
        <h1>{pageInfo.title}</h1>
        <p>{pageInfo.subtitle}</p>
      </div>

      <div className="topbar-right">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={
            theme === "dark"
              ? "Switch to Light Theme"
              : "Switch to Dark Theme"
          }
        >
          <div className="theme-toggle-icon">
            {theme === "dark" ? (
              <i className="bi bi-sun-fill"></i>
            ) : (
              <i className="bi bi-moon-stars-fill"></i>
            )}
          </div>

          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        <button className="notification-btn">
          <i className="bi bi-bell"></i>
        </button>

        <div className="user-profile">
          <div className="avatar">
            <i className="bi bi-person"></i>
          </div>

          <div>
            <strong>Demo User</strong>
            <span>Instructor</span>
          </div>

          <i className="bi bi-chevron-down"></i>
        </div>
      </div>
    </header>
  );
}

export default Topbar;