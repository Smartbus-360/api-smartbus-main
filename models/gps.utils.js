// import GPSDevice from "../models/gpsDevice.model.js";
// import Bus from "../models/bus.model.js";
// import Driver from "../models/driver.model.js";

// export const getBusDriverByIMEI = async (imei) => {
//     try {
//         const device = await GPSDevice.findOne({ where: { imei } });

//         if (!device) {
//             console.log("❌ IMEI not found in gps_devices:", imei);
//             return null;
//         }

//         const bus = await Bus.findByPk(device.busId);
// if (!bus) {
//     console.log("❌ No bus found for busId:", device.busId);
//     return null;
// }

// // ✅ FIX: driver comes from gps_devices, NOT bus
// const driver = await Driver.findByPk(device.driverId);
// if (!driver) {
//     console.log("❌ No driver found for driverId:", device.driverId);
//     return null;
// }


//         return {
//             imei: device.imei,
//             busId: bus.id,
//             driverId: driver.id,
//             busNumber: bus.busNo || bus.busNumber || "",
//             driverName: driver.name || driver.fullName || "",
//             locationSource: bus.locationSource, 
//         };
//     } catch (error) {
//         console.log("⚠️ Error in IMEI lookup:", error);
//         return null;
//     }
// };

import GPSDevice from "../models/gpsDevice.model.js";
import Bus from "../models/bus.model.js";
import Driver from "../models/driver.model.js";

export const getBusDriverByIMEI = async (imei) => {
  try {
    const device = await GPSDevice.findOne({ where: { imei } });

    if (!device) {
      console.log("❌ IMEI not found in gps_devices:", imei);
      return null;
    }

    const bus = await Bus.findByPk(device.busId);
    if (!bus) {
      console.log("❌ No bus found for busId:", device.busId);
      return null;
    }

    let driver = null;

    // 1️⃣ Try driver from gps_devices (optional)
    if (device.driverId) {
      driver = await Driver.findByPk(device.driverId);
    }

    // 2️⃣ Fallback: driver from bus (THIS IS THE IMPORTANT ONE)
    if (!driver && bus.driverId) {
      driver = await Driver.findByPk(bus.driverId);
    }

    if (!driver) {
      console.log("❌ No driver found for IMEI:", imei);
      return null;
    }

    return {
      imei: device.imei,
      busId: bus.id,
      driverId: driver.id,
      busNumber: bus.busNumber,   // ✅ correct column
      driverName: driver.name,
      locationSource: bus.locationSource,
    };
  } catch (error) {
    console.log("⚠️ Error in IMEI lookup:", error);
    return null;
  }
};

