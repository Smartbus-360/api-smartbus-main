import sequelize from "../config/database.js";
import Attendance from "../models/attendance.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";
import { io } from "../index.js";  // to use global Socket.IO instance
// import DriverAttendanceTemp from "../models/driverAttendanceTemp.model.js";
import QrCode from "../models/qrCode.model.js";
import AttendanceTakerAttendanceTemp from "../models/attendanceTakerAttendanceTemp.model.js";  // ✅ new temp table


console.log("✅ Temp Model Fields:", Object.keys(AttendanceTakerAttendanceTemp.rawAttributes));

// Convert UTC → IST helper
const toIST = (date) => {
  const options = { timeZone: "Asia/Kolkata", hour12: false };
  return new Date(date).toLocaleString("en-IN", options);
};

// MARK attendance after QR scan
// export const markAttendance = async (req, res, next) => {
//   try {
//     const { registrationNumber, driver_id, bus_id, latitude, longitude } = req.body;
//     if (!registrationNumber) return res.status(400).json({ message: "Registration number missing" });

//     // Find student by registration number
//     const student = await User.findOne({ where: { registrationNumber } });
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     // Fetch school name
//     const [institute] = await sequelize.query(
//       "SELECT name FROM tbl_sm360_institutes WHERE id = :id",
//       { replacements: { id: student.instituteId }, type: sequelize.QueryTypes.SELECT }
//     );

//     const instituteName = institute ? institute.name : null;

//     // Create attendance record
//     const attendance = await Attendance.create({
//       registrationNumber,
//       username: student.username,
//       instituteName,
//       student_id: student.id,
//       driver_id: driver_id || null,
//       bus_id: bus_id || null,
//       latitude: latitude || null,
//       longitude: longitude || null,
//     });

//     // 🟢 Also store in driver's temporary cache for 24-hour Excel use
// await DriverAttendanceTemp.create({
//   registrationNumber,
//   username: student.username,
//   instituteName,
//   driver_id,
//   bus_id,
//   latitude,
//   longitude,
//   scan_time: new Date(),
// });


//     // Return record with IST timestamp
//     const dataWithIST = {
//       ...attendance.dataValues,
//       scan_time: toIST(attendance.scan_time),
//     };

//     return res.status(201).json({
//       success: true,
//       message: "Attendance marked successfully",
//       data: dataWithIST,
//     });
//   } catch (error) {
//     console.error("Attendance marking error:", error);
//     next(errorHandler(500, error.message || "Error marking attendance"));
//   }
// };


// export const markAttendance = async (req, res, next) => {
//   try {
//     console.log("🟢 markAttendance called with body:", req.body);
//     const { registrationNumber, token, attendance_taker_id, bus_id, latitude, longitude } = req.body;

//     if (!registrationNumber || !token) {
//       return res.status(400).json({ message: "Missing registration number or token" });
//     }

//     // 1️⃣ Validate QR token
//     console.log("1️⃣ Checking QR token:", token);
//     const qr = await QrCode.findOne({ where: { qr_token: token, is_active: true } });
//     console.log("1️⃣ Result:", qr ? "✅ Valid QR" : "❌ Invalid QR");
//     if (!qr) {
//       return res.status(401).json({ message: "Invalid or revoked QR token" });
//     }

//     // 2️⃣ Validate student exists
//     console.log("2️⃣ Checking student:", registrationNumber);
//     const student = await User.findOne({ where: { registrationNumber: registrationNumber } });
//     console.log("2️⃣ Result:", student ? `✅ Found student ID ${student.id}` : "❌ Student not found");
//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     const [institute] = await sequelize.query(
//       "SELECT name FROM tbl_sm360_institutes WHERE id = :id",
//       { replacements: { id: student.instituteId }, type: sequelize.QueryTypes.SELECT }
//     );

//     const instituteName = institute ? institute.name : "Unknown";
// console.log("3️⃣ Proceeding to create attendance record...");

//     // 3️⃣ Save attendance permanently
//     const record = await Attendance.create({
//       registrationNumber: student.registrationNumber,
//       username: student.username,
//       instituteName,
//       bus_id,
//      attendance_taker_id,
//       latitude,
//       longitude,
//       scan_time: new Date()
//     });

//     // 4️⃣ Save to driver's daily temp record
//     await DriverAttendanceTemp.create({
//       registrationNumber: student.registrationNumber,
//       username: student.username,
//       instituteName,
//       bus_id,
//      attendance_taker_id,
//       latitude,
//       longitude,
//       scan_time: new Date()
//     });

//     res.status(200).json({
//       success: true,
//       message: "Attendance marked successfully",
//       record
//     });

//   } catch (error) {
//     console.error("Error marking attendance:", error);
//     res.status(500).json({ message: "Error marking attendance", error: error.message });
//   }
// };

export const markAttendance = async (req, res, next) => {
  try {
    console.log("🟢 markAttendance called with body:", req.body);
    const { registrationNumber, token, attendance_taker_id, bus_id, latitude, longitude } = req.body;

    if (!registrationNumber || !token) {
      return res.status(400).json({ message: "Missing registration number or token" });
    }

    // 1️⃣ Validate QR token
    console.log("1️⃣ Checking QR token:", token);
    const qr = await QrCode.findOne({ where: { qr_token: token, is_active: true } });
    console.log("1️⃣ Result:", qr ? "✅ Valid QR" : "❌ Invalid QR");
    if (!qr) {
      return res.status(401).json({ message: "Invalid or revoked QR token" });
    }

    // 2️⃣ Validate student exists
    console.log("2️⃣ Checking student:", registrationNumber);
    const student = await User.findOne({ where: { registrationNumber } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 3️⃣ Validate attendance taker exists
    const [taker] = await sequelize.query(
      "SELECT id, name FROM tbl_sm360_attendance_takers WHERE id = :id",
      { replacements: { id: attendance_taker_id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!taker) {
      return res.status(403).json({ message: "Invalid attendance taker ID" });
    }

    // 4️⃣ Fetch institute name
    const [institute] = await sequelize.query(
      "SELECT name FROM tbl_sm360_institutes WHERE id = :id",
      { replacements: { id: student.instituteId }, type: sequelize.QueryTypes.SELECT }
    );
    const instituteName = institute ? institute.name : "Unknown";

    const [busInfo] = await sequelize.query(`
      SELECT b.busNumber
      FROM tbl_sm360_users u
      LEFT JOIN tbl_sm360_stops s ON u.stopId = s.id
      LEFT JOIN tbl_sm360_driver_routes dr ON s.routeId = dr.routeId
      LEFT JOIN tbl_sm360_drivers d ON dr.driverId = d.id
      LEFT JOIN tbl_sm360_buses b ON d.id = b.driverId
      WHERE u.id = :userId
      LIMIT 1
    `, {
      replacements: { userId: student.id },
      type: sequelize.QueryTypes.SELECT,
    });

    const derivedBusNumber = busInfo ? busInfo.busNumber : null;
console.log("🚌 Derived bus number:", derivedBusNumber || "❌ Not found");



    console.log("3️⃣ Proceeding to create attendance record...");

    // 5️⃣ Save permanent attendance record
    const record = await Attendance.create({
      registrationNumber: student.registrationNumber,
      username: student.username,
      instituteName,
      // bus_id,
      bus_id: derivedBusNumber,
      attendance_taker_id,
      student_id: student.id,
      latitude,
      longitude,
      scan_time: new Date(),
    });

    // 6️⃣ Save to attendance taker’s temporary table
            console.error("❌ student_id missing in AttendanceTakerAttendanceTemp model!");
    await AttendanceTakerAttendanceTemp.create({
      registrationNumber: student.registrationNumber,
      username: student.username,
      instituteName,
      bus_id: derivedBusNumber,
      attendance_taker_id,
      student_id: student.id,
      latitude,
      longitude,
      scan_time: new Date(),
    });

    console.log("✅ Attendance saved successfully");

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      record,
    });

  } catch (error) {
    console.error("❌ Error marking attendance:", error);
    next(errorHandler(500, error.message || "Error marking attendance"));
  }
};


// GET attendance by date
export const getAttendanceByDate = async (req, res, next) => {
  try {
    const { date } = req.params;
    const startDate = new Date(`${date}T00:00:00+05:30`);
    const endDate = new Date(`${date}T23:59:59+05:30`);

    const attendanceRecords = await Attendance.findAll({
      where: {
        scan_time: { [sequelize.Op.between]: [startDate, endDate] },
      },
      order: [["scan_time", "ASC"]],
    });

    const formatted = attendanceRecords.map((a) => ({
      ...a.dataValues,
      scan_time: toIST(a.scan_time),
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(errorHandler(500, error.message || "Error fetching attendance records"));
  }
};


export const getAttendanceByStudent = async (req, res, next) => {
  try {
    console.log("🟢 getAttendanceByStudent called with:", req.params);
    // const { registrationNumber } = req.params;       // ← use correct param name
    let { registrationNumber } = req.params;

    if (registrationNumber === 'self' && req.user) {
      registrationNumber = req.user.registrationNumber;
      console.log(`⚙️ Auto-mapped 'self' → ${registrationNumber}`);
    }

    if (!registrationNumber)
      return next(errorHandler(400, "Missing registration number"));

    const attendanceRecords = await Attendance.findAll({
      where: { registrationNumber },
      order: [["scan_time", "DESC"]],
    });

    const formatted = attendanceRecords.map((a) => ({
      ...a.dataValues,
      scan_time: toIST(a.scan_time),
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(errorHandler(500, error.message || "Error fetching attendance records"));
  }
};
export const getMyAttendance = async (req, res, next) => {
  try {
        console.log("🟢 [getMyAttendance] Endpoint hit");
    const loggedInUser = req.user; // comes from httpAuth middleware
        console.log("🔹 Logged-in user from token:", loggedInUser);
    if (!loggedInUser) {
            console.warn("⚠️ No logged-in user found in request");
      return res.status(401).json({ message: "Unauthorized access" });
    }

    // ensure only student accounts can access this
    if (loggedInUser.accountType !== "student") {
            console.warn(`⚠️ Access denied for non-student accountType: ${loggedInUser.accountType}`);
      return res.status(403).json({ message: "Access denied: Only students can view this." });
    }
    console.log(`🔍 Fetching user record for ID: ${loggedInUser.id}`);
    const user = await User.findByPk(loggedInUser.id);
    // if (!user) return res.status(404).json({ message: "User not found" });

    if (!user) {
      console.error(`❌ User with ID ${loggedInUser.id} not found`);
      return res.status(404).json({ message: "User not found" });
    }
    console.log(`✅ Found user: ${user.username} (Reg No: ${user.registrationNumber})`);

    const attendanceRecords = await Attendance.findAll({
      where: { student_id: loggedInUser.id },
      order: [["scan_time", "DESC"]],
    });
    console.log(`🧾 Attendance records fetched: ${attendanceRecords.length}`);

    const toIST = (date) => {
      const options = { timeZone: "Asia/Kolkata", hour12: false };
      return new Date(date).toLocaleString("en-IN", options);
    };

    const formatted = attendanceRecords.map((a) => ({
      ...a.dataValues,
      scan_time: toIST(a.scan_time),
    }));
    console.log("✅ Sending response with formatted attendance data");

    res.status(200).json({
      success: true,
      registrationNumber: user.registrationNumber,
      total: formatted.length,
      attendance: formatted,
    });
  } catch (error) {
        console.error("❌ [getMyAttendance] Error:", error);

    next(errorHandler(500, error.message || "Error fetching student's attendance"));
  }
};
// ✅ New: fetch 24-hour sheet for a specific attendance taker
export const getTakerTempAttendance = async (req, res, next) => {
  try {
    const { takerId } = req.params;
    if (!takerId) return res.status(400).json({ message: "Missing attendance taker ID" });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const records = await AttendanceTakerAttendanceTemp.findAll({
      where: {
        attendance_taker_id: takerId,
        scan_time: { [sequelize.Op.between]: [yesterday, now] },
      },
      order: [["scan_time", "DESC"]],
    });

    const formatted = records.map((a) => ({
      ...a.dataValues,
      scan_time: new Date(a.scan_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    }));

    res.status(200).json({ success: true, total: formatted.length, attendance: formatted });
  } catch (error) {
    next(errorHandler(500, error.message || "Error fetching taker attendance sheet"));
  }
};

