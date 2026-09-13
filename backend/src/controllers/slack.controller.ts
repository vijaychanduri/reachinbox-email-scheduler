import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  getSlackAuthorizeUrl,
  exchangeSlackCode,
  saveSlackConnection,
  disconnectSlack,
  getSlackStatus,
} from "../services/slack.service.js";
import { env } from "../config/env.js";

/**
 * We encode the logged-in userId into Slack's OAuth "state" param (signed
 * with our own secret) so the callback - which Slack redirects to directly,
 * with no cookies guaranteed - can figure out which user connected Slack.
 */
export function connect(req: Request, res: Response) {
  const state = jwt.sign({ userId: req.user!.userId }, env.SESSION_SECRET, {
    expiresIn: "10m",
  });
  res.redirect(getSlackAuthorizeUrl(state));
}

export async function callback(req: Request, res: Response) {
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state) {
    return res.redirect(`${env.FRONTEND_URL}?slack=error`);
  }

  try {
    const { userId } = jwt.verify(state, env.SESSION_SECRET) as { userId: string };

    const tokenResponse = await exchangeSlackCode(code);
    if (!tokenResponse.ok) {
      return res.redirect(`${env.FRONTEND_URL}?slack=error`);
    }

    await saveSlackConnection(userId, tokenResponse);
    res.redirect(`${env.FRONTEND_URL}?slack=connected`);
  } catch {
    res.redirect(`${env.FRONTEND_URL}?slack=error`);
  }
}

export async function disconnect(req: Request, res: Response) {
  await disconnectSlack(req.user!.userId);
  res.json({ success: true });
}

export async function status(req: Request, res: Response) {
  const result = await getSlackStatus(req.user!.userId);
  res.json(result);
}
