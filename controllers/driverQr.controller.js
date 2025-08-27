import { nanoid } from "nanoid";
import QRCode from "qrcode";
import sequelize from "../config/database.js";
import Driver from "../models/driver.model.js";
import DriverQrToken from "../models/driverQrToken.model.js";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { QueryTypes } from "sequelize";   // safer than sequelize.QueryTypes
import { Op } from "sequelize";
import DriverRoute from "../models/driverRoute.model.js";
import Route from "../models/route.model.js";



// 4.1 Create a sub-driver linked to a main driver
export const createSubDriver = async (req, res) => {
  const mainDriverId = Number(req.params.id);
  const { name, email, phone, password, instituteId } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: "Password required" });
  }

  // get main driver to inherit institute & routes
  const main = await Driver.findByPk(mainDriverId);
  if (!main) {
    return res.status(404).json({ success: false, message: "Main driver not found" });
  }

  const hashed = await bcryptjs.hash(password, 10);

  const sub = await Driver.create({
    name, email, phone,
    password: hashed,
    instituteId: instituteId ?? main.instituteId,     // 👈 inherit if not sent
    parentDriverId: mainDriverId,
    isSubdriver: true,
    availabilityStatus: 'Available'
  });

  // 👇 clone the main driver's routes to sub-driver
  const mainRouteRows = await DriverRoute.findAll({ where: { driverId: mainDriverId } });
  if (mainRouteRows.length) {
    const toInsert = mainRouteRows.map(r => ({ driverId: sub.id, routeId: r.routeId }));
    await DriverRoute.bulkCreate(toInsert, { ignoreDuplicates: true });
  }

  res.json({ success: true, subDriver: sub });
};

// 4.2 Generate QR
// export const generateDriverQr = async (req, res) => {
//   try {
//     const { originalDriverId, subDriverId, durationHours } = req.body;
//     const createdBy = Number(req.user?.id) || null; // admin id from verifyToken

//     // ✅ basic validation
//     if (!originalDriverId || !subDriverId) {
//       return res.status(400).json({ success: false, message: "originalDriverId and subDriverId are required" });
//     }
//     if (!Number.isFinite(+durationHours) || +durationHours <= 0) {
//       return res.status(400).json({ success: false, message: "durationHours must be > 0" });
//     }

//     const token = nanoid(32);
//     const expiresAt = new Date(Date.now() + Number(durationHours) * 3600 * 1000);

//     // ✅ busId not used anymore; keep null
//     const row = await DriverQrToken.create({
//       originalDriverId,
//       subDriverId,
//       busId: null,
//       token,
//       expiresAt,
//       maxUses: 1,
//       createdBy,
//     });

//     const link = `smartbus360://qr-login?token=${token}`;
//     const png = await QRCode.toDataURL(link);

//     return res.json({ success: true, id: row.id, link, png, expiresAt });
//   } catch (err) {
//     console.error("[QR-GENERATE] error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

export const generateDriverQr = async (req, res) => {
  try {
    const { driverId, durationHours } = req.body;
    const createdBy = Number(req.user?.id) || null;

    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }
    const hours = Number(durationHours ?? 6);
    if (!Number.isFinite(hours) || hours <= 0) {
      return res.status(400).json({ success: false, message: "durationHours must be > 0" });
    }

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    const row = await DriverQrToken.create({
      originalDriverId: driverId,
      subDriverId: null,          // not used
      busId: null,
      token,
      expiresAt,
      maxUses: 1,
      usedCount: 0,
      status: 'active',
      createdBy,
    });

    // (Optional) render QR PNG from token
    const payload = JSON.stringify({ token, type: "driver-login" });
    const png = await QRCode.toDataURL(payload);

    return res.json({ success: true, id: row.id, token, expiresAt, png });
  } catch (err) {
    console.error("generateDriverQr error:", err);
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

    // Accept an ACTIVE or already USED (but unexpired) token
    const row = await DriverQrToken.findOne({
      where: {
        token,
        status: { [Op.in]: ['active', 'used'] },
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    if (!row) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    // Issue a normal Driver JWT for the SAME driver
    const driver = await Driver.findByPk(row.originalDriverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Server misconfig: JWT_SECRET missing" });
    }

    const secondsLeft = Math.max(1, Math.floor((new Date(row.expiresAt) - Date.now()) / 1000));
    const driverJwt = jwt.sign(
      { id: driver.id, email: driver.email, role: 'driver', qr: true },
      JWT_SECRET,
      { expiresIn: secondsLeft }
    );

    // Persist token ON THE SAME DRIVER (do NOT null out any other device)
    await sequelize.query(
      `UPDATE tbl_sm360_drivers SET token = :t, lastLogin = NOW() WHERE id = :id`,
      { replacements: { t: driverJwt, id: driver.id }, type: QueryTypes.UPDATE }
    );

    // Mark QR as used (so others get 423 block until it expires)
    await DriverQrToken.update(
      { status: 'used', usedCount: (row.usedCount ?? 0) + 1 },
      { where: { id: row.id } }
    );

    const decoded = jwt.decode(driverJwt);
    console.log('[QR-EXCHANGE] issued token for driver', driver.id,
                'exp=', new Date(decoded.exp * 1000).toISOString());

    return res.json({
      success: true,
      driverId: driver.id,
      driverName: driver.name ?? "",
      email: driver.email ?? "",
      token: driverJwt,
      expiresAt: row.expiresAt,
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
// export const listSubDrivers = async (req, res) => {
//   const mainDriverId = Number(req.params.id);
//   const rows = await Driver.findAll({
//     where: { parentDriverId: mainDriverId, isSubdriver: true },
//     attributes: ["id", "name", "email", "phone"]
//   });
//   res.json({ success: true, subDrivers: rows });
// };
// List sub-drivers of a main driver WITH route overlap & active QR info
export const listSubDrivers = async (req, res) => {
  const mainDriverId = Number(req.params.id);
  try {
    // main driver route ids
    const mainRouteRows = await DriverRoute.findAll({
      where: { driverId: mainDriverId },
      attributes: ["routeId"],
    });
    const mainRouteIds = mainRouteRows.map(r => r.routeId);

    // all subs under this main
    const subs = await Driver.findAll({
      where: { parentDriverId: mainDriverId, isSubdriver: true },
      attributes: ["id", "name", "email", "phone"],
    });

    // collect all sub->route rows in one query
    const subIds = subs.map(s => s.id);
    const subRouteRows = subIds.length
      ? await DriverRoute.findAll({
          where: { driverId: { [Op.in]: subIds } },
          attributes: ["driverId", "routeId"],
        })
      : [];

    // fetch names for all routeIds we’ll show
    const allRouteIds = Array.from(new Set([
      ...mainRouteIds,
      ...subRouteRows.map(r => r.routeId),
    ]));
    const routeRows = allRouteIds.length
      ? await Route.findAll({ where: { id: { [Op.in]: allRouteIds } }, attributes: ["id", "routeName"] })
      : [];
    const routeNameById = Object.fromEntries(routeRows.map(r => [r.id, r.routeName]));

    // map: subDriverId -> [routeId...]
    const routesBySub = {};
    for (const r of subRouteRows) {
      (routesBySub[r.driverId] ||= []).push(r.routeId);
    }

    // build response with eligibility and active QR
    const now = new Date();
    const results = [];
    for (const s of subs) {
      const sRouteIds = routesBySub[s.id] || [];
      const overlapIds = sRouteIds.filter(id => mainRouteIds.includes(id));
      const eligible = overlapIds.length > 0;

      const activeQr = await DriverQrToken.findOne({
        where: {
          originalDriverId: mainDriverId,
          subDriverId: s.id,
          status: "active",
          expiresAt: { [Op.gt]: now },
        },
        order: [["expiresAt", "DESC"]],
      });

      results.push({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        eligible,
        routes: sRouteIds.map(id => ({ id, name: routeNameById[id] || `Route ${id}` })),
        overlapRoutes: overlapIds.map(id => ({ id, name: routeNameById[id] || `Route ${id}` })),
        activeQrId: activeQr?.id || null,
        activeQrExpiresAt: activeQr?.expiresAt || null,
      });
    }

    res.json({ success: true, subDrivers: results, mainRouteIds });
  } catch (e) {
    console.error("listSubDrivers error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
