import express from "express";
import { razorpayWebhook } from "../controllers/razorpayWebhook.controller.js";

const router = express.Router();

// ⚠️ Razorpay requires raw body
router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

export default router;
