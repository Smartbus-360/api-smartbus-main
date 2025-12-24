import express from "express";
import { httpAuth } from "../middleware/wsAuth.middleware.js";
import {
  getStudentSubscriptionHistory,
  getMapSubscriptionPlans,
  checkMapAccess
} from "../controllers/mapSubscription.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// Student
// router.post("/map/subscription/activate", httpAuth, activateStudentMapSubscription);
router.get("/map/subscription/history", httpAuth, getStudentSubscriptionHistory);
router.get("/map/subscription/plans", httpAuth, getMapSubscriptionPlans);
router.get("/map/access-check", httpAuth, checkMapAccess);

export default router;
