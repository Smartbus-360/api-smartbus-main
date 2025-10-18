import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./user.model.js";

const QrCode = sequelize.define("tbl_sm360_qr_codes", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: "id" },
    onDelete: "CASCADE",
  },
  qr_image_url: { type: DataTypes.STRING, allowNull: true },
  qr_token: { type: DataTypes.STRING, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { timestamps: true });

export default QrCode;
