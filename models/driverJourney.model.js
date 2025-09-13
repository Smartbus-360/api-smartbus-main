import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Driver from './driver.model.js';

const DriverJourney = sequelize.define('tbl_sm360_driver_journeys', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  driverId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Driver, key: 'id' } },
  phase: { type: DataTypes.ENUM('morning', 'afternoon', 'evening'), allowNull: false },
  round: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false }, // e.g. "Moving to next round", "Reset stopHitCount"
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: true });

export default DriverJourney;
