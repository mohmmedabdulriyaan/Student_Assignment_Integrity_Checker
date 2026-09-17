import { NavLink } from "react-router-dom";

function Sidebar() {
  const menuItems = [
    {
      name: "Dashboard",
      icon: "bi-grid-1x2-fill",
      path: "/",
    },
    {
      name: "Submit Assignment",
      icon: "bi-cloud-arrow-up",
      path: "/submit",
    },
    {
      name: "Submissions",
      icon: "bi-files",
      path: "/submissions",
    },
    {
      name: "Verify Integrity",
      icon: "bi-shield-check",
      path: "/verify",
    },
    {
      name: "History",
      icon: "bi-clock-history",
      path: "/history",
    },
    {
      name: "Reports",
      icon: "bi-file-earmark-bar-graph",
      path: "/reports",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <i className="bi bi-shield-check"></i>
        </div>

        <div>
          <h2>IntegrityCheck</h2>
          <span>CRC-32 System</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? "menu-item active"
                : "menu-item"
            }
          >
            <i
              className={`bi ${item.icon}`}
            ></i>

            <span>
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <i className="bi bi-info-circle"></i>

        <div>
          <p>Product 3</p>
          <span>
            OS & CN Laboratory
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;