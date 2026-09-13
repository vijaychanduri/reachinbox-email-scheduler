import { googleLoginUrl } from "../services/api";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-brand-600 mb-1">ReachInbox</h1>
        <p className="text-sm text-gray-500 mb-6">Schedule and track your outbound email campaigns.</p>

        <a
          href={googleLoginUrl()}
          className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.9 32.4 29.4 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C33.6 4.7 29 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.5 19 12 24 12c3.1 0 5.8 1.1 8 3l6-6C33.6 4.7 29 3 24 3c-7.7 0-14.3 4.4-17.7 11.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 36.3 26.8 37 24 37c-5.4 0-9.9-3.4-11.6-8.2l-6.5 5C9.6 40.6 16.2 45 24 45z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6.3 5.3C40.7 35.9 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"
            />
          </svg>
          Continue with Google
        </a>
      </div>
    </div>
  );
}
