import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import SubmitAssignment from "./pages/SubmitAssignment";
import Submissions from "./pages/Submissions";
import VerifyIntegrity from "./pages/VerifyIntegrity";
import History from "./pages/History";
import Reports from "./pages/Reports";

function Application() {
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem(
        "integrity-theme"
      ) || "dark"
    );
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      "integrity-theme",
      theme
    );
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark"
        ? "light"
        : "dark"
    );
  };

  return (
    <div className="app">
      <Sidebar />

      <div className="main-content">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <Routes>
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/submit"
            element={
              <SubmitAssignment />
            }
          />

          <Route
            path="/submissions"
            element={<Submissions />}
          />

          <Route
            path="/verify"
            element={
              <VerifyIntegrity />
            }
          />

          <Route
            path="/history"
            element={<History />}
          />

          <Route
            path="/reports"
            element={<Reports />}
          />

          <Route
            path="*"
            element={
              <Navigate to="/" />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Application />
    </BrowserRouter>
  );
}

export default App;