import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Institute from "./institute.model.js";

const Teacher = sequelize.define("tbl_sm360_teachers", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  instituteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Institute, key: "id" },
  },
  token: { type: DataTypes.STRING },
  lastLogin: { type: DataTypes.DATE },
}, {
  timestamps: true,
});

export default Teacher;
