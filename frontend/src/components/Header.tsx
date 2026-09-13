import { NavLink, useNavigate } from "react-router-dom";
import type { User, SlackStatus } from "../types";
import { logout, slackConnectUrl, disconnectSlack } from "../services/api";

interface HeaderProps {
  user: User;
  slackStatus: SlackStatus | null;
  onSlackDisconnected: () => void;
}

export default function Header({ user, slackStatus, onSlackDisconnected }: HeaderProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleDisconnectSlack() {
    await disconnectSlack();
    onSlackDisconnected();
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:text-gray-900"
    }`;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-brand-600">ReachInbox</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/scheduled" className={navLinkClass}>
              Scheduled Emails
            </NavLink>
            <NavLink to="/sent" className={navLinkClass}>
              Sent Emails
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {slackStatus?.connected ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1">
                Slack Connected{slackStatus.teamName ? ` (${slackStatus.teamName})` : ""}
              </span>
              <button
                onClick={handleDisconnectSlack}
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href={slackConnectUrl()}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
            >
              Connect Slack
            </a>
          )}

          <div className="flex items-center gap-2">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-medium">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="text-sm leading-tight">
              <p className="font-medium">{user.name}</p>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
