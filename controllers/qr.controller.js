import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import QrCode from "../models/qrCode.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

const uploadsDir = path.join(process.cwd(), "uploads/qrcodes");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ✅ Generate QR for a student
export const generateQrForStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const admin = req.user; // fetched from auth middleware

    // Find student belonging to the same institute
    const student = await User.findOne({
      where: { id: studentId, instituteId: admin.instituteId },
    });
    if (!student) return res.status(404).json({ message: "Student not found in your institute" });

    // Generate QR token and image
    const qrToken = uuidv4();
    const qrData = {
      registrationNumber: student.registrationNumber,
      token: qrToken,
    };

    const qrFilePath = path.join(uploadsDir, `${student.registrationNumber}.png`);
    await QRCode.toFile(qrFilePath, JSON.stringify(qrData));

    const qrImageUrl = `/uploads/qrcodes/${student.registrationNumber}.png`;

    // Save or update in DB
    const [record, created] = await QrCode.findOrCreate({
      where: { student_id: student.id },
      defaults: { qr_image_url: qrImageUrl, qr_token: qrToken, is_active: true },
    });

    if (!created) {
      record.qr_image_url = qrImageUrl;
      record.qr_token = qrToken;
      record.is_active = true;
      await record.save();
    }

    return res.status(201).json({
      success: true,
      message: "QR generated successfully",
      qr_image_url: qrImageUrl,
      qr_token: qrToken,
    });
  } catch (err) {
    next(errorHandler(500, err.message || "QR generation failed"));
  }
};

// 🔴 Revoke QR
export const revokeQrForStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const admin = req.user;

    const qrRecord = await QrCode.findOne({
      include: { model: User, where: { instituteId: admin.instituteId } },
      where: { student_id: studentId },
    });

    if (!qrRecord)
      return res.status(404).json({ message: "QR not found or not under your institute" });

    qrRecord.is_active = false;
    await qrRecord.save();

    res.status(200).json({ success: true, message: "QR revoked successfully" });
  } catch (err) {
    next(errorHandler(500, err.message || "QR revocation failed"));
  }
};
