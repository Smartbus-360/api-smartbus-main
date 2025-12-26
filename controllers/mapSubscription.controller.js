import MapSubscriptionPlan from "../models/mapSubscriptionPlan.model.js";
import StudentMapSubscription from "../models/studentMapSubscription.model.js";
import Institute from "../models/institute.model.js";
import User from "../models/user.model.js";
import { Op } from "sequelize";

/**
 * GET /map/subscription/plans
 * Returns current pricing (admin editable)
 */
const disableCache = (res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store",
  });
};

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
// export const activateStudentMapSubscription = async (req, res, next) => {
//   try {
//     const studentId = req.user.id;
//     const { planType, months, txnId } = req.body;

//     if (!planType || !months || !txnId) {
//       return res.status(400).json({ message: "Invalid request" });
//     }

//     const plan = await MapSubscriptionPlan.findOne({
//       where: { plan_type: planType, status: true },
//     });

//     if (!plan) {
//       return res.status(400).json({ message: "Plan not available" });
//     }

//     const amount = plan.price_per_month * months;

//     const startDate = new Date();
//     const endDate = new Date();
//     endDate.setMonth(endDate.getMonth() + Number(months));

//     // Expire old subscriptions
//     await StudentMapSubscription.update(
//       { status: "expired" },
//       {
//         where: {
//           student_id: studentId,
//           end_date: { [Op.lt]: new Date() },
//         },
//       }
//     );

//     // ❌ Reject reused transaction ID
// const existingTxn = await StudentMapSubscription.findOne({
//   where: { txn_id: txnId }
// });

// if (existingTxn) {
//   return res.status(400).json({
//     success: false,
//     message: "This transaction ID is already used"
//   });
// }
// if (txnId.length < 6) {
//   return res.status(400).json({
//     success: false,
//     message: "Invalid transaction ID"
//   });
// }

//     await StudentMapSubscription.create({
//       student_id: studentId,
//       plan_type: planType,
//       months,
//       amount,
//       txn_id: txnId,
//       start_date: startDate,
//       end_date: endDate,
//       status: "active",
//     });

//     res.json({
//       success: true,
//       message: "Map access activated",
//       validTill: endDate,
//     });
//   } catch (err) {
//     next(err);
//   }
// };
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
// export const checkMapAccess = async (req, res, next) => {
// console.log("🔥 CHECK MAP ACCESS HIT FROM:", req.originalUrl);
//   try {
//     // const userId = req.user.id;
//     const studentId = req.user.id || req.user.userId;

// if (!userId) {
//   return res.status(401).json({
//     allowed: false,
//     message: "Invalid user session"
//   });
// }

//     const now = new Date();

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

//     // 2️⃣ Student-level subscription (manual expiry handling)
//     const activeSub = await StudentMapSubscription.findOne({
//       where: {
//         student_id: userId,
//         status: "active",
//       },
//       order: [["end_date", "DESC"]],
//     });

//     // if (activeSub) {
//     //   const endDate = new Date(activeSub.end_date);

//     //   // 🔴 expired → auto mark expired
//     //   if (endDate < now) {
//     //     activeSub.status = "expired";
//     //     await activeSub.save();
//     //   } else {
//     //     // 🟢 still active
//     //     const daysLeft = Math.ceil(
//     //       (endDate - now) / (1000 * 60 * 60 * 24)
//     //     );

//     //     return res.json({
//     //       allowed: true,
//     //       source: "student",
//     //       expiresOn: activeSub.end_date,
//     //       daysLeft,
//     //     });
//     //   }
//     // }

//     if (activeSub) {

//   // 🔴 ADMIN REVOKED
//   if (activeSub.status === "revoked") {
//     return res.status(403).json({
//       allowed: false,
//       revoked: true,
//       message: "Map access revoked by admin",
//     });
//   }

//   const endDate = new Date(activeSub.end_date);
// endDate.setHours(23, 59, 59, 999); // ✅ allow full day

//   // 🔴 EXPIRED
//   if (endDate < now) {
//     activeSub.status = "expired";
//     await activeSub.save();
// return res.status(403).json({
//     allowed: false,
//     expired: true,
//     message: "Subscription expired"
//   });
// }

//     else {
//     // 🟢 ACTIVE
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

//     // 3️⃣ No access → blocked
//     return res.status(403).json({
//       allowed: false,
//       expired: true,
//       message: "Subscription expired or not found",
//     });

//   } catch (err) {
//     next(err);
//   }
// };
// export const checkMapAccess = async (req, res) => {
//   console.log("🔥 CHECK MAP ACCESS HIT FROM:", req.originalUrl);
//   const studentId = req.user.id;
//   const now = new Date();

//   const activeSub = await StudentMapSubscription.findOne({
//     where: {
//       student_id: studentId,
//       status: "active"
//       // end_date: { [Op.gt]: new Date() }
//     },
//     order: [["createdAt", "DESC"]]
//   });

//   if (!activeSub) {
//     return res.json({ allowed: false });
//   }
//   const endDate = new Date(activeSub.end_date);
//   endDate.setHours(23, 59, 59, 999); 

//   if (endDate < now) {
//     activeSub.status = "expired";
//     await activeSub.save();
//     return res.json({ allowed: false });
//   }

//   return res.json({
//     allowed: true,
//     expiresOn: activeSub.end_date
//   });
// };

// export const checkMapAccess = async (req, res) => {
//   const studentId = req.user.id;
//   const now = new Date();

//   const user = await User.findByPk(studentId, {
//     include: [{ model: Institute }]
//   });

//   // 1️⃣ Institute access first
//   if (user?.Institute?.mapAccess === true) {
//     return res.json({ allowed: true, source: "institute" });
//   }

//   // 2️⃣ Student subscription override
//   const activeSub = await StudentMapSubscription.findOne({
//     where: {
//       student_id: studentId,
//       status: "active"
//     },
//     order: [["createdAt", "DESC"]]
//   });

//   if (!activeSub) {
//     return res.json({ allowed: false });
//   }

//   const endDate = new Date(activeSub.end_date);
//   endDate.setHours(23, 59, 59, 999);

//   if (endDate < now) {
//     activeSub.status = "expired";
//     await activeSub.save();
//     return res.json({ allowed: false, expired: true });
//   }

//   return res.json({
//     allowed: true,
//     source: "student",
//     expiresOn: activeSub.end_date
//   });
// };

export const checkMapAccess = async (req, res) => {
    console.log("🔥🔥 checkMapAccess HIT 🔥🔥");
  try {
    const studentId = req.user?.id;

    // 🔒 Safety check
    if (!studentId) {
      return res.status(401).json({
        allowed: false,
        message: "Unauthorized",
      });
    }

    // const user = await User.findByPk(studentId, {
    //   include: [{ model: Institute }],
    // });

    const user = await User.findByPk(studentId, {
  include: [
    {
      model: Institute,
      as: "Institute",
      attributes: ["id", "mapAccess"],
    },
  ],
});
    console.log("USER INSTITUTE CHECK:", {
  userId: user.id,
  instituteId: user.instituteId,
  institute: user.Institute
});


    if (!user) {
      return res.status(401).json({
        allowed: false,
        message: "User not found",
      });
    }

    // 1️⃣ Institute map enabled → allow all
    if (user.Institute?.mapAccess === true) {
      return res.status(200).json({
        allowed: true,
        source: "institute",
      });
    }

    // 2️⃣ Institute blocked → check student subscription
    const activeSub = await StudentMapSubscription.findOne({
      where: {
        student_id: studentId,
        status: "active",
      },
      order: [["createdAt", "DESC"]],
    });

    // ❌ No subscription → BLOCK
    if (!activeSub) {
      return res.status(403).json({
        allowed: false,
        reason: "SUBSCRIPTION_REQUIRED",
        message: "Institute map access disabled",
      });
    }

    // ❌ Expired → BLOCK
    const now = new Date();
    const endDate = new Date(activeSub.end_date);
    endDate.setHours(23, 59, 59, 999);

    if (endDate < now) {
      activeSub.status = "expired";
      await activeSub.save();

      return res.status(403).json({
        allowed: false,
        message: "Subscription expired",
      });
    }

    // ✅ Paid student → allow
    return res.status(200).json({
      allowed: true,
      source: "student",
      expiresOn: activeSub.end_date,
    });

  } catch (err) {
    console.error("Map access error:", err);
    return res.status(500).json({
      allowed: false,
      message: "Internal server error",
    });
  }
};


/**
 * GET /map/subscription/history
 * Student subscription history
 */
// export const getStudentSubscriptionHistory = async (req, res, next) => {
//   try {
//     const studentId = req.user.id;

//     const subs = await StudentMapSubscription.findAll({
//       where: { student_id: studentId },
//       order: [["createdAt", "DESC"]],
//     });

//     res.json({
//       success: true,
//       subscriptions: subs,
//     });
//   }
export const getStudentSubscriptionHistory = async (req, res, next) => {
  disableCache(res); // ✅ ADD

  const studentId = req.user.id;

  const subs = await StudentMapSubscription.findAll({
    where: { student_id: studentId },
    order: [["createdAt", "DESC"]],
  });

  res.json({ success: true, subscriptions: subs });
};
// catch (err) {
//     next(err);
//   }
// };
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
// export const getAllStudentSubscriptionHistory = async (req, res, next) => {
//   try {
//     // Optional safety check
//     if (req.user.isAdmin !== 1) {
//       return res.status(403).json({ message: "Admin access only" });
//     }

//     const subs = await StudentMapSubscription.findAll({
//       include: [
//         {
//           model: User,
//           attributes: ["id", "full_name", "email", "instituteId"],
//           include: [{ model: Institute, attributes: ["id", "name"] }]
//         }
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     res.json({
//       success: true,
//       subscriptions: subs,
//     });
//   } catch (err) {
//     next(err);
//   }
// };
export const getAllStudentSubscriptionHistory = async (req, res, next) => {
  disableCache(res); // ✅ ADD

  if (req.user.isAdmin !== 1) {
    return res.status(403).json({ message: "Admin access only" });
  }

  // const subs = await StudentMapSubscription.findAll({ ... });
  const subs = await StudentMapSubscription.findAll({
  include: [
    {
      model: User,
      attributes: ["id", "full_name", "email", "instituteId"],
      include: [
        {
          model: Institute,
          attributes: ["id", "name"],
        },
      ],
    },
  ],
  order: [["createdAt", "DESC"]],
});

  res.json({ success: true, subscriptions: subs });
};

export const activateStudentMapSubscriptionInternal = async ({
  studentId,
  planType,
  months,
  amount,
  txnId
}) => {

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

  // Create new subscription
  await StudentMapSubscription.create({
    student_id: studentId,
    plan_type: planType,
    months,
    amount,
    txn_id: txnId,
    start_date: startDate,
    end_date: endDate,
    status: "active",
    autopay_enabled: 0

  });

  return endDate;
};
