import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const PaymentTransaction = sequelize.define("payment_transactions", {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  razorpay_order_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  razorpay_payment_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },

  razorpay_signature: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  purpose: {
    type: DataTypes.STRING, // "map_subscription"
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM("created", "paid", "failed"),
    defaultValue: "created",
  }
}, { timestamps: true });

export default PaymentTransaction;
