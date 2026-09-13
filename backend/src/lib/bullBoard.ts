import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "../queues/email.queue.js";

/**
 * Mounts a live dashboard for the email queue at /admin/queues.
 * Protected by basic auth in server.ts (simple, practical for an assignment).
 */
export function buildBullBoardRouter() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
