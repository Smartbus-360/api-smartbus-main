import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const HomeContent = sequelize.define(
  "HomeContent",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    type: {
      // "logo" | "article"
      type: DataTypes.ENUM("logo", "article"),
      allowNull: false,
    },

    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    instituteId: {
      // optional: link content to a school
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // 🔐 not visible until published
    },

    createdBy: {
      // superadmin user id
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "tbl_sm360_home_content",
    timestamps: true,
  }
);

export default HomeContent;
