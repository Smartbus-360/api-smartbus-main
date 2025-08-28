// utils/qrOverride.js
import { Op } from "sequelize";
import DriverQrToken from "../models/driverQrToken.model.js";

export async function findActiveQrOverride(driverId) {
  if (!driverId) return null;
  const now = new Date();
  return await DriverQrToken.findOne({
    where: {
      originalDriverId: driverId,
      status: { [Op.in]: ["active", "used"] },
      expiresAt: { [Op.gt]: now },
    },
    order: [["expiresAt", "DESC"]],
  });
}
