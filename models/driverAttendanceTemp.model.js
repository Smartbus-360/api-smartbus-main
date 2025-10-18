import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DriverAttendanceTemp = sequelize.define('tbl_sm360_driver_attendance_temp', {
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
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
}, {
  timestamps: true,
  tableName: 'tbl_sm360_driver_attendance_temp',
});

export default DriverAttendanceTemp;
