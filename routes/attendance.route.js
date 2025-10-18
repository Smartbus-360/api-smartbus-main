import express from "express";
import {
  markAttendance,
  getAttendanceByStudent,
  getAttendanceByDate
} from "../controllers/attendance.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";

const router = express.Router();

// Mark attendance (already used by driver)
router.post("/mark", markAttendance);

// Get attendance by student registration number
router.get("/student/:registrationNumber", httpAuth, getAttendanceByStudent);

// Get attendance by date (optional)
router.get("/date/:date", httpAuth, getAttendanceByDate);

export default router;
