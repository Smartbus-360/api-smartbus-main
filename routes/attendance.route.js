import express from "express";
import {
  markAttendance,
  getAttendanceByStudent,
  getAttendanceByDate,
  getMyAttendance,
} from "../controllers/attendance.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";

// const router = express.Router();

// // Mark attendance (already used by driver)
// router.post("/mark", markAttendance);

// // Get attendance by student registration number
// router.get("/student/:registrationNumber", httpAuth, getAttendanceByStudent);
// router.get("/attendance/:registrationNumber", getAttendanceByStudent);


// // Get attendance by date (optional)
// router.get("/date/:date", httpAuth, getAttendanceByDate);
// router.get("/student/self", httpAuth, getMyAttendance);


// export default router;

const router = express.Router();

// ✅ Correct order — static route before param route
router.get("/student/self", httpAuth, getMyAttendance);
router.get("/student/:registrationNumber", httpAuth, getAttendanceByStudent);
router.get("/attendance/:registrationNumber", getAttendanceByStudent);

router.post("/mark", markAttendance);
router.get("/date/:date", httpAuth, getAttendanceByDate);

export default router;
