import net from "net";
import { handleIncomingPacket } from "../models/gps.processor.js";

const GPS_PORT = 7001;

const server = net.createServer((socket) => {
    console.log("📡 GPS Device Connected:", socket.remoteAddress);

    // socket.on("data", (data) => {
    //     console.log("📥 RAW Packet:", data);
    //     handleIncomingPacket(data, socket);  // forward to processor
    // });
    socket.on("data", (data) => {
    console.log("📥 RAW GPS PACKET:", data.toString("utf8").trim());
    handleIncomingPacket(data, socket);
});


    socket.on("close", () => {
        console.log("❌ GPS Device Disconnected");
    });

    socket.on("error", (err) => {
        console.log("⚠️ GPS Socket Error:", err.message);
    });
});

server.listen(GPS_PORT, () => {
    console.log(`🚀 GPS Listener started on TCP port ${GPS_PORT}`);
});
