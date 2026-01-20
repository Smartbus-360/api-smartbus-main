import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DriverQrToken = sequelize.define('tbl_sm360_driver_qr_tokens', {
  originalDriverId: { type: DataTypes.INTEGER, allowNull: false },
  subDriverId:      { type: DataTypes.INTEGER, allowNull: true },
  busId:            { type: DataTypes.INTEGER, allowNull: true  },
  token:            { type: DataTypes.STRING(128), allowNull: false, unique: true },
  // expiresAt:        { type: DataTypes.DATE, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  maxUses:          { type: DataTypes.INTEGER, defaultValue: 1 },
  usedCount:        { type: DataTypes.INTEGER, defaultValue: 0 },
  status:           { type: DataTypes.ENUM('active','used','revoked','expired'), defaultValue: 'active' },
    createdBy:        { type: DataTypes.INTEGER, allowNull: false }

}, { timestamps: true });

export default DriverQrToken;
