import Stop from "../models/stop.model.js";
import StopReachLogs from "../models/stopReachLogs.model.js";
import Bus from "../models/bus.model.js";
import Driver from "../models/driver.model.js";
import Route from "../models/route.model.js";
import sequelize from "../config/database.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

// ===================================================================
// 1️⃣ GET DRIVER STOP MERGED REPORT
// ===================================================================
export const getDriverStopReport = async (req, res) => {
  try {
    const { driverId, date } = req.query;
    const reportDate = date || new Date().toISOString().substring(0, 10);

    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }

    // ----------------------------------------
    // Fetch driver & bus & route
    // ----------------------------------------
    const driver = await Driver.findByPk(driverId);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

    const bus = await Bus.findOne({ where: { driverId } });
    if (!bus) return res.status(404).json({ success: false, message: "Bus not assigned to driver" });

    const route = await Route.findByPk(bus.assignedRouteId);
    if (!route) return res.status(404).json({ success: false, message: "Route not found" });

    const { currentJourneyPhase, currentRound } = route;  // tripType + round

    // ----------------------------------------
    // Fetch ALL stops from all phases — merged report
    // ----------------------------------------
    const allStops = await Stop.findAll({
      where: { routeId: route.id },
      order: [["stopOrder", "ASC"]],
    });

    // ----------------------------------------
    // Fetch reached logs for selected route + day
    // This includes morning / afternoon / evening
    // ----------------------------------------
    const logs = await StopReachLogs.findAll({
      where: sequelize.where(sequelize.fn("DATE", sequelize.col("reachDateTime")), reportDate),
    });

    const reachedStopIds = logs.map(l => l.stopId);

    // ----------------------------------------
    // Build merged report entries
    // ----------------------------------------
    const report = allStops.map(stop => {
      const log = logs.find(l => l.stopId === stop.id);

      return {
        stopId: stop.id,
        stopName: stop.stopName,
        stopOrder: stop.stopOrder,
        phase: stop.stopType || "not assigned",
        rounds: stop.rounds || null,
        reached: !!log,
        reachTime: log ? log.reachDateTime : null
      };
    });

    const reachedCount = report.filter(x => x.reached).length;
    const pendingCount = report.length - reachedCount;
    const progressPercentage = Math.round((reachedCount / report.length) * 100);

    return res.json({
      success: true,
      driver: {
        id: driver.id,
        name: driver.full_name,
        mobile: driver.phone,
        busNumber: bus.busNumber,
      },
      route: {
        id: route.id,
        name: route.routeName,
        currentPhase: currentJourneyPhase,
        currentRound,
      },
      date: reportDate,
      totals: {
        totalStops: allStops.length,
        reachedStops: reachedCount,
        pendingStops: pendingCount,
        progressPercentage,
      },
      stops: report,
    });

  } catch (error) {
    console.error("Error building driver stop report:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};



// ===================================================================
// 2️⃣ EXPORT: EXCEL MERGED REPORT
// ===================================================================
export const exportDriverStopReportExcel = async (req, res) => {
  try {
    const { driverId, date } = req.query;

    // Fetch JSON report using the same logic above
    const result = await (await fetch(
      `${process.env.BASE_URL}/admin/driver-stop-report?driverId=${driverId}&date=${date}`
    )).json();

    if (!result.success) {
      return res.status(400).json(result);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Driver Stop Report");

    sheet.columns = [
      { header: "Stop Order", key: "stopOrder", width: 15 },
      { header: "Stop Name", key: "stopName", width: 30 },
      { header: "Phase", key: "phase", width: 15 },
      { header: "Reached", key: "reached", width: 10 },
      { header: "Reach Time", key: "reachTime", width: 20 },
    ];

    result.stops.forEach(s => {
      sheet.addRow({
        stopOrder: s.stopOrder,
        stopName: s.stopName,
        phase: s.phase,
        reached: s.reached ? "YES" : "NO",
        reachTime: s.reachTime || "-",
      });
    });

    const fileName = `driver-stop-report-${driverId}-${Date.now()}.xlsx`;
    const filePath = path.join("downloads", fileName);

    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, fileName);

  } catch (error) {
    console.error("Excel Export Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// ===================================================================
// 3️⃣ EXPORT: PDF MERGED REPORT
// ===================================================================
export const exportDriverStopReportPDF = async (req, res) => {
  try {
    const { driverId, date } = req.query;

    const result = await (await fetch(
      `${process.env.BASE_URL}/admin/driver-stop-report?driverId=${driverId}&date=${date}`
    )).json();

    if (!result.success) {
      return res.status(400).json(result);
    }

    const fileName = `driver-stop-report-${driverId}-${Date.now()}.pdf`;
    const filePath = path.join("downloads", fileName);

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(18).text("Driver Stop Completion Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Driver: ${result.driver.name}`);
    doc.text(`Bus: ${result.driver.busNumber}`);
    doc.text(`Route: ${result.route.name}`);
    doc.text(`Date: ${result.date}`);
    doc.moveDown();

    doc.fontSize(14).text("Stops Summary");
    doc.text(`Total Stops: ${result.totals.totalStops}`);
    doc.text(`Reached: ${result.totals.reachedStops}`);
    doc.text(`Pending: ${result.totals.pendingStops}`);
    doc.text(`Progress: ${result.totals.progressPercentage}%`);
    doc.moveDown();

    doc.fontSize(14).text("Stops Details (Merged) ↓");
    doc.moveDown();

    result.stops.forEach((s, i) => {
      doc.fontSize(11).text(
        `${i + 1}. [${s.phase}] ${s.stopName} - ${s.reached ? "✓ Reached" : "✗ Not Reached"} ${s.reachTime ? " at " + s.reachTime : ""
        }`
      );
    });

    doc.end();

    res.download(filePath, fileName);

  } catch (error) {
    console.error("PDF Export Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
