import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./user.model.js";

const StudentMapSubscription = sequelize.define("student_map_subscriptions", {
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // references: {
    //   model: User,
    //   key: "id",
    // },
  },
  plan_type: {
    type: DataTypes.ENUM("monthly", "yearly"),
    allowNull: false,
  },
  months: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  txn_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "expired","revoked"),
    defaultValue: "active",
  },
  razorpay_subscription_id: {
  type: DataTypes.STRING,
  allowNull: true,
},

razorpay_customer_id: {
  type: DataTypes.STRING,
  allowNull: true,
},

autopay_enabled: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
}

}, { timestamps: true });

export default StudentMapSubscription;
