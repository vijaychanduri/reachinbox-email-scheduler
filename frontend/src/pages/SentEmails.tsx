import { useEffect, useState } from "react";
import EmailTable from "../components/EmailTable";
import SearchBox from "../components/SearchBox";
import type { EmailRecord } from "../types";
import { fetchSentEmails, searchEmails } from "../services/api";

export default function SentEmails() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = query.trim()
        ? (await searchEmails(query)).filter(
            (e) => e.status === "sent" || e.status === "failed"
          )
        : await fetchSentEmails();
      setEmails(data);
    } catch {
      setError("Could not load sent emails. Is the backend running?");
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
        <h1 className="text-xl font-semibold">Sent Emails</h1>
        <SearchBox value={query} onChange={setQuery} />
      </div>

      <EmailTable emails={emails} loading={loading} error={error} mode="sent" />
    </div>
  );
}
