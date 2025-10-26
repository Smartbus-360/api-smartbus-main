import express from "express";
import {
  getAttendanceTakers,
  addAttendanceTaker,
  updateAttendanceTaker,
  deleteAttendanceTaker,
  searchAttendanceTakers
} from "../controllers/attendanceTaker.controller.js";
import { httpAuth } from "../middleware/wsAuth.middleware.js";

const router = express.Router();

// Protect all routes for admin usage
router.get("/", httpAuth, getAttendanceTakers);
router.post("/", httpAuth, addAttendanceTaker);
router.put("/:id", httpAuth, updateAttendanceTaker);
router.delete("/:id", httpAuth, deleteAttendanceTaker);
router.get("/search", httpAuth, searchAttendanceTakers);

export default router;
