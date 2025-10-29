import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

// ✅ No import of AttendanceTaker here!

const AttendanceTakerAttendanceTemp = sequelize.define(
  "AttendanceTakerAttendanceTemp",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    registrationNumber: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING },
    instituteName: { type: DataTypes.STRING },
    attendance_taker_id: {
      type: DataTypes.INTEGER,
      references: { model: "tbl_sm360_attendance_takers", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    bus_id: { type: DataTypes.STRING },
    latitude: { type: DataTypes.FLOAT },
    longitude: { type: DataTypes.FLOAT },
    scan_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "tbl_sm360_driver_attendance_temp",
    timestamps: true,
  }
);

// ✅ DO NOT call belongsTo here!
// Association will be created in models/index.js instead.

export default AttendanceTakerAttendanceTemp;
