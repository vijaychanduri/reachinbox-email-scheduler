import { useEffect, useState } from "react";
import EmailTable from "../components/EmailTable";
import SearchBox from "../components/SearchBox";
import ComposeModal from "../components/ComposeModal";
import Toast from "../components/Toast";
import type { EmailRecord } from "../types";
import { fetchScheduledEmails, searchEmails } from "../services/api";

export default function ScheduledEmails() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = query.trim()
        ? (await searchEmails(query)).filter(
            (e) => e.status === "scheduled" || e.status === "processing"
          )
        : await fetchScheduledEmails();
      setEmails(data);
    } catch {
      setError("Could not load scheduled emails. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Scheduled Emails</h1>
        <div className="flex items-center gap-3">
          <SearchBox value={query} onChange={setQuery} />
          <button
            onClick={load}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="text-sm bg-brand-600 text-white rounded-md px-4 py-2 hover:bg-brand-700"
          >
            Compose
          </button>
        </div>
      </div>

      <EmailTable emails={emails} loading={loading} error={error} mode="scheduled" />

      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onScheduled={(message) => {
            setShowCompose(false);
            setToast(message);
            load();
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
