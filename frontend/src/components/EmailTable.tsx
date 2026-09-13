import type { EmailRecord } from "../types";
import StatusBadge from "./StatusBadge";

interface EmailTableProps {
  emails: EmailRecord[];
  loading: boolean;
  error: string | null;
  mode: "scheduled" | "sent";
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EmailTable({ emails, loading, error, mode }: EmailTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
        <svg
          className="animate-spin h-5 w-5 mr-2 text-brand-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        Loading emails...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
        {error}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
        {mode === "scheduled"
          ? "No scheduled emails yet. Click \"Compose\" to schedule your first batch."
          : "No sent emails yet."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">
              {mode === "scheduled" ? "Scheduled Time" : "Sent Time"}
            </th>
            <th className="px-4 py-3 font-medium">Status</th>
            {mode === "sent" && <th className="px-4 py-3 font-medium">Preview</th>}
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3">{email.recipient}</td>
              <td className="px-4 py-3">{email.subject}</td>
              <td className="px-4 py-3 text-gray-500">
                {formatDate(mode === "scheduled" ? email.scheduledAt : email.sentAt)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={email.status} />
              </td>
              {mode === "sent" && (
                <td className="px-4 py-3">
                  {email.previewUrl ? (
                    <a
                      href={email.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      View Ethereal Email
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
