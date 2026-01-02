import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    timezone:'+00:00',
    dialectOptions: {
      useUTC: true,
      // typeCast: true,      // ✅ So Sequelize doesn't convert timestamps to JS UTC Dates
    },
  }
);

export default sequelize;
