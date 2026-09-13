import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import DashboardLayout from "./pages/DashboardLayout";
import ScheduledEmails from "./pages/ScheduledEmails";
import SentEmails from "./pages/SentEmails";
import type { User } from "./types";
import { fetchMe } from "./services/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/scheduled" /> : <Login />} />

      <Route
        element={user ? <DashboardLayout user={user} /> : <Navigate to="/login" />}
      >
        <Route path="/" element={<Navigate to="/scheduled" />} />
        <Route path="/scheduled" element={<ScheduledEmails />} />
        <Route path="/sent" element={<SentEmails />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/scheduled" : "/login"} />} />
    </Routes>
  );
}
