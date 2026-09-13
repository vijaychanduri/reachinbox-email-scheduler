import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    console.warn(`[env] Missing environment variable: ${name}`);
    return "";
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: required("REDIS_URL", "redis://localhost:6379"),
  ELASTICSEARCH_URL: required("ELASTICSEARCH_URL", "http://localhost:9200"),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",

  SESSION_SECRET: required("SESSION_SECRET", "dev-secret-change-me"),

  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || "",
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || "",
  SLACK_REDIRECT_URI:
    process.env.SLACK_REDIRECT_URI || "http://localhost:5000/api/slack/callback",

  WORKER_CONCURRENCY: Number(process.env.WORKER_CONCURRENCY || 5),
  MIN_DELAY_BETWEEN_EMAILS: Number(process.env.MIN_DELAY_BETWEEN_EMAILS || 2000),
  MAX_EMAILS_PER_HOUR: Number(process.env.MAX_EMAILS_PER_HOUR || 200),

  ETHEREAL_USER: process.env.ETHEREAL_USER || "",
  ETHEREAL_PASS: process.env.ETHEREAL_PASS || "",

  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
};
