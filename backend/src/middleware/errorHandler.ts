import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error("Unhandled error", { error: err instanceof Error ? err.message : String(err) });

  if (res.headersSent) return;

  res.status(500).json({ error: "Internal server error" });
}
