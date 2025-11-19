import express from "express";
import { loginUser, loginDriver, signupUser, signupDriver, getUserDetails, getDriverDetails, updateReachDateTime, notifyIfSpeedExceeded, markMissedStop,markFinalStopReached  ,getReachTimesForRoute ,logoutUser} from "../controllers/api.controller.js";
import { updateShift } from "../controllers/api.controller.js";
import { generateAdBanner } from "../controllers/advertisement.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";
import { canViewMap } from "../middleware/wsAuth.middleware.js";
import { checkBusReplacement } from "../controllers/bus.controller.js";
import { getNotifications, getBusNotifications } from "../controllers/notification.controller.js";
import { oneTimeLogin } from "../controllers/auth.controller.js";
import {
      // POST /drivers/:id/subdriver
  generateDriverQr,       // POST /driver-qr/generate
  exchangeDriverQr,       // POST /driver-qr/exchange
  revokeDriverQr          // POST /driver-qr/revoke/:id
} from "../controllers/driverQr.controller.js";
import { getDriverSelf } from "../controllers/driver.controller.js";
import { markStopReached } from "../controllers/stoppage.controller.js";
import attendanceRoutes from "./attendance.route.js";
import { loginAttendanceTaker } from "../controllers/api.controller.js";



const apiRouter = express.Router();

apiRouter.post("/login/user",  loginUser);
apiRouter.post("/login/driver", loginDriver);
apiRouter.post("/login/attendance-taker", loginAttendanceTaker);
apiRouter.post("/signup/driver", signupUser);
apiRouter.post("/signup/user", signupDriver);
apiRouter.get("/user/details/:id", httpAuth, getUserDetails);
apiRouter.get("/driver/details/:id", httpAuth, getDriverDetails);
apiRouter.get("/driver/self", httpAuth, getDriverSelf);
apiRouter.post("/logout/user", httpAuth, logoutUser);
apiRouter.use("/attendance", attendanceRoutes);
apiRouter.post("/update-shift", updateShift);




// ⬇️ put this near your other routes
apiRouter.get("/map/access-check", httpAuth, canViewMap, (req, res) => {
  return res.status(204).end(); // 204 when map is allowed
});
apiRouter.post("/stoppage/reached", httpAuth, updateReachDateTime); 
apiRouter.post("/notify/speed", httpAuth, notifyIfSpeedExceeded);
apiRouter.get("/advertisement/banner", generateAdBanner);
apiRouter.get("/bus/replacement/:busId", httpAuth, checkBusReplacement);
apiRouter.post("/missed-stoppage", httpAuth, markMissedStop);
apiRouter.post("/mark-final-stop",httpAuth, markFinalStopReached);
// apiRouter.post("/mark-final-stop-noauth", markFinalStopNoAuth);
apiRouter.get("/reach-times/:route", httpAuth ,getReachTimesForRoute);
apiRouter.get("/notifications", httpAuth,getNotifications);
apiRouter.get("/bus-notifications", httpAuth, getBusNotifications);
apiRouter.post("/driver-qr/generate",    httpAuth, generateDriverQr);
apiRouter.post("/driver-qr/exchange",                 exchangeDriverQr); // no auth; token is the auth
apiRouter.post("/driver-qr/revoke/:id",  httpAuth, revokeDriverQr);
apiRouter.post('/one-time-login', oneTimeLogin);
// apiRouter.post("/auth/refresh", refreshAccessToken);
// apiRouter.post("/auth/logout", httpAuth, logout);
apiRouter.post("/stoppage/reached", httpAuth, markStopReached);
// apiRouter.get("/stoppage/last", httpAuth, getLastReachedStop);





export default apiRouter;
