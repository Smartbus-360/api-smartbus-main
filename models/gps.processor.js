// export const handleIncomingPacket = (data, socket) => {
//     console.log("📦 [TEMP] Packet received in processor:", data);
// };

import { getBusDriverByIMEI } from "../models/gps.utils.js";
import { io } from "../index.js";

// TEMP FUNCTION – will be replaced when protocol arrives
// function extractImeiTemporary(packetHex) {
//     // Example: find 15-digit IMEI inside hex
//     const match = packetHex.match(/(\d{15})/);
//     return match ? match[1] : null;
// }

function extractImeiTemporary(buffer) {
    const ascii = buffer.toString("utf8").trim(); // convert raw bytes → ASCII text
    const match = ascii.match(/\b\d{15}\b/);       // extract 15-digit IMEI
    return match ? match[0] : null;
}

// TEMP FUNCTION – will be replaced when protocol arrives
function decodeLocationTemporary(packetHex) {
    return {
        latitude: 21.210367,
        longitude: 81.321673,
        speed: 10,
        direction: 0
    };
}


export const handleIncomingPacket = async (buffer, socket) => {
    const hexPacket = buffer.toString("hex");
    console.log("📦 HEX PACKET:", hexPacket);

    // STEP 1 — Extract IMEI temporarily
    // const imei = extractImeiTemporary(hexPacket);

    const imei = extractImeiTemporary(buffer);
console.log("🧭 IMEI extracted:", imei);

    if (!imei) {
        console.log("⚠️ IMEI not found in packet (protocol needed)");
        return;
    }
console.log("📡 GPS location emitted via socket");

    // STEP 2 — Lookup bus + driver
    const mapping = await getBusDriverByIMEI(imei);

    if (!mapping) {
        console.log("❌ IMEI not registered:", imei);
        return;
    }
    if (mapping.locationSource === "ANDROID") {
    console.log("🚫 GPS packet ignored (Android enabled)");
    return;
}


    console.log("🟢 IMEI matched → Bus:", mapping.busId, "Driver:", mapping.driverId);

    // STEP 3 — Decode location temporarily (will update later)
    const location = decodeLocationTemporary(hexPacket);

    const payload = {
        driverInfo: {
            id: mapping.driverId,
            name: mapping.driverName,
            busId: mapping.busId,
            busNumber: mapping.busNumber
        },
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        placeName: "",
        shiftType: "Morning",   // optional override later
    };

    // STEP 4 — Emit to Student App
    // STEP 4 — Emit GPS location into SAME pipeline as Android
io.of("/drivers")
    .to(`driver_${mapping.driverId}`)
    .emit("locationUpdate", {
        driverId: mapping.driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        source: "GPS"
    });

console.log("📡 GPS location emitted via socket:", {
    driverId: mapping.driverId,
    latitude: location.latitude,
    longitude: location.longitude,
    speed: location.speed
});

};
