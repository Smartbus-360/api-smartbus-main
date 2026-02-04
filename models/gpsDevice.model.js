import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const GPSDevice = sequelize.define(
    "tbl_sm360_gps_devices",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        imei: {
            type: DataTypes.STRING(20),
            unique: true,
            allowNull: false
        },
        busId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        driverId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        deviceModel: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        installedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        timestamps: false
    }
);

export default GPSDevice;
