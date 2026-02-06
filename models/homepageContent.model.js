import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const HomepageContent = sequelize.define(
  "HomepageContent",
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("LOGO", "ARTICLE"),
      allowNull: false,
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "tbl_sm360_homepage_content",
    timestamps: true,
  }
);

export default HomepageContent;
