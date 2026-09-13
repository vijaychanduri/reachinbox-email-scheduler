import axios from "axios";
import type {
  User,
  EmailRecord,
  SlackStatus,
  ScheduleEmailPayload,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// withCredentials is required so the httpOnly JWT cookie set by the backend
// is sent along with every request.
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

export function googleLoginUrl(): string {
  return `${API_URL}/api/auth/google`;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function scheduleEmails(
  payload: ScheduleEmailPayload
): Promise<{ message: string; emails: EmailRecord[] }> {
  const { data } = await api.post("/emails/schedule", payload);
  return data;
}

export async function fetchScheduledEmails(): Promise<EmailRecord[]> {
  const { data } = await api.get<{ emails: EmailRecord[] }>("/emails/scheduled");
  return data.emails;
}

export async function fetchSentEmails(): Promise<EmailRecord[]> {
  const { data } = await api.get<{ emails: EmailRecord[] }>("/emails/sent");
  return data.emails;
}

export async function searchEmails(query: string): Promise<EmailRecord[]> {
  const { data } = await api.get<{ results: EmailRecord[] }>("/emails/search", {
    params: { q: query },
  });
  return data.results;
}

export async function fetchSlackStatus(): Promise<SlackStatus> {
  const { data } = await api.get<SlackStatus>("/slack/status");
  return data;
}

export function slackConnectUrl(): string {
  return `${API_URL}/api/slack/connect`;
}

export async function disconnectSlack(): Promise<void> {
  await api.post("/slack/disconnect");
}
