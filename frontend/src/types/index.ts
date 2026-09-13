export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";

export interface EmailRecord {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  previewUrl: string | null;
  error: string | null;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderEmail: string;
}
