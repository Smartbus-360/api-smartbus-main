import express from "express";
import { loginUser, loginDriver, signupUser, signupDriver, getUserDetails, getDriverDetails, updateReachDateTime, notifyIfSpeedExceeded, markMissedStop, markFinalStopReached, getReachTimesForRoute } from "../controllers/api.controller.js";
import { generateAdBanner } from "../controllers/advertisement.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";
import { canViewMap } from "../middleware/wsAuth.middleware.js";
import { checkBusReplacement } from "../controllers/bus.controller.js";
import { getNotifications, getBusNotifications } from "../controllers/notification.controller.js";
import { oneTimeLogin } from "../controllers/auth.controller.js";


const apiRouter = express.Router();

apiRouter.post("/login/user",  loginUser);
apiRouter.post("/login/driver", loginDriver);
apiRouter.post("/signup/driver", signupUser);
apiRouter.post("/signup/user", signupDriver);
apiRouter.get("/user/details/:id", httpAuth, getUserDetails);
apiRouter.get("/driver/details/:id", httpAuth, getDriverDetails);
// ⬇️ put this near your other routes
apiRouter.get("/map/access-check", httpAuth, canViewMap, (req, res) => {
  return res.status(204).end(); // 204 when map is allowed
});
apiRouter.post("/stoppage/reached", httpAuth,canViewMap, updateReachDateTime); 
apiRouter.post("/notify/speed", httpAuth,canViewMap, notifyIfSpeedExceeded);
apiRouter.get("/advertisement/banner", generateAdBanner);
apiRouter.get("/bus/replacement/:busId", httpAuth,canViewMap, checkBusReplacement);
apiRouter.post("/missed-stoppage", httpAuth,canViewMap, markMissedStop);
apiRouter.post("/mark-final-stop",httpAuth,canViewMap, markFinalStopReached);
apiRouter.get("/reach-times/:route", httpAuth,canViewMap ,getReachTimesForRoute);
apiRouter.get("/notifications", httpAuth,getNotifications);
apiRouter.get("/bus-notifications", httpAuth, getBusNotifications);
apiRouter.post('/one-time-login', oneTimeLogin);

export default apiRouter;
