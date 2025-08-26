import { nanoid } from "nanoid";
import QRCode from "qrcode";
import sequelize from "../config/database.js";
import Driver from "../models/driver.model.js";
import DriverQrToken from "../models/driverQrToken.model.js";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { QueryTypes } from "sequelize";   // safer than sequelize.QueryTypes



// 4.1 Create a sub-driver linked to a main driver
export const createSubDriver = async (req, res) => {
  const mainDriverId = Number(req.params.id);
  const { name, email, phone, password, instituteId } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: "Password required" });
  }

    const hashed = await bcryptjs.hash(password, 10);

  const sub = await Driver.create({
    name, email, phone,
    password : hashed,                // hash like your normal addDriver flow
    instituteId,
    parentDriverId: mainDriverId,
    isSubdriver: true,
    availabilityStatus: 'Available'
  });

  res.json({ success: true, subDriver: sub });
};

// 4.2 Generate QR
export const generateDriverQr = async (req, res) => {
  try {
    const { originalDriverId, subDriverId, durationHours } = req.body;
    const createdBy = Number(req.user?.id) || null; // admin id from verifyToken

    // ✅ basic validation
    if (!originalDriverId || !subDriverId) {
      return res.status(400).json({ success: false, message: "originalDriverId and subDriverId are required" });
    }
    if (!Number.isFinite(+durationHours) || +durationHours <= 0) {
      return res.status(400).json({ success: false, message: "durationHours must be > 0" });
    }

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + Number(durationHours) * 3600 * 1000);

    // ✅ busId not used anymore; keep null
    const row = await DriverQrToken.create({
      originalDriverId,
      subDriverId,
      busId: null,
      token,
      expiresAt,
      maxUses: 1,
      createdBy,
    });

    const link = `smartbus360://qr-login?token=${token}`;
    const png = await QRCode.toDataURL(link);

    return res.json({ success: true, id: row.id, link, png, expiresAt });
  } catch (err) {
    console.error("[QR-GENERATE] error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 4.3 Exchange QR for a Driver JWT (called by the Driver app after scanning)
export const exchangeDriverQr = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    // 1) Find an ACTIVE token
    const row = await DriverQrToken.findOne({ where: { token, status: 'active' } });
    if (!row) {
      return res.status(400).json({ success: false, message: "Invalid/used token" });
    }

    // 2) Expiry check
    const now = new Date();
    if (now > row.expiresAt) {
      // mark as expired for bookkeeping
      row.status = 'expired';
      await row.save();
      return res.status(400).json({ success: false, message: "Token expired" });
    }

    // 3) If this QR is tied to a bus, write a replacement row (sub-driver takes over temporarily)

    // 4) Mint a normal Driver JWT (INCLUDE id)
    const sub = await Driver.findByPk(row.subDriverId);
    if (!sub) {
      return res.status(400).json({ success: false, message: "Sub driver not found" });
    }
    // Ensure this sub-driver actually belongs to the original driver and is flagged as a subdriver
if (sub.parentDriverId !== row.originalDriverId || !sub.isSubdriver) {
  return res.status(400).json({ success: false, message: "Invalid sub-driver mapping" });
}


const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
  return res.status(500).json({ success: false, message: "Server misconfig: JWT_SECRET missing" });
}
   const secondsLeft = Math.max(1, Math.floor((new Date(row.expiresAt) - Date.now()) / 1000));
   const driverJwt = jwt.sign(
     { id: sub.id, email: sub.email, role: 'driver', qr: true },
     JWT_SECRET,
     { expiresIn: secondsLeft }
   );
    const decoded = jwt.decode(driverJwt);
console.log('[QR-EXCHANGE] issued token for driver', sub.id,
            'exp=', new Date(decoded.exp * 1000).toISOString());


    // 5) Persist token like normal driver login
     await sequelize.query(
       `UPDATE tbl_sm360_drivers SET token = :t, lastLogin = NOW() WHERE id = :id`,
       { replacements: { t: driverJwt, id: sub.id }, type: QueryTypes.UPDATE }
     );
await sequelize.query(
     `UPDATE tbl_sm360_drivers SET token = NULL WHERE id = :id`,
     { replacements: { id: row.originalDriverId }, type: QueryTypes.UPDATE }
    );

    // 6) Mark this QR token as used (+count)
// 6) Mark as used in a race-safe way (avoids double use if two scans race)
const updated = await DriverQrToken.update(
  { status: 'used', usedCount: (row.usedCount ?? 0) + 1 },
  { where: { id: row.id, status: 'active' } }
);
if (!updated[0]) {
  return res.status(409).json({ success: false, message: "Token already used" });
}

    // 7) Return a payload that mirrors /login/driver
    return res.json({
      success: true,
      driverId: sub.id,
      driverName: sub.name ?? "",
      email: sub.email ?? "",
      token: driverJwt
    });
  } catch (err) {
    console.error("exchangeDriverQr error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 4.4 Admin can revoke a QR before it’s used
export const revokeDriverQr = async (req, res) => {
  const { id } = req.params;
  await DriverQrToken.update({ status: 'revoked' }, { where: { id }});
  res.json({ success: true });
};
// List sub-drivers of a main driver
export const listSubDrivers = async (req, res) => {
  const mainDriverId = Number(req.params.id);
  const rows = await Driver.findAll({
    where: { parentDriverId: mainDriverId, isSubdriver: true },
    attributes: ["id", "name", "email", "phone"]
  });
  res.json({ success: true, subDrivers: rows });
};
