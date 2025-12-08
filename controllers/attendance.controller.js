import sequelize from "../config/database.js";
import Attendance from "../models/attendance.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";
import { io } from "../index.js";  // to use global Socket.IO instance
// import DriverAttendanceTemp from "../models/driverAttendanceTemp.model.js";
import QrCode from "../models/qrCode.model.js";
import AttendanceTakerAttendanceTemp from "../models/attendanceTakerAttendanceTemp.model.js";  // ✅ new temp table
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Kolkata"); // 👈 This makes all times Indian Standard Time
import { Op } from "sequelize";


console.log("✅ Temp Model Fields:", Object.keys(AttendanceTakerAttendanceTemp.rawAttributes));

// Convert UTC → IST helper
// const toIST = (date) => {
//   const options = { timeZone: "Asia/Kolkata", hour12: false };
//   return new Date(date).toLocaleString("en-IN", options);
// };


export const markAttendance = async (req, res, next) => {
  try {
    console.log("🟢 markAttendance called with body:", req.body);
    const { registrationNumber, token, attendance_taker_id, bus_id, latitude, longitude } = req.body;
    console.log("🔹 Raw attendance taker ID received:", attendance_taker_id);
    console.log("🔹 Full request body:", req.body);

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
      "SELECT id, name,role FROM tbl_sm360_attendance_takers WHERE id = :id",
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
// const recent = await Attendance.findOne({
//   where: {
//     student_id: student.id,
//     scan_time: { [Op.gt]: moment().subtract(10, "seconds").toDate() },
//   },
// });

// let record;
// if (recent) {
//   console.log("⚠️ Duplicate attendance prevented for " + registrationNumber);
//   record = recent; // don't create new, reuse last
// } else {
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
      // scan_time: new Date(),
      // scan_time: moment().toDate(),
      scan_time: moment.tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),

    });


    // 6️⃣ Save to attendance taker’s temporary table
            // console.error("❌ student_id missing in AttendanceTakerAttendanceTemp model!");
    console.log("🟢 Creating temp attendance record for taker:", attendance_taker_id);
    console.log("📦 About to insert into AttendanceTakerAttendanceTemp with taker_id =", attendance_taker_id);
    await AttendanceTakerAttendanceTemp.create({
      registrationNumber: student.registrationNumber,
      username: student.username,
      instituteName,
      bus_id: derivedBusNumber,
      attendance_taker_id,
      student_id: student.id,
      latitude,
      longitude,
      // scan_time: new Date(),
scan_time: moment.tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
    });
    console.log("✅ Successfully inserted into temp table for taker_id =", attendance_taker_id);
// 🧩 Send attendance notification to the student
console.log("✅ Attendance saved for " + registrationNumber + " at " + moment().format("hh:mm:ss A"));
console.log("📢 Notification emitted to student_" + student.id);
try {
  const student = await User.findOne({ where: { registrationNumber } });
  if (student) {
    const formattedTime = moment().format("hh:mm A");
    const formattedDate = moment().format("DD MMMM YYYY");

const message =
  "SMART BUS 360\n" +
  "Attendance Notification Alert:\n" +
  "Registration Number: " + registrationNumber + "\n" +
  "Attendance has been successfully marked.\n" +
  "Time: " + formattedTime + "\n" +
  "Date: " + formattedDate;


    io.of("/students").to(`student_${student.id}`).emit("attendance_notification", {
      title: "SMART BUS 360",
      message,
      time: formattedTime,
      date: formattedDate,
    });

    console.log(`📢 Notification emitted to student_${student.id}`);
  }
} catch (err) {
  console.error("❌ Failed to emit student notification:", err);
}
    // ✅ Notify student about attendance sheet update
if (student && student.id) {
  io.of("/students").to(`student_${student.id}`).emit("attendance_updated", {
    studentId: student.id,
    timestamp: new Date().toISOString(),
  });
  console.log(`📢 attendance_updated emitted for student_${student.id}`);
}

    console.log("✅ Attendance saved successfully");

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      attendance_id: record.id,
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
    // const startDate = new Date(`${date}T00:00:00+05:30`);
    // const endDate = new Date(`${date}T23:59:59+05:30`);

    const startDate = moment(date).startOf("day");
const endDate = moment(date).endOf("day");

    const attendanceRecords = await Attendance.findAll({
      where: {
        scan_time: { [sequelize.Op.between]: [startDate, endDate] },
      },
      order: [["scan_time", "ASC"]],
    });

    // const formatted = attendanceRecords.map((a) => ({
    //   ...a.dataValues,
    //   scan_time: toIST(a.scan_time),
    // }));

    const formatted = attendanceRecords.map((a) => ({
  ...a.dataValues,
  scan_time: moment(a.scan_time).format("YYYY-MM-DD HH:mm:ss"),
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
      attributes: [
        "id",
        "scan_time",
        "latitude",
        "longitude",
        "note",
        "note_type",
        "note_added_by",
        "attendance_taker_id",
        "registrationNumber",
        "driver_id",
        "bus_id"
      ],
    });

    // 🔍 Determine marked_by_role for each attendance record
for (const record of attendanceRecords) {
  let role = null;

  // If teacher added a note → teacher marked it
  if (record.note_added_by) {
    const teacher = await User.findByPk(record.note_added_by);
    if (teacher) role = teacher.role;
  }

  // Otherwise attendance taker marked it
  if (!role && record.attendance_taker_id) {
    const [taker] = await sequelize.query(
      "SELECT role FROM tbl_sm360_attendance_takers WHERE id = :id",
      {
        replacements: { id: record.attendance_taker_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (taker && taker.role) role = taker.role;
  }

  record.dataValues.marked_by_role = role || "unknown";
}


    const formatted = attendanceRecords.map((a) => ({
      ...a.dataValues,
      // scan_time: toIST(a.scan_time),
      scan_time: moment(a.scan_time).format("YYYY-MM-DD HH:mm:ss"),
        marked_by_role: a.dataValues.marked_by_role
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
    // if (loggedInUser.accountType !== "student") {
    //         console.warn(`⚠️ Access denied for non-student accountType: ${loggedInUser.accountType}`);
    //   return res.status(403).json({ message: "Access denied: Only students can view this." });
    // }
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
            attributes: [
        "id",
        "scan_time",
        "latitude",
        "longitude",
        "note",
        "note_type",
        "note_added_by",
        "attendance_taker_id",
        "registrationNumber",
        "driver_id",
        "bus_id"
      ],

    });
    console.log(`🧾 Attendance records fetched: ${attendanceRecords.length}`);

    // const toIST = (date) => {
    //   const options = { timeZone: "Asia/Kolkata", hour12: false };
    //   return new Date(date).toLocaleString("en-IN", options);
    // };

    // 🔍 Determine marked_by_role for each attendance record
for (const record of attendanceRecords) {
  let role = null;

  // If teacher added a note → teacher marked it
  if (record.note_added_by) {
    const teacher = await User.findByPk(record.note_added_by);
    if (teacher) role = teacher.role;
  }

  // Otherwise attendance taker marked it
  if (!role && record.attendance_taker_id) {
    const [taker] = await sequelize.query(
      "SELECT role FROM tbl_sm360_attendance_takers WHERE id = :id",
      {
        replacements: { id: record.attendance_taker_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (taker && taker.role) role = taker.role;
  }

  record.dataValues.marked_by_role = role || "unknown";
}

    const formatted = attendanceRecords.map((a) => ({
      ...a.dataValues,
      // scan_time: toIST(a.scan_time),
      scan_time: moment(a.scan_time).format("YYYY-MM-DD HH:mm:ss"),
        marked_by_role: a.dataValues.marked_by_role,
      latitude: a.latitude,
      longitude: a.longitude,
      note: a.note,                // ⭐ ADDED
      note_type: a.note_type,      // ⭐ ADDED
      note_added_by: a.note_added_by, // optional info
      attendance_taker_id: a.attendance_taker_id,
      registrationNumber: a.registrationNumber,
      driver_id: a.driver_id,
      bus_id: a.bus_id,
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

    const istNow = moment();
const ist24HrAgo = moment().subtract(24, "hours");

    const records = await AttendanceTakerAttendanceTemp.findAll({
      where: {
        attendance_taker_id: takerId,
        scan_time: {
          [Op.between]: [ist24HrAgo, istNow],
        },
      },
      order: [["scan_time", "DESC"]],
    });

return res.status(200).json({
      success: true,
  total: records.length,    // was count
  attendance: records
    });
  } catch (error) {
    console.error("❌ Error in getTakerTempAttendance:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching temporary attendance",
      error: error.message,
    });
  }
};
// ✅ Fetch unread attendance count for a logged-in student
export const getUnreadAttendanceCount = async (req, res, next) => {
  try {
    const loggedInUser = req.user; // from verifyToken / httpAuth middleware
    if (!loggedInUser || !loggedInUser.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ⚙️ If you already track read/unread, count those:
    const count = await Attendance.count({
      where: { student_id: loggedInUser.id, is_read: false },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("❌ Error in getUnreadAttendanceCount:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching unread attendance count",
      error: error.message,
    });
  }
};
// export const addAttendanceNote = async (req, res, next) => {
//   try {
//         console.log("📥 Note API Body Received:", req.body);
//     const { attendance_id, note, note_type, added_by } = req.body;

//     if (!attendance_id)
//       return res.status(400).json({ success: false, message: "Missing attendance ID" });

//     const record = await Attendance.findByPk(attendance_id);
//     if (!record)
//       return res.status(404).json({ success: false, message: "Attendance record not found" });

//     console.log("📝 Updating Attendance:", {
//       attendance_id,
//       note,
//       note_type,
//       added_by
//     });

//     await record.update({
//       note: note || null,
//       note_type: note_type || null,
//       note_added_by: added_by || null,
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Note added successfully",
//       updated: record,
//     });

//   } catch (error) {
//     console.error("❌ addAttendanceNote Error:", error);
//     next(errorHandler(500, error.message));
//   }
// };

export const addAttendanceNote = async (req, res, next) => {
  try {
            console.log("📥 Note API Body Received:", req.body);
    const { attendance_id, note, note_type, added_by } = req.body;

    if (req.user?.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can add notes"
      });
    }
    if (!attendance_id) {
      return res.status(400).json({
        success: false,
        message: "Missing attendance ID"
      });
    }

    const record = await Attendance.findByPk(attendance_id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found"
      });
    }

    await record.update({
      note: note || null,
      note_type: note_type || null,
      // note_added_by: added_by || req.user?.id || null,
        note_added_by: req.user.id

    });

    return res.status(200).json({
      success: true,
      message: "Note added successfully",
      updated: record,
    });

  } catch (error) {
    console.error("❌ addAttendanceNote Error:", error);
    next(errorHandler(500, error.message));
  }
};

