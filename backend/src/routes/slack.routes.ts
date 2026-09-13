import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { connect, callback, disconnect, status } from "../controllers/slack.controller.js";

const router = Router();

// Callback is hit directly by Slack's redirect - auth is verified via the
// signed `state` param instead of requireAuth (see slack.controller.ts).
router.get("/callback", callback);

router.get("/connect", requireAuth, connect);
router.post("/disconnect", requireAuth, disconnect);
router.get("/status", requireAuth, status);

export default router;
