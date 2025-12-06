import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Institute from './institute.model.js';

const AttendanceTaker = sequelize.define('tbl_sm360_attendance_takers', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  instituteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Institute, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  availabilityStatus: {
    type: DataTypes.ENUM('Available', 'Unavailable'),
    allowNull: false,
    defaultValue: 'Available',
  },
  role: {
    type: DataTypes.ENUM("taker", "teacher"),  // 👈 ADDED
    defaultValue: "taker",
  },

  token: { type: DataTypes.STRING, allowNull: true },
  lastLogin: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true });

export default AttendanceTaker;
