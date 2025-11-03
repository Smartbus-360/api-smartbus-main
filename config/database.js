// import { Sequelize } from 'sequelize';
// import dotenv from 'dotenv';

// dotenv.config();

// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST,
//     dialect: 'mysql',
//     logging: false,
//     timezone: "+05:30", // IST
//   }
// );

// export default sequelize;

import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,  // ✅ ensure port is passed
    dialect: "mysql",
    dialectOptions: {
      connectTimeout: 20000, // 20s to wait before timeout
    },
    logging: false,
    timezone: "+05:30",
  }
);

// Test connection when app starts
sequelize.authenticate()
  .then(() => console.log("✅ MySQL Database Connected"))
  .catch(err => console.error("❌ MySQL Connection Error:", err.message));

export default sequelize;
