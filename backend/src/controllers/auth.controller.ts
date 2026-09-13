import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { issueAuthCookie, clearAuthCookie } from "../middleware/auth.js";
import { env } from "../config/env.js";
import type { User } from "@prisma/client";

/** Called after Passport's Google strategy succeeds (req.user is a Prisma User). */
export function googleCallback(req: Request, res: Response) {
  const user = req.user as unknown as User;

  issueAuthCookie(res, { userId: user.id, email: user.email });

  res.redirect(env.FRONTEND_URL);
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  });
}

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  res.json({ success: true });
}
