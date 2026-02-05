import Bus from "../models/bus.model.js";
import Driver from "../models/driver.model.js";

export const handleDriverLocation = async (io, payload) => {
  const { driverId, latitude, longitude, speed = 0, source } = payload;

  if (!driverId || latitude == null || longitude == null) return;

  const bus = await Bus.findOne({ where: { driverId } });
  if (!bus) return;

  // ✅ SAME rule as Android
  if (bus.locationSource !== source) {
    console.log(`🚫 ${source} ignored (active: ${bus.locationSource})`);
    return;
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) return;

  io.of("/users")
    .to(`driver_${driverId}`)
    .emit("locationUpdate", {
      driverInfo: {
        id: driverId,
        name: driver.name,
        phone: driver.phone,
        busNumber: driver.vehicleAssigned || "N/A",
      },
      latitude,
      longitude,
      speed,
      source,
    });

  io.of("/admin/notification")
    .to(`driver_${driverId}`)
    .emit("locationUpdate", {
      driverId,
      latitude,
      longitude,
      speed,
      source,
    });

  console.log(`📡 ${source} location delivered for driver ${driverId}`);
};
