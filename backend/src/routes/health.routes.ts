import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { esClient } from "../lib/elasticsearch.js";

const router = Router();

router.get("/", async (_req, res) => {
  const status: Record<string, string> = { status: "ok" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "ok";
  } catch {
    status.database = "unavailable";
  }

  try {
    await redis.ping();
    status.redis = "ok";
  } catch {
    status.redis = "unavailable";
  }

  try {
    await esClient.ping();
    status.elasticsearch = "ok";
  } catch {
    status.elasticsearch = "unavailable";
  }

  res.json(status);
});

export default router;
