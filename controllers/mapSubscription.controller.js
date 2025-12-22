import MapSubscriptionPlan from "../models/mapSubscriptionPlan.model.js";
import StudentMapSubscription from "../models/studentMapSubscription.model.js";
import Institute from "../models/institute.model.js";
import User from "../models/user.model.js";
import { Op } from "sequelize";

/**
 * GET /map/subscription/plans
 * Returns current pricing (admin editable)
 */
export const getMapSubscriptionPlans = async (req, res, next) => {
  try {
    const plans = await MapSubscriptionPlan.findAll({
      where: { status: true },
      attributes: ["plan_type", "price_per_month"],
    });

    res.json({ success: true, plans });
  } catch (err) {
    next(err);
  }
};
/**
 * POST /map/subscription/activate
 * Body: { planType, months, txnId }
 */
export const activateStudentMapSubscription = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { planType, months, txnId } = req.body;

    if (!planType || !months || !txnId) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const plan = await MapSubscriptionPlan.findOne({
      where: { plan_type: planType, status: true },
    });

    if (!plan) {
      return res.status(400).json({ message: "Plan not available" });
    }

    const amount = plan.price_per_month * months;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + Number(months));

    // Expire old subscriptions
    await StudentMapSubscription.update(
      { status: "expired" },
      {
        where: {
          student_id: studentId,
          end_date: { [Op.lt]: new Date() },
        },
      }
    );

    // ❌ Reject reused transaction ID
const existingTxn = await StudentMapSubscription.findOne({
  where: { txn_id: txnId }
});

if (existingTxn) {
  return res.status(400).json({
    success: false,
    message: "This transaction ID is already used"
  });
}
if (txnId.length < 6) {
  return res.status(400).json({
    success: false,
    message: "Invalid transaction ID"
  });
}

    await StudentMapSubscription.create({
      student_id: studentId,
      plan_type: planType,
      months,
      amount,
      txn_id: txnId,
      start_date: startDate,
      end_date: endDate,
      status: "active",
    });

    res.json({
      success: true,
      message: "Map access activated",
      validTill: endDate,
    });
  } catch (err) {
    next(err);
  }
};
/**
 * GET /map/access-check
 * Final authority for map access
 */
// export const checkMapAccess = async (req, res, next) => {
//   try {
//     const userId = req.user.id;

//     const user = await User.findByPk(userId, {
//       include: [{ model: Institute }],
//     });

//     if (!user) {
//       return res.status(401).json({ allowed: false });
//     }

//     // 1️⃣ Institute-level access
//     if (user.Institute?.mapAccess === true) {
//       return res.json({ allowed: true, source: "institute" });
//     }

//     // 2️⃣ Student-level subscription override
//     // const activeSub = await StudentMapSubscription.findOne({
//     //   where: {
//     //     student_id: userId,
//     //     status: "active",
//     //     end_date: { [Op.gte]: new Date() },
//     //   },
//     // });

//     const now = new Date();

// const activeSub = await StudentMapSubscription.findOne({
//   where: {
//     student_id: userId,
//     status: "active",
//   },
// });

// if (activeSub) {
//   if (new Date(activeSub.end_date) < now) {
//     // Auto-expire
//     activeSub.status = "expired";
//     await activeSub.save();
//   } else {
//     return res.json({
//       allowed: true,
//       source: "student",
//       expiresOn: activeSub.end_date,
//     });
//   }
// }

//     if (activeSub) {
//       return res.json({
//         allowed: true,
//         source: "student",
//         expiresOn: activeSub.end_date,
//       });
//     }

//     return res.status(403).json({
//       allowed: false,
//       message: "Map access blocked. Subscription required.",
//     });
//   } catch (err) {
//     next(err);
//   }
// };
export const checkMapAccess = async (req, res, next) => {
console.log("🔥 CHECK MAP ACCESS HIT FROM:", req.originalUrl);
  try {
    // const userId = req.user.id;
    const userId = req.user.id || req.user.userId;

if (!userId) {
  return res.status(401).json({
    allowed: false,
    message: "Invalid user session"
  });
}

    const now = new Date();

    const user = await User.findByPk(userId, {
      include: [{ model: Institute }],
    });

    if (!user) {
      return res.status(401).json({ allowed: false });
    }

    // 1️⃣ Institute-level access
    if (user.Institute?.mapAccess === true) {
      return res.json({ allowed: true, source: "institute" });
    }

    // 2️⃣ Student-level subscription (manual expiry handling)
    const activeSub = await StudentMapSubscription.findOne({
      where: {
        student_id: userId,
        status: "active",
      },
      order: [["end_date", "DESC"]],
    });

    // if (activeSub) {
    //   const endDate = new Date(activeSub.end_date);

    //   // 🔴 expired → auto mark expired
    //   if (endDate < now) {
    //     activeSub.status = "expired";
    //     await activeSub.save();
    //   } else {
    //     // 🟢 still active
    //     const daysLeft = Math.ceil(
    //       (endDate - now) / (1000 * 60 * 60 * 24)
    //     );

    //     return res.json({
    //       allowed: true,
    //       source: "student",
    //       expiresOn: activeSub.end_date,
    //       daysLeft,
    //     });
    //   }
    // }

    if (activeSub) {

  // 🔴 ADMIN REVOKED
  if (activeSub.status === "revoked") {
    return res.status(403).json({
      allowed: false,
      revoked: true,
      message: "Map access revoked by admin",
    });
  }

  const endDate = new Date(activeSub.end_date);
endDate.setHours(23, 59, 59, 999); // ✅ allow full day

  // 🔴 EXPIRED
  if (endDate < now) {
    activeSub.status = "expired";
    await activeSub.save();
return res.status(403).json({
    allowed: false,
    expired: true,
    message: "Subscription expired"
  });
}

    else {
    // 🟢 ACTIVE
    const daysLeft = Math.ceil(
      (endDate - now) / (1000 * 60 * 60 * 24)
    );

    return res.json({
      allowed: true,
      source: "student",
      expiresOn: activeSub.end_date,
      daysLeft,
    });
  }
}

    // 3️⃣ No access → blocked
    return res.status(403).json({
      allowed: false,
      expired: true,
      message: "Subscription expired or not found",
    });

  } catch (err) {
    next(err);
  }
};
/**
 * GET /map/subscription/history
 * Student subscription history
 */
export const getStudentSubscriptionHistory = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const subs = await StudentMapSubscription.findAll({
      where: { student_id: studentId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      subscriptions: subs,
    });
  } catch (err) {
    next(err);
  }
};
/**
 * ADMIN: Revoke a student map subscription
 */
export const revokeStudentMapSubscription = async (req, res, next) => {
  try {
    const { id } = req.params; // subscription ID

    const sub = await StudentMapSubscription.findByPk(id);

    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    sub.status = "revoked";
    await sub.save();

    res.json({
      success: true,
      message: "Subscription revoked successfully",
    });
  } catch (err) {
    next(err);
  }
};
