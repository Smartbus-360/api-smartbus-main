// import express from "express";
// import {
//   getAttendanceTakers,
//   addAttendanceTaker,
//   updateAttendanceTaker,
//   deleteAttendanceTaker,
//   searchAttendanceTakers
// } from "../controllers/attendanceTaker.controller.js";
// import { httpAuth } from "../middleware/wsAuth.middleware.js";

// const router = express.Router();

// // Protect all routes for admin usage
// router.get("/", httpAuth, getAttendanceTakers);
// router.post("/", httpAuth, addAttendanceTaker);
// router.put("/:id", httpAuth, updateAttendanceTaker);
// router.delete("/:id", httpAuth, deleteAttendanceTaker);
// router.get("/search", httpAuth, searchAttendanceTakers);

// export default router;

import express from "express";
import {
  getAttendanceTakers,
  addAttendanceTaker,
  updateAttendanceTaker,
  deleteAttendanceTaker,
  searchAttendanceTakers,
  generateQrForTaker,
  qrLoginAttendanceTaker,
  revokeQrSession
} from "../controllers/attendanceTaker.controller.js";
import { verifyToken } from "../utils/verifyUser.js"; // ✅ use same middleware as other admin routes

const router = express.Router();

// ✅ Protect all Attendance-Taker routes with JWT verification
router.get("/", verifyToken, getAttendanceTakers);
router.post("/", verifyToken, addAttendanceTaker);
router.put("/:id", verifyToken, updateAttendanceTaker);
router.delete("/:id", verifyToken, deleteAttendanceTaker);
router.get("/search", verifyToken, searchAttendanceTakers);
router.post("/generate-qr", verifyToken, generateQrForTaker);
router.post("/qr-login", qrLoginAttendanceTaker);
router.post("/revoke-qr", verifyToken, revokeQrSession);

export default router;
