import express from "express";
import { httpAuth } from "../middleware/wsAuth.middleware.js";
import {
  createOrder,
  verifyAndActivateMapSubscription,
  getPaymentReceipt,
  createAutoPaySubscription,
  verifyAutoPay
} from "../controllers/razorpay.controller.js";

const router = express.Router();

router.post("/payment/create-order", httpAuth, createOrder);
router.post("/payment/verify-map-subscription", httpAuth, verifyAndActivateMapSubscription);
router.get(
  "/payment/receipt/:subscriptionId",
  httpAuth,
  getPaymentReceipt
);
router.post("/payment/create-autopay-subscription", httpAuth, createAutoPaySubscription);
router.post("/payment/verify-autopay", httpAuth, verifyAutoPay);

export default router;
