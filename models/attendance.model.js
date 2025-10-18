import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Driver from './driver.model.js';
import User from './user.model.js';

const Attendance = sequelize.define('tbl_sm360_attendance', {
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
    references: { model: User, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Driver, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  bus_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  scan_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'tbl_sm360_attendance'
});

export default Attendance;
