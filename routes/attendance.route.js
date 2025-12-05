import express from "express";
import {
  markAttendance,
  getAttendanceByStudent,
  getAttendanceByDate,
  getMyAttendance,
   getTakerTempAttendance,
  getUnreadAttendanceCount,
  addAttendanceNote
} from "../controllers/attendance.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";
import { verifyToken } from "../utils/verifyUser.js";
console.log("🔥 attendance.route.js LOADED");

const router = express.Router();

// attendance.route.js (fixed)
router.get("/student/self", httpAuth, getMyAttendance);  // must come FIRST
router.get("/student/:registrationNumber", httpAuth, getAttendanceByStudent);
router.get("/attendance/:registrationNumber", getAttendanceByStudent);
router.get("/date/:date", httpAuth, getAttendanceByDate);
router.post("/mark", markAttendance);
router.get("/taker-sheet/:takerId", getTakerTempAttendance);
router.get("/unread-count", verifyToken, getUnreadAttendanceCount);
router.post("/add-note", addAttendanceNote);


export default router;


