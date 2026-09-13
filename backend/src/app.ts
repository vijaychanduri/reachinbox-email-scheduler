import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { basicAuth } from "./middleware/basicAuth.js";
import { buildBullBoardRouter } from "./lib/bullBoard.js";

import authRoutes from "./routes/auth.routes.js";
import emailsRoutes from "./routes/emails.routes.js";
import slackRoutes from "./routes/slack.routes.js";
import healthRoutes from "./routes/health.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" })); // generous enough for CSV-derived recipient lists
  app.use(cookieParser());
  app.use(passport.initialize());

  app.use("/health", healthRoutes);
  app.use("/admin/queues", basicAuth, buildBullBoardRouter());

  app.use("/api/auth", authRoutes);
  app.use("/api/emails", emailsRoutes);
  app.use("/api/slack", slackRoutes);

  // Wraps every async route handler so thrown/rejected errors reach errorHandler.
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => errorHandler(err, req, res, next)
  );

  return app;
}
