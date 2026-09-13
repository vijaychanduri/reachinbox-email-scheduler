import { useEffect, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Toast from "../components/Toast";
import type { User, SlackStatus } from "../types";
import { fetchSlackStatus } from "../services/api";

interface DashboardLayoutProps {
  user: User;
}

export default function DashboardLayout({ user }: DashboardLayoutProps) {
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  async function loadSlackStatus() {
    try {
      const status = await fetchSlackStatus();
      setSlackStatus(status);
    } catch {
      setSlackStatus({ connected: false, teamName: null });
    }
  }

  useEffect(() => {
    loadSlackStatus();
  }, []);

  // Show a toast after returning from the Slack OAuth redirect.
  useEffect(() => {
    const slackParam = searchParams.get("slack");
    if (slackParam === "connected") {
      setToast("Slack connected successfully");
      loadSlackStatus();
    } else if (slackParam === "error") {
      setToast("Failed to connect Slack. Please try again.");
    }
    if (slackParam) {
      searchParams.delete("slack");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <Header
        user={user}
        slackStatus={slackStatus}
        onSlackDisconnected={() => setSlackStatus({ connected: false, teamName: null })}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
