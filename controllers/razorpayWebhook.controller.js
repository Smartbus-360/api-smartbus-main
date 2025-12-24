import crypto from "crypto";
import StudentMapSubscription from "../models/studentMapSubscription.model.js";

export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];
    const body = req.body.toString();

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(body);

    // 🔔 PAYMENT SUCCESS
    if (event.event === "subscription.charged") {
      const subscriptionId = event.payload.subscription.entity.id;

      const sub = await StudentMapSubscription.findOne({
        where: { razorpay_subscription_id: subscriptionId }
      });

      if (sub) {
        const newEnd = new Date(sub.end_date);
        newEnd.setMonth(newEnd.getMonth() + 1);

        await sub.update({
          end_date: newEnd,
          status: "active"
        });
      }
    }

    // ❌ CANCELLED
    if (event.event === "subscription.cancelled") {
      const subscriptionId = event.payload.subscription.entity.id;

      await StudentMapSubscription.update(
        { status: "cancelled" },
        { where: { razorpay_subscription_id: subscriptionId } }
      );
    }

    // ✅ COMPLETED (yearly end)
    if (event.event === "subscription.completed") {
      const subscriptionId = event.payload.subscription.entity.id;

      await StudentMapSubscription.update(
        { status: "completed" },
        { where: { razorpay_subscription_id: subscriptionId } }
      );
    }

    return res.json({ received: true });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return res.status(500).json({ message: "Webhook failed" });
  }
};
