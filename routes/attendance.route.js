import express from "express";
import {
  markAttendance,
  getAttendanceByStudent,
  getAttendanceByDate,
  getMyAttendance,
} from "../controllers/attendance.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";

const router = express.Router();

// attendance.route.js (fixed)
router.get("/student/self", httpAuth, getMyAttendance);  // must come FIRST
router.get("/student/:registrationNumber", httpAuth, getAttendanceByStudent);
router.get("/attendance/:registrationNumber", getAttendanceByStudent);
router.get("/date/:date", httpAuth, getAttendanceByDate);


export default router;


