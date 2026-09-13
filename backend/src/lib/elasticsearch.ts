import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env.js";

export const esClient = new Client({ node: env.ELASTICSEARCH_URL });

export const EMAILS_INDEX = "emails";

// Creates the "emails" index if it doesn't exist yet. Safe to call on every
// server startup.
export async function ensureEmailsIndex() {
  const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
  if (exists) return;

  await esClient.indices.create({
    index: EMAILS_INDEX,
    mappings: {
      properties: {
        id: { type: "keyword" },
        userId: { type: "keyword" },
        recipient: { type: "text" },
        subject: { type: "text" },
        body: { type: "text" },
        status: { type: "keyword" },
        senderEmail: { type: "keyword" },
        scheduledAt: { type: "date" },
        sentAt: { type: "date" },
      },
    },
  });
}
