import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

// ❌ Remove direct import — it causes circular reference on startup
// import AttendanceTaker from "./attendanceTaker.model.js";

// ✅ Define model first
const AttendanceTakerAttendanceTemp = sequelize.define(
  "AttendanceTakerAttendanceTemp",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    registrationNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    instituteName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    attendance_taker_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "tbl_sm360_attendance_takers", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    bus_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    scan_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: "tbl_sm360_driver_attendance_temp",
  }
);

// ✅ Lazy associate pattern — no circular import
AttendanceTakerAttendanceTemp.associate = (models) => {
  AttendanceTakerAttendanceTemp.belongsTo(models.AttendanceTaker, {
    foreignKey: "attendance_taker_id",
    as: "attendanceTaker",
  });
};

export default AttendanceTakerAttendanceTemp;
