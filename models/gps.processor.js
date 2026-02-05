// // export const handleIncomingPacket = (data, socket) => {
// //     console.log("📦 [TEMP] Packet received in processor:", data);
// // };

// import { getBusDriverByIMEI } from "../models/gps.utils.js";
// import { io } from "../index.js";

// // TEMP FUNCTION – will be replaced when protocol arrives
// // function extractImeiTemporary(packetHex) {
// //     // Example: find 15-digit IMEI inside hex
// //     const match = packetHex.match(/(\d{15})/);
// //     return match ? match[1] : null;
// // }

// function extractImeiTemporary(buffer) {
//     const ascii = buffer.toString("utf8").trim(); // convert raw bytes → ASCII text
//     const match = ascii.match(/\b\d{15}\b/);       // extract 15-digit IMEI
//     return match ? match[0] : null;
// }

// // TEMP FUNCTION – will be replaced when protocol arrives
// // function decodeLocationTemporary(packetHex) {
// //     return {
// //         latitude: 21.210367,
// //         longitude: 81.321673,
// //         speed: 10,
// //         direction: 0
// //     };
// // }
// function decodeLocationAIS140(buffer) {
//     const ascii = buffer.toString("utf8").trim();

//     // Only process valid AIS-140 packets
//     if (!ascii.startsWith("$RSM")) return null;

//     const parts = ascii.split(",");

//     /**
//      * AIS-140 format (based on your real data):
//      * 10 → latitude
//      * 11 → N/S
//      * 12 → longitude
//      * 13 → E/W
//      * 14 → speed
//      */

//     const latitude = parseFloat(parts[10]);
//     const latDir = parts[11];
//     const longitude = parseFloat(parts[12]);
//     const lonDir = parts[13];
//     const speed = parseFloat(parts[14]);

//     if (isNaN(latitude) || isNaN(longitude)) return null;

//     return {
//         latitude: latDir === "S" ? -latitude : latitude,
//         longitude: lonDir === "W" ? -longitude : longitude,
//         speed: speed || 0
//     };
// }



// export const handleIncomingPacket = async (buffer, socket) => {
//     const hexPacket = buffer.toString("hex");
//     console.log("📦 HEX PACKET:", hexPacket);

//     // STEP 1 — Extract IMEI temporarily
//     // const imei = extractImeiTemporary(hexPacket);

//     const imei = extractImeiTemporary(buffer);
// console.log("🧭 IMEI extracted:", imei);

//     if (!imei) {
//         console.log("⚠️ IMEI not found in packet (protocol needed)");
//         return;
//     }
// console.log("📡 GPS location emitted via socket");

//     // STEP 2 — Lookup bus + driver
//     const mapping = await getBusDriverByIMEI(imei);

//     if (!mapping) {
//         console.log("❌ IMEI not registered:", imei);
//         return;
//     }
//     if (mapping.locationSource === "ANDROID") {
//     console.log("🚫 GPS packet ignored (Android enabled)");
//     return;
// }


//     console.log("🟢 IMEI matched → Bus:", mapping.busId, "Driver:", mapping.driverId);

//     // STEP 3 — Decode location temporarily (will update later)
//     // const location = decodeLocationTemporary(hexPacket);
//     const location = decodeLocationAIS140(buffer);

// if (!location) {
//     console.log("⚠️ Location not decoded (invalid packet)");
//     return;
// }

//     const payload = {
//         driverInfo: {
//             id: mapping.driverId,
//             name: mapping.driverName,
//             busId: mapping.busId,
//             busNumber: mapping.busNumber
//         },
//         latitude: location.latitude,
//         longitude: location.longitude,
//         speed: location.speed,
//         placeName: "",
//         shiftType: "Morning",   // optional override later
//     };

//     // STEP 4 — Emit to Student App
//     // STEP 4 — Emit GPS location into SAME pipeline as Android
// io.of("/drivers")
//     .to(`driver_${mapping.driverId}`)
//     .emit("locationUpdate", {
//         driverId: mapping.driverId,
//         latitude: location.latitude,
//         longitude: location.longitude,
//         speed: location.speed,
//         source: "GPS"
//     });

// console.log("📡 GPS location emitted via socket:", {
//     driverId: mapping.driverId,
//     latitude: location.latitude,
//     longitude: location.longitude,
//     speed: location.speed
// });

// };
import { getBusDriverByIMEI } from "../models/gps.utils.js";
import { io } from "../index.js";

// function extractImeiTemporary(buffer) {
//     const ascii = buffer.toString("utf8").trim();
//     const match = ascii.match(/\b\d{15}\b/);
//     return match ? match[0] : null;
// }
function extractImei(buffer) {
    const ascii = buffer.toString("utf8");
    const parts = ascii.split(",");
    const imei = parts.find(p => /^\d{15}$/.test(p));
    return imei || null;
}


// function decodeLocationAIS140(buffer) {
//     const ascii = buffer.toString("utf8").trim();
//     if (!ascii.startsWith("$RSM")) return null;

//     const parts = ascii.split(",");

//     const latitude = parseFloat(parts[10]);
//     const latDir = parts[11];
//     const longitude = parseFloat(parts[12]);
//     const lonDir = parts[13];
//     const speed = parseFloat(parts[14]);

//     if (isNaN(latitude) || isNaN(longitude)) return null;

//     return {
//         latitude: latDir === "S" ? -latitude : latitude,
//         longitude: lonDir === "W" ? -longitude : longitude,
//         speed: speed || 0
//     };
// }
// function decodeLocationAIS140(buffer) {
//     const ascii = buffer.toString("utf8").trim();
//     if (!ascii.startsWith("$RSM")) return null;

//     const parts = ascii.split(",");

//     // IMEI must be at index 6
//     if (!parts[6] || parts[6].length !== 15) return null;

//     // Latitude & Longitude are always followed by N/S and E/W
//     const latIndex = parts.findIndex(p => p === "N" || p === "S") - 1;
//     const lonIndex = parts.findIndex(p => p === "E" || p === "W") - 1;

//     if (latIndex < 0 || lonIndex < 0) return null;

//     const latitude = parseFloat(parts[latIndex]);
//     const latDir = parts[latIndex + 1];
//     const longitude = parseFloat(parts[lonIndex]);
//     const lonDir = parts[lonIndex + 1];

//     // Speed is usually after longitude direction
//     const speed = parseFloat(parts[lonIndex + 2]) || 0;

//     if (isNaN(latitude) || isNaN(longitude)) return null;

//     return {
//         latitude: latDir === "S" ? -latitude : latitude,
//         longitude: lonDir === "W" ? -longitude : longitude,
//         speed
//     };
// }
function decodeLocationAIS140(buffer) {
    const ascii = buffer.toString("utf8").trim();
    if (!ascii.startsWith("$RSM")) return null;

    const parts = ascii.split(",");

    const latitude = parseFloat(parts[10]);
    const latDir = parts[11];
    const longitude = parseFloat(parts[12]);
    const lonDir = parts[13];
    const speed = parseFloat(parts[14]);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return {
        latitude: latDir === "S" ? -latitude : latitude,
        longitude: lonDir === "W" ? -longitude : longitude,
        speed: speed || 0
    };
}



export const handleIncomingPacket = async (buffer, socket) => {
    // const imei = extractImeiTemporary(buffer);
    const imei = extractImei(buffer);
    console.log("🧭 IMEI extracted:", imei);

    if (!imei) {
        console.log("⚠️ IMEI not found in packet");
        return;
    }

    const mapping = await getBusDriverByIMEI(imei);

    if (!mapping) {
        console.log("❌ IMEI not registered:", imei);
        return;
    }

    if (mapping.locationSource === "ANDROID") {
        console.log("🚫 GPS ignored (Android active)");
        return;
    }

    const location = decodeLocationAIS140(buffer);

    if (!location) {
        console.log("⚠️ Location not decoded");
        return;
    }
console.log("🟢 GPS FIX:", location);

    console.log(
        "🟢 GPS FIX → Bus:",
        mapping.busId,
        "Driver:",
        mapping.driverId,
        location
    );
  



    // io.of("/drivers")
    //     .to(`driver_${mapping.driverId}`)
    //     .emit("locationUpdate", {
    //         driverId: mapping.driverId,
    //         latitude: location.latitude,
    //         longitude: location.longitude,
    //         speed: location.speed,
    //         source: "GPS"
    //     });
    // ✅ Emit to USERS (students / parents)
io.of("/drivers")
  .to(`driver_${mapping.driverId}`)
  .emit("locationUpdate", {
    driverId: mapping.driverId,
    latitude: location.latitude,
    longitude: location.longitude,
    speed: location.speed,
    source: "GPS"
  });

    console.log("📡 GPS location emitted:", {
        driverId: mapping.driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed
    });
};

