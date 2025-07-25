import Driver from '../models/driver.model.js';
import { wsAuth } from '../middleware/wsAuth.middleware.js';

const driverInfoCache = {};

// Helper function to fetch driver info from the DB
const getDriverInfo = async (driverId, callback) => {
    try {
        if (!driverId || isNaN(driverId)) {
            return callback('Invalid driverId', null);
        }
        if (driverInfoCache[driverId]) {
            return callback(null, driverInfoCache[driverId]);
        }
        const driver = await Driver.findOne({ where: { id: driverId } });
        if (!driver) {
            return callback('Driver not found', null);
        }
        driverInfoCache[driverId] = driver;
        callback(null, driver);
    } catch (error) {
        callback(error, null);
    }
};

export const configureSocket = (io) => {
    const driverNamespace = io.of('/drivers').use(wsAuth);
    const userNamespace = io.of('/users').use(wsAuth);
    const adminNotificationNamespace = io.of('/admin/notification');

    // Driver namespace: Handles real-time updates from drivers
    driverNamespace.on('connection', (socket) => {
        //console.log('A driver connected');
        
        let driverId; // Track the driverId for cleanup on disconnect
        
        // Driver joins a room based on their ID
        socket.on('driverConnected', (id) => {
            driverId = parseInt(id, 10);
            socket.join(`driver_${driverId}`);
            getDriverInfo(driverId, (err, driverInfo) => {
                if (err) return console.error(err);
                //console.log(`Driver info for ${driverId} cached:`, driverInfo);
            });
        });

        socket.on('locationUpdate', (data) => {
            const { driverId, latitude, longitude } = data;
            const numericDriverId = parseInt(driverId, 10);

            if (!driverId || isNaN(numericDriverId)) {
                return console.warn('Invalid driverId in locationUpdate event');
            }

            if (latitude === undefined || longitude === undefined) {
                return console.warn(`Missing latitude/longitude in locationUpdate event for driver ${numericDriverId}`);
            }

            //console.log(`Received locationUpdate for driver ${numericDriverId}: lat=${latitude}, lon=${longitude}`);

            getDriverInfo(numericDriverId, (err, driverInfo) => {
                if (err) return console.error('Driver info error:', err);

                userNamespace.to(`driver_${numericDriverId}`).emit('locationUpdate', {
                    driverInfo: { name: driverInfo.name, phone: driverInfo.phone },
                    latitude,
                    longitude
                });
            });
        });

        socket.on('disconnect', () => {
            //console.log('A driver disconnected');
            if (driverId) {
                socket.leave(`driver_${driverId}`);
                delete driverInfoCache[driverId]; // Optional: Clear cache if driver goes offline
            }
        });
    });

    // User namespace: Users connect here to receive real-time updates
    userNamespace.on('connection', (socket) => {
        //console.log('A user connected');
        
        const subscribedDrivers = new Set(); // Track subscribed drivers for each user
        
        socket.on('subscribeToDriver', (data) => {
            const driverId = typeof data === 'object' ? data.driverId : data;
            const numericDriverId = parseInt(driverId, 10);

            if (typeof numericDriverId === 'number' && Number.isInteger(numericDriverId)) {
                socket.join(`driver_${numericDriverId}`);
                subscribedDrivers.add(numericDriverId); // Track subscriptions
                //console.log(`User subscribed to driver_${numericDriverId}`);
            } else {
                console.warn('Invalid driverId in subscribeToDriver event');
            }
        });

        // Unsubscribe a user from a specific driver
        socket.on('unsubscribeFromDriver', (data) => {
            const driverId = typeof data === 'object' ? data.driverId : data;
            const numericDriverId = parseInt(driverId, 10);

            if (subscribedDrivers.has(numericDriverId)) {
                socket.leave(`driver_${numericDriverId}`);
                subscribedDrivers.delete(numericDriverId); // Remove from tracked subscriptions
                //console.log(`User unsubscribed from driver_${numericDriverId}`);
            } else {
                console.warn('Unsubscribe failed: user not subscribed to driver_', numericDriverId);
            }
        });

        socket.on('disconnect', () => {
            //console.log('A user disconnected');
            // Cleanup: Unsubscribe user from all tracked driver rooms
            subscribedDrivers.forEach(driverId => {
                socket.leave(`driver_${driverId}`);
            });
            subscribedDrivers.clear();
        });
    });

    // Admin Notification namespace
    adminNotificationNamespace.on('connection', (socket) => {
        //console.log('An admin connected for notifications');

        socket.on('disconnect', () => {
            //console.log('An admin disconnected from notifications');
        });
    });
};

