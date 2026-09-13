import { Router } from "express";
import passport from "passport";
import { googleCallback, me, logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login-failed" }),
  googleCallback
);

router.get("/me", requireAuth, me);
router.post("/logout", logout);

export default router;
