// import { DataTypes } from 'sequelize';
// import sequelize from '../config/database.js';
// import AttendanceTaker from "./attendanceTaker.model.js";

// const AttendanceTakerAttendanceTemp = sequelize.define('tbl_sm360_driver_attendance_temp', {
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   registrationNumber: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   username: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   instituteName: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   attendance_taker_id: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//     references: { model: "tbl_sm360_attendance_takers", key: "id" },
//     onUpdate: "CASCADE",
//     onDelete: "SET NULL",
//   },
//   bus_id: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   latitude: {
//     type: DataTypes.FLOAT,
//     allowNull: true,
//   },
//   longitude: {
//     type: DataTypes.FLOAT,
//     allowNull: true,
//   },
//   scan_time: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW,
//   },
// }, {
//   timestamps: true,
//   tableName: 'tbl_sm360_driver_attendance_temp',
// });

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AttendanceTakerAttendanceTemp = sequelize.define(
  "tbl_sm360_driver_attendance_temp",
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
    attendance_taker: {
      type: DataTypes.STRING, // ✅ plain text (no foreign key)
      allowNull: true,
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

export default AttendanceTakerAttendanceTemp;


export default AttendanceTakerAttendanceTemp;


// export default AttendanceTakerAttendanceTemp;
