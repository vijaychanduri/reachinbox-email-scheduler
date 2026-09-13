import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  scheduleEmails,
  listScheduled,
  listSent,
  search,
  getById,
} from "../controllers/emails.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/schedule", scheduleEmails);
router.get("/scheduled", listScheduled);
router.get("/sent", listSent);
router.get("/search", search);
router.get("/:id", getById);

export default router;
