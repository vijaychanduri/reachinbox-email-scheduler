import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { ensureEmailsIndex } from "./lib/elasticsearch.js";

async function main() {
  try {
    await ensureEmailsIndex();
  } catch (err) {
    logger.error("Could not reach Elasticsearch on startup (will keep retrying on demand)", {
      error: String(err),
    });
  }

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info("Server started", { port: env.PORT, url: `http://localhost:${env.PORT}` });
    logger.info("Bull Board available", { url: `http://localhost:${env.PORT}/admin/queues` });
  });
}

main();
