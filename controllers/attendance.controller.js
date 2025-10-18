import sequelize from "../config/database.js";
import Attendance from "../models/attendance.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";
import { io } from "../index.js";  // to use global Socket.IO instance
import DriverAttendanceTemp from "../models/driverAttendanceTemp.model.js";
import QrCode from "../models/qrCode.model.js";


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


export const markAttendance = async (req, res, next) => {
  try {
    const { registrationNumber, token, driver_id, bus_id, latitude, longitude } = req.body;

    if (!registrationNumber || !token) {
      return res.status(400).json({ message: "Missing registration number or token" });
    }

    // 1️⃣ Validate QR token
    const qr = await QrCode.findOne({ where: { qr_token: token, is_active: true } });
    if (!qr) {
      return res.status(401).json({ message: "Invalid or revoked QR token" });
    }

    // 2️⃣ Validate student exists
    const student = await User.findOne({ where: { registrationNumber: registrationNumber } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 3️⃣ Save attendance permanently
    const record = await Attendance.create({
      registrationNumber: student.registrationNumber,
      username: student.username,
      instituteName: student.institute_name || "Unknown",
      bus_id,
      driver_id,
      latitude,
      longitude,
      scan_time: new Date()
    });

    // 4️⃣ Save to driver's daily temp record
    await DriverAttendanceTemp.create({
      registrationNumber: student.registrationNumber,
      username: student.username,
      instituteName: student.institute_name || "Unknown",
      bus_id,
      driver_id,
      latitude,
      longitude,
      scan_time: new Date()
    });

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      record
    });

  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Error marking attendance", error: error.message });
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

// GET attendance by student
export const getAttendanceByStudent = async (req, res, next) => {
  try {
    console.log("🟢 getAttendanceByStudent called with:", req.params);
    // const { registrationNumber } = req.params;
    const { studentId } = req.params;
const registrationNumber = studentId;
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
