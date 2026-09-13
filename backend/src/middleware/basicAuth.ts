import type { Request, Response, NextFunction } from "express";

// Minimal basic-auth guard for /admin/queues. Not meant to be
// production-grade security - just enough to keep the dashboard from being
// wide open, per requirement #17 ("protect with simple authentication if
// practical"). Credentials: admin / admin (change via env if you like).
const USERNAME = process.env.ADMIN_USERNAME || "admin";
const PASSWORD = process.env.ADMIN_PASSWORD || "admin";

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (header) {
    const [, encoded] = header.split(" ");
    const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
    if (user === USERNAME && pass === PASSWORD) {
      return next();
    }
  }

  res.set("WWW-Authenticate", 'Basic realm="Bull Board"');
  res.status(401).send("Authentication required");
}
