import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

let transporterPromise: Promise<Transporter> | null = null;

/**
 * Lazily creates (and caches) a Nodemailer transporter for Ethereal Email.
 * If ETHEREAL_USER / ETHEREAL_PASS are set in .env, those credentials are
 * reused (useful so the same inbox is used across restarts). Otherwise a
 * fresh Ethereal test account is created automatically.
 */
async function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      let user = env.ETHEREAL_USER;
      let pass = env.ETHEREAL_PASS;

      if (!user || !pass) {
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        logger.info("Created a new Ethereal test account", { user });
      }

      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user, pass },
      });
    })();
  }
  return transporterPromise;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | null;
}

export async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<SendEmailResult> {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null,
  };
}
