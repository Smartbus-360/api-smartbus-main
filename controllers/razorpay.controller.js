// import razorpay from "../config/razorpay.js";

// export const createOrder = async (req, res) => {
//   try {
//     const { amount } = req.body; // amount in rupees

//     const order = await razorpay.orders.create({
//       amount: amount * 100, // Razorpay uses paise
//       currency: "INR",
//       receipt: "rcpt_" + Date.now()
//     });

//     res.status(200).json({
//       orderId: order.id,
//       amount: order.amount,
//       key: process.env.RAZORPAY_KEY_ID
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

import Razorpay from "razorpay";
import crypto from "crypto";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import MapSubscriptionPlan from "../models/mapSubscriptionPlan.model.js";
import { activateStudentMapSubscriptionInternal } from "./mapSubscription.controller.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1️⃣ Create Order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planType, months } = req.body;

    const plan = await MapSubscriptionPlan.findOne({
      where: { plan_type: planType, status: true }
    });

    if (!plan) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const amount = plan.price_per_month * months;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `map_${userId}_${Date.now()}`
    });

    await PaymentTransaction.create({
      user_id: userId,
      razorpay_order_id: order.id,
      amount,
      purpose: "map_subscription",
      status: "created"
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 2️⃣ Verify Payment
// export const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature
//     } = req.body;

//     const sign = razorpay_order_id + "|" + razorpay_payment_id;

//     const expectedSign = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(sign)
//       .digest("hex");

//     if (expectedSign === razorpay_signature) {
//       return res.json({ success: true, message: "Payment verified" });
//     } else {
//       return res.status(400).json({ success: false, message: "Invalid signature" });
//     }
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
// export const createAutoPaySubscription = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { planType } = req.body; // yearly only

//     if (planType !== "yearly") {
//       return res.status(400).json({ message: "AutoPay only allowed for yearly plan" });
//     }

//     const plan = await MapSubscriptionPlan.findOne({
//       where: { plan_type: "yearly", status: true }
//     });

//     if (!plan || !plan.razorpay_plan_id) {
//       return res.status(400).json({ message: "Razorpay plan not configured" });
//     }

//     const subscription = await razorpay.subscriptions.create({
//       plan_id: plan.razorpay_plan_id,
//       total_count: 12, // 12 billing cycles
//       customer_notify: 1,
//     });

//     res.json({
//       success: true,
//       subscriptionId: subscription.id,
//       key: process.env.RAZORPAY_KEY_ID,
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

export const createAutoPaySubscription = async (req, res) => {
  const { planType } = req.body;

  const plan = await MapSubscriptionPlan.findOne({
    where: { plan_type: planType, status: true }
  });

  if (!plan || !plan.razorpay_plan_id) {
    return res.status(400).json({ message: "Razorpay plan not configured" });
  }

  // const subscriptionPayload = {
  //   plan_id: plan.razorpay_plan_id,
  //   customer_notify: 1
  // };

  // // 🔥 KEY DIFFERENCE
  // if (planType === "yearly") {
  //   subscriptionPayload.total_count = 12; // stop after 12 months
  // }
  const payload = {
  plan_id: plan.razorpay_plan_id,
  customer_notify: 1,
};

// 🔥 Razorpay REQUIRES total_count
if (planType === "yearly") {
  payload.total_count = 12;     // 12 months only
} else {
  payload.total_count = 120;    // monthly autopay (~10 years)
}

  // monthly autopay → no total_count (runs until cancelled)

  const subscription = await razorpay.subscriptions.create(payload);

  res.json({
    subscriptionId: subscription.id,
    key: process.env.RAZORPAY_KEY_ID
  });
};

export const verifyAutoPay = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const sign = razorpay_payment_id + "|" + razorpay_subscription_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid autopay signature" });
    }

    // Activate map for 1 year
    await activateStudentMapSubscriptionInternal({
      studentId: userId,
      planType: "yearly",
      months: 12,
      amount: 0,
      txnId: razorpay_payment_id,
      autopay: true,
      razorpay_subscription_id
    });

    res.json({
      success: true,
      message: "AutoPay enabled for 1 year"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyAndActivateMapSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
      months
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const txn = await PaymentTransaction.findOne({
      where: { razorpay_order_id, status: "created" }
    });

    if (!txn) {
      return res.status(400).json({ message: "Transaction not found" });
    }

    txn.razorpay_payment_id = razorpay_payment_id;
    txn.razorpay_signature = razorpay_signature;
    txn.status = "paid";
    await txn.save();

    // 🔥 Activate map subscription using EXISTING logic
    await activateStudentMapSubscriptionInternal({
      studentId: userId,
      planType,
      months,
      amount: txn.amount,
      txnId: razorpay_payment_id
    });

    res.json({
      success: true,
      message: "Payment verified & map access activated"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getPaymentReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.params;

    const subscription = await StudentMapSubscription.findOne({
      where: { id: subscriptionId, student_id: userId }
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const payment = await PaymentTransaction.findOne({
      where: {
        razorpay_payment_id: subscription.txn_id,
        status: "paid"
      }
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({
      success: true,
      receipt: {
        receiptNo: `SB360-${payment.id}`,
        paymentId: payment.razorpay_payment_id,
        amount: payment.amount,
        planType: subscription.plan_type,
        months: subscription.months,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        paidOn: payment.createdAt,
        studentId: subscription.student_id,
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
