import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MapSubscriptionPlan = sequelize.define("map_subscription_plans", {
  plan_type: {
    type: DataTypes.ENUM("monthly", "yearly"),
    allowNull: false,
    unique: true,
  },
  price_per_month: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  razorpay_plan_id: {
  type: DataTypes.STRING,
  allowNull: true,
},

billing_cycle: {
  type: DataTypes.ENUM("monthly", "yearly"),
  defaultValue: "monthly",
},

}, { timestamps: true });

export default MapSubscriptionPlan;
