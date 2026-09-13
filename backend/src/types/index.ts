export interface JwtPayload {
  userId: string;
  email: string;
}

export interface ScheduleEmailRequestBody {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string; // ISO date string
  delayBetweenEmails?: number; // ms
  hourlyLimit?: number;
  senderEmail: string;
}

export interface EmailJobData {
  emailId: string;
}
