import AttendanceTaker from "../models/attendanceTaker.model.js";
import bcrypt from "bcrypt";
import { errorHandler } from "../utils/error.js";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import AttendanceTakerQrSession from "../models/attendanceTakerQrSession.model.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;


export const getAttendanceTakers = async (req, res, next) => {
  try {
    const takers = await AttendanceTaker.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json(takers);
  } catch (error) {
    next(errorHandler(500, error.message || "Error fetching attendance-takers"));
  }
};

export const addAttendanceTaker = async (req, res, next) => {
  try {
    const { name, email, password, phone, instituteId } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email, and password are required" });

    const existing = await AttendanceTaker.findOne({ where: { email } });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newTaker = await AttendanceTaker.create({
      name,
      email,
      password: hashed,
      phone,
      instituteId,
    });

    res.status(201).json({ success: true, message: "Attendance-Taker added successfully", data: newTaker });
  } catch (error) {
    next(errorHandler(500, error.message || "Error adding attendance-taker"));
  }
};

/**
 * ✏️ Update attendance-taker
 */
export const updateAttendanceTaker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, availabilityStatus } = req.body;

    const taker = await AttendanceTaker.findByPk(id);
    if (!taker) return res.status(404).json({ message: "Attendance-Taker not found" });

    await taker.update({ name, email, phone, availabilityStatus });
    res.status(200).json({ success: true, message: "Attendance-Taker updated", data: taker });
  } catch (error) {
    next(errorHandler(500, error.message || "Error updating attendance-taker"));
  }
};

/**
 * ❌ Delete attendance-taker
 */
export const deleteAttendanceTaker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taker = await AttendanceTaker.findByPk(id);
    if (!taker) return res.status(404).json({ message: "Attendance-Taker not found" });

    await taker.destroy();
    res.status(200).json({ success: true, message: "Attendance-Taker deleted successfully" });
  } catch (error) {
    next(errorHandler(500, error.message || "Error deleting attendance-taker"));
  }
};

/**
 * 🔍 Search attendance-takers
 */
export const searchAttendanceTakers = async (req, res, next) => {
  try {
    const { query } = req.query;
    const takers = await AttendanceTaker.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { phone: { [Op.like]: `%${query}%` } },
        ],
      },
    });
    res.status(200).json(takers);
  } catch (error) {
    next(errorHandler(500, error.message || "Error searching attendance-takers"));
  }
};
/**
 * 🧾 Admin: Generate QR for an attendance taker
 */
export const generateQrForTaker = async (req, res, next) => {
  try {
    const { attendanceTakerId } = req.body;

    if (!attendanceTakerId)
      return res.status(400).json({ message: "attendanceTakerId required" });

    const token = crypto.randomUUID();
    await AttendanceTakerQrSession.update(
      { isActive: false, revokedAt: new Date() },
      { where: { attendanceTakerId, isActive: true } }
    );

    const newSession = await AttendanceTakerQrSession.create({
      attendanceTakerId,
      token,
      expiresAt: null,
    });

    // const qrData = `${process.env.SITE_URL}/api/attendance-taker/qr-login?token=${token}`;

    const BASE_URL = process.env.SITE_URL || "https://api.smartbus360.com"; // ✅ fallback
const qrData = `${BASE_URL}/api/attendance-taker/qr-login?token=${token}`;

    res.json({
      success: true,
      message: "QR generated successfully",
      data: { token, qrData },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 🔑 QR-based login for Attendance Taker
 */
export const qrLoginAttendanceTaker = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ message: "QR token missing" });

    const session = await AttendanceTakerQrSession.findOne({ where: { token, isActive: true } });
    if (!session)
      return res.status(401).json({ message: "Invalid or revoked QR" });

    const taker = await AttendanceTaker.findByPk(session.attendanceTakerId);
    if (!taker) return res.status(404).json({ message: "Attendance Taker not found" });

    const jwtToken = jwt.sign(
      { id: taker.id, role: "attendance_taker" },
      JWT_SECRET
    );

    taker.token = jwtToken;
    taker.lastLogin = new Date();
    await taker.save();

    res.json({
      success: true,
      message: "QR login successful",
      token: jwtToken,
      attendanceTakerId: taker.id,
      name: taker.name,
      email: taker.email,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 🚫 Admin: Revoke an active QR session
 */
export const revokeQrSession = async (req, res, next) => {
  try {
    const { attendanceTakerId } = req.body;

    if (!attendanceTakerId)
      return res.status(400).json({ message: "attendanceTakerId required" });

    await AttendanceTakerQrSession.update(
      { isActive: false, revokedAt: new Date() },
      { where: { attendanceTakerId, isActive: true } }
    );

    res.json({ success: true, message: "QR session revoked successfully" });
  } catch (error) {
    next(error);
  }
};

