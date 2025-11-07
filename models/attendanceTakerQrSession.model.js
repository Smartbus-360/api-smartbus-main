// models/attendanceTakerQrSession.model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AttendanceTakerQrSession = sequelize.define("tbl_sm360_attendance_taker_qr_sessions", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  attendanceTakerId: { type: DataTypes.INTEGER, allowNull: false },
  token: { type: DataTypes.STRING, allowNull: false, unique: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true });

export default AttendanceTakerQrSession;
