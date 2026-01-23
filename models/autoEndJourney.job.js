// // /**
// //  * AUTO END JOURNEY JOB
// //  * -------------------
// //  * Purpose:
// //  * Automatically mark journey as finished when route endTime is crossed.
// //  *
// //  * IMPORTANT:
// //  * - Does NOT change existing logic
// //  * - Calls the SAME logic used by "Mark Journey Finished"
// //  * - Runs silently in background
// //  */

// // import cron from "node-cron";
// // import { Op } from "sequelize";
// // import Route from "../models/route.model.js";
// // import { markFinalStopReached } from "../controllers/api.controller.js";

// // /**
// //  * Helper to create a fake req/res
// //  * so we can safely reuse existing controller logic
// //  */
// // const createFakeReqRes = (routeId) => {
// //   const req = {
// //     body: { routeId },
// //     user: { id: null, role: "system" }, // system-triggered
// //   };

// //   const res = {
// //     status: () => res,
// //     json: () => null,
// //   };

// //   return { req, res };
// // };

// // /**
// //  * CRON JOB
// //  * Runs every 1 minute
// //  */
// // cron.schedule("* * * * *", async () => {
// //       console.log("🟡 [AUTO-END] Job tick at", new Date().toLocaleString());
// //   try {
// //     const now = new Date();

// //     // Fetch only ACTIVE journeys
// //     const activeRoutes = await Route.findAll({
// //       where: {
// //         endTime: { [Op.ne]: null },
// //         finalStopReached: { [Op.ne]: 1 },
// //         isActive: true,
// //       },
// //     });

// //     console.log(
// //   `🔍 [AUTO-END] Active routes found: ${activeRoutes.length}`
// // );

// //     for (const route of activeRoutes) {
// //           console.log(
// //     `➡️ [AUTO-END] Checking route ${route.id}, endTime=${route.endTime}`
// //   );
// //       if (!route.endTime) continue;

// //       // Convert endTime to today datetime
// //       const [h, m, s] = route.endTime.split(":");
// //       // const routeEnd = new Date(now);
// //       const TIMEZONE = "Asia/Kolkata";

// // const now = new Date(
// //   new Date().toLocaleString("en-US", { timeZone: TIMEZONE })
// // );

// // // Convert endTime (LOCAL) to today LOCAL datetime
// // const [h, m, s] = route.endTime.split(":");
// // const routeEnd = new Date(now);
// // routeEnd.setHours(Number(h), Number(m), Number(s || 0), 0);

// // console.log(
// //   `🕒 [AUTO-END] Route ${route.id} | now=${now.toLocaleTimeString()} | routeEnd=${routeEnd.toLocaleTimeString()}`
// // );

// // if (now < routeEnd) {
// //   console.log(`⏭️ [AUTO-END] Route ${route.id} not finished yet`);
// //   continue;
// // }

// // // routeEnd.setHours(Number(h), Number(m), Number(s || 0), 0);
// // // console.log(
// // //   `🕒 [AUTO-END] Route ${route.id} | now=${now.toTimeString()} | routeEnd=${routeEnd.toTimeString()}`
// // // );

// // //       // Skip if end time not crossed
// // //       if (now < routeEnd) {
// // //           console.log(`⏭️ [AUTO-END] Route ${route.id} not finished yet`);
// // // continue;
// // //       }

// //       // 🔥 AUTO END JOURNEY (reuse existing logic)
// //       const { req, res } = createFakeReqRes(route.id);

// //       await markFinalStopReached(req, res);

// //       console.log(
// //         `[AUTO-END] Route ${route.id} ended automatically at ${now.toISOString()}`
// //       );
// //     }
// //   } catch (err) {
// //     console.error("[AUTO-END-JOURNEY] Job failed:", err);
// //   }
// // });

/**
 * AUTO END JOURNEY JOB
 * -------------------
 * Purpose:
 * Automatically mark journey as finished when route endTime is crossed.
 */

import cron from "node-cron";
import { Op } from "sequelize";
import Route from "../models/route.model.js";
import { markFinalStopReached } from "../controllers/api.controller.js";

const TIMEZONE = "Asia/Kolkata";

/**
 * Helper to create a fake req/res
 */
const createFakeReqRes = (routeId) => {
  const req = {
    body: { routeId },
    user: { id: null, role: "system" },
  };

  const res = {
    status: () => res,
    json: () => null,
  };

  return { req, res };
};

/**
 * CRON JOB
 * Runs every 1 minute
 */
cron.schedule("* * * * *", async () => {
  try {
    // 🔑 Force LOCAL time regardless of server timezone
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: TIMEZONE })
    );

    console.log("🟡 [AUTO-END] Job tick at", now.toLocaleString());

    const activeRoutes = await Route.findAll({
      where: {
        endTime: { [Op.ne]: null },
        finalStopReached: { [Op.ne]: 1 },
        isActive: true,
      },
    });

    console.log(
      `🔍 [AUTO-END] Active routes found: ${activeRoutes.length}`
    );

    for (const route of activeRoutes) {
      console.log(
        `➡️ [AUTO-END] Checking route ${route.id}, endTime=${route.endTime}`
      );

      // if (!route.endTime) continue;

      // // Convert route endTime (LOCAL) to today LOCAL datetime
      // const [h, m, s] = route.endTime.split(":");
      // const routeEnd = new Date(now);
      // routeEnd.setHours(Number(h), Number(m), Number(s || 0), 0);

      // console.log(
      //   `🕒 [AUTO-END] Route ${route.id} | now=${now.toLocaleTimeString()} | routeEnd=${routeEnd.toLocaleTimeString()}`
      // );

      // // Skip if end time not crossed
      // if (now < routeEnd) {
      //   console.log(`⏭️ [AUTO-END] Route ${route.id} not finished yet`);
      //   continue;
      // }
      // ✅ Get current shift + round timing from route
const phase = route.currentJourneyPhase;
const round = route.currentRound;

const timing =
  route.shiftTimings?.[phase]?.rounds?.[round];

if (!timing) {
  console.log(
    `⚠️ [AUTO-END] No timing found for route ${route.id} | ${phase} Round ${round}`
  );
  continue;
}

// Convert timing.end (HH:mm) to today IST datetime
const [h, m] = timing.end.split(":");
const roundEnd = new Date(now);
roundEnd.setHours(Number(h), Number(m), 0, 0);

console.log(
  `🕒 [AUTO-END] Route ${route.id} | now=${now.toLocaleTimeString()} | roundEnd=${roundEnd.toLocaleTimeString()}`
);

// ⏭️ Skip if round not finished yet
if (now < roundEnd) {
  console.log(
    `⏭️ [AUTO-END] ${phase} Round ${round} still active`
  );
  continue;
}

// 🔥 Auto end journey using SAME controller as button
const { req, res } = createFakeReqRes(route.id);
await markFinalStopReached(req, res);

console.log(
  `🏁 [AUTO-END] Route ${route.id} auto-ended for ${phase} Round ${round}`
);


      // 🔥 AUTO END JOURNEY
      const { req, res } = createFakeReqRes(route.id);
      await markFinalStopReached(req, res);

      console.log(
        `✅ [AUTO-END] Route ${route.id} ended automatically`
      );
    }
  } catch (err) {
    console.error("[AUTO-END-JOURNEY] Job failed:", err);
  }
});

