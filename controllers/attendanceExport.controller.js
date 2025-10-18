import ExcelJS from "exceljs";
import Attendance from "../models/attendance.model.js";
import { errorHandler } from "../utils/error.js";
import sequelize from "../config/database.js";
import DriverAttendanceTemp from "../models/driverAttendanceTemp.model.js";

const toIST = (date) => {
  const options = { timeZone: "Asia/Kolkata", hour12: false };
  return new Date(date).toLocaleString("en-IN", options);
};

// 🟢  Get today’s attendance for a driver
// export const getTodayAttendanceForDriver = async (req, res, next) => {
//   try {
//     const driver_id = req.params.driverId;
//     const now = new Date();
//     const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // yyyy-mm-dd

//     const start = new Date(`${today}T00:00:00+05:30`);
//     const end = new Date(`${today}T23:59:59+05:30`);

//     const records = await Attendance.findAll({
//       where: {
//         driver_id,
//         scan_time: { [sequelize.Op.between]: [start, end] },
//       },
//       order: [["scan_time", "ASC"]],
//     });

//     const formatted = records.map((r) => ({
//       ...r.dataValues,
//       scan_time: toIST(r.scan_time),
//     }));

//     res.status(200).json(formatted);
//   } catch (error) {
//     next(errorHandler(500, error.message || "Error fetching attendance"));
//   }
// };

export const getTodayAttendanceForDriver = async (req, res, next) => {
  try {
    const driver_id = req.params.driverId;

    // Fetch directly from temporary table — no date filter needed since cron clears it every midnight
    const records = await DriverAttendanceTemp.findAll({
      where: { driver_id },
      order: [["scan_time", "ASC"]],
    });

    const formatted = records.map((r) => ({
      ...r.dataValues,
      scan_time: toIST(r.scan_time),
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(errorHandler(500, error.message || "Error fetching today's attendance"));
  }
};

// 🟢  Generate Excel sheet
// export const downloadAttendanceExcel = async (req, res, next) => {
//   try {
//     const driver_id = req.params.driverId;
//     const now = new Date();
//     const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

//     const start = new Date(`${today}T00:00:00+05:30`);
//     const end = new Date(`${today}T23:59:59+05:30`);

//     const records = await Attendance.findAll({
//       where: {
//         driver_id,
//         scan_time: { [sequelize.Op.between]: [start, end] },
//       },
//       order: [["scan_time", "ASC"]],
//     });

//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Today's Attendance");

//     sheet.columns = [
//       { header: "Registration Number", key: "registrationNumber", width: 20 },
//       { header: "Student Name", key: "username", width: 25 },
//       { header: "Institute", key: "instituteName", width: 25 },
//       { header: "Bus ID", key: "bus_id", width: 15 },
//       { header: "Latitude", key: "latitude", width: 15 },
//       { header: "Longitude", key: "longitude", width: 15 },
//       { header: "Scan Time (IST)", key: "scan_time", width: 25 },
//     ];

//     records.forEach((r) => {
//       sheet.addRow({
//         registrationNumber: r.registrationNumber,
//         username: r.username,
//         instituteName: r.instituteName,
//         bus_id: r.bus_id,
//         latitude: r.latitude,
//         longitude: r.longitude,
//         scan_time: toIST(r.scan_time),
//       });
//     });

//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=attendance_${today}_driver${driver_id}.xlsx`
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     next(errorHandler(500, error.message || "Error generating Excel"));
//   }
// };

export const downloadAttendanceExcel = async (req, res, next) => {
  try {
    const driver_id = req.params.driverId;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Fetch from temp table (driver’s 24-hour cache)
    const records = await DriverAttendanceTemp.findAll({
      where: { driver_id },
      order: [["scan_time", "ASC"]],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Today's Attendance");

    sheet.columns = [
      { header: "Registration Number", key: "registrationNumber", width: 20 },
      { header: "Student Name", key: "username", width: 25 },
      { header: "Institute", key: "instituteName", width: 25 },
      { header: "Bus ID", key: "bus_id", width: 15 },
      { header: "Latitude", key: "latitude", width: 15 },
      { header: "Longitude", key: "longitude", width: 15 },
      { header: "Scan Time (IST)", key: "scan_time", width: 25 },
    ];

    records.forEach((r) => {
      sheet.addRow({
        registrationNumber: r.registrationNumber,
        username: r.username,
        instituteName: r.instituteName,
        bus_id: r.bus_id,
        latitude: r.latitude,
        longitude: r.longitude,
        scan_time: toIST(r.scan_time),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${today}_driver${driver_id}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(errorHandler(500, error.message || "Error generating Excel"));
  }
};

// 🧠 Admin export for their own school's attendance only
export const adminExportAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const admin = req.user; // comes from httpAuth middleware
    const instituteId = admin?.instituteId;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start and end date required" });
    }

    if (!instituteId) {
      return res.status(403).json({ message: "Institute ID not found for admin" });
    }

    const start = new Date(`${startDate}T00:00:00+05:30`);
    const end = new Date(`${endDate}T23:59:59+05:30`);

    // Fetch records from permanent table only for this institute
    const records = await Attendance.findAll({
      where: {
        instituteName: {
          [sequelize.Op.ne]: null,
        },
        scan_time: { [sequelize.Op.between]: [start, end] },
      },
      order: [["scan_time", "ASC"]],
    });

    // Filter in JS (since instituteName is stored, not instituteId)
    const filtered = records.filter(
      (r) => r.instituteName?.toLowerCase() === admin.instituteName?.toLowerCase()
    );

    if (!filtered.length) {
      return res
        .status(404)
        .json({ message: "No attendance records found for your institute in this date range." });
    }

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${admin.instituteName} Attendance`);

    sheet.columns = [
      { header: "Registration Number", key: "registrationNumber", width: 20 },
      { header: "Student Name", key: "username", width: 25 },
      { header: "Institute", key: "instituteName", width: 25 },
      { header: "Driver ID", key: "driver_id", width: 15 },
      { header: "Bus ID", key: "bus_id", width: 15 },
      { header: "Latitude", key: "latitude", width: 15 },
      { header: "Longitude", key: "longitude", width: 15 },
      { header: "Scan Time (IST)", key: "scan_time", width: 25 },
    ];

    filtered.forEach((r) => {
      sheet.addRow({
        registrationNumber: r.registrationNumber,
        username: r.username,
        instituteName: r.instituteName,
        driver_id: r.driver_id,
        bus_id: r.bus_id,
        latitude: r.latitude,
        longitude: r.longitude,
        scan_time: toIST(r.scan_time),
      });
    });

    const fileName = `${admin.instituteName.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(errorHandler(500, error.message || "Error generating admin Excel export"));
  }
};
