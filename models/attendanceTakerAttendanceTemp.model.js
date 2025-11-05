import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AttendanceTakerAttendanceTemp = sequelize.define(
  "tbl_sm360_attendance_taker_attendance_temp",
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
    student_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: "tbl_sm360_users", key: "id" },
  onUpdate: "CASCADE",
  onDelete: "SET NULL",
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
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

  },
  {
freezeTableName: true,          
    timestamps: true,              
    tableName: "tbl_sm360_attendance_taker_attendance_temp",
  }
);

export default AttendanceTakerAttendanceTemp;
