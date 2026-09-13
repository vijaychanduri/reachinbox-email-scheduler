import type { Email } from "@prisma/client";
import { esClient, EMAILS_INDEX } from "../lib/elasticsearch.js";
import { logger } from "../lib/logger.js";

/**
 * Indexes (or re-indexes) an email document. Called whenever an email is
 * created or its status changes, so Elasticsearch stays in sync with
 * PostgreSQL. We use the Prisma id as the ES document id so this is
 * effectively an upsert.
 */
export async function indexEmail(email: Email): Promise<void> {
  try {
    await esClient.index({
      index: EMAILS_INDEX,
      id: email.id,
      document: {
        id: email.id,
        userId: email.userId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        senderEmail: email.senderEmail,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
      },
      refresh: "wait_for",
    });
  } catch (err) {
    // Search indexing must never break email scheduling/sending.
    logger.error("Failed to index email in Elasticsearch", {
      emailId: email.id,
      error: String(err),
    });
  }
}

export interface EmailSearchHit {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  senderEmail: string;
  scheduledAt: string;
  sentAt: string | null;
}

export async function searchEmails(
  userId: string,
  query: string
): Promise<EmailSearchHit[]> {
  const result = await esClient.search<EmailSearchHit>({
    index: EMAILS_INDEX,
    query: {
      bool: {
        must: [{ term: { userId } }],
        should: query
          ? [
              {
                multi_match: {
                  query,
                  fields: ["recipient", "subject", "body", "senderEmail", "status"],
                  fuzziness: "AUTO",
                },
              },
            ]
          : [],
        minimum_should_match: query ? 1 : 0,
      },
    },
    size: 50,
    sort: [{ scheduledAt: { order: "desc" } }],
  });

  return result.hits.hits.map((hit) => hit._source as EmailSearchHit);
}
