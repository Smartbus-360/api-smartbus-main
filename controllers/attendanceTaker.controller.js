import AttendanceTaker from "../models/attendanceTaker.model.js";
import bcrypt from "bcrypt";
import { errorHandler } from "../utils/error.js";
import { Op } from "sequelize";

/**
 * 📋 Get all attendance-takers
 */
export const getAttendanceTakers = async (req, res, next) => {
  try {
    const takers = await AttendanceTaker.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json(takers);
  } catch (error) {
    next(errorHandler(500, error.message || "Error fetching attendance-takers"));
  }
};

/**
 * ➕ Add new attendance-taker
 */
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
