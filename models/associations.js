// import Driver from './driver.model.js'; 
// import Route from './route.model.js';
// import Institute from './institute.model.js';
// import Stop from './stop.model.js';
// import DriverRoute from './driverRoute.model.js';
// import User from './user.model.js';
// import Bus from './bus.model.js';
// import UserStop from './userStop.model.js';
// import Notification from './notification.model.js';
// import BusNotification from './bus_notification.model.js';
// import QrCode from "./qrCode.model.js";
// import AttendanceTaker from "./attendanceTaker.model.js";
// import AttendanceTakerAttendanceTemp from "./attendanceTakerAttendanceTemp.model.js";


// // Setup Associations
// const setupAssociations = () => {
    
//     // Institute-Route relationship
//     Institute.hasMany(Route, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
//     Route.belongsTo(Institute, { foreignKey: 'instituteId' });

//     // User-Institute relationship using instituteCode
// User.belongsTo(Institute, {
//     foreignKey: 'instituteCode',
//     targetKey: 'instituteCode',
//     onDelete: 'SET NULL',
//     onUpdate: 'CASCADE',
// });

// Institute.hasMany(User, {
//     foreignKey: 'instituteCode',
//     sourceKey: 'instituteCode',
// });


//     // Route-Stop relationship
//     Route.hasMany(Stop, { foreignKey: 'routeId', onDelete: 'CASCADE' });
//     Stop.belongsTo(Route, { foreignKey: 'routeId' });

//     // Driver-Institute relationship
//     Institute.hasMany(Driver, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
//     Driver.belongsTo(Institute, { foreignKey: 'instituteId' });

//     // Driver-Route relationship (Many-to-Many)
//     Driver.belongsToMany(Route, { through: DriverRoute, foreignKey: 'driverId' });
//     Route.belongsToMany(Driver, { through: DriverRoute, foreignKey: 'routeId' });

//     // User-Stop relationship (Many-to-Many)
//     User.belongsToMany(Stop, { through: UserStop, foreignKey: 'userId' });
//     Stop.belongsToMany(User, { through: UserStop, foreignKey: 'stopId' });

//     User.hasOne(QrCode, { foreignKey: "student_id" });
//   QrCode.belongsTo(User, { foreignKey: "student_id" });


//     // Driver-Bus relationship
//     Driver.hasOne(Bus, { foreignKey: 'driverId', onDelete: 'SET NULL' });
//     Bus.belongsTo(Driver, { foreignKey: 'driverId' });
// };
// Institute.hasMany(AttendanceTaker, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
//   AttendanceTaker.belongsTo(Institute, { foreignKey: 'instituteId' });

//   // AttendanceTaker-AttendanceTemp relationship
//   AttendanceTaker.hasMany(AttendanceTakerAttendanceTemp, {
//     foreignKey: "attendance_taker_id",
//     as: "attendanceRecords",
//   });
//   AttendanceTakerAttendanceTemp.belongsTo(AttendanceTaker, {
//     foreignKey: "attendance_taker_id",
//     as: "attendanceTaker",
//   });
// };


// // Export the setup function
// export { setupAssociations };

import Driver from './driver.model.js';
import Route from './route.model.js';
import Institute from './institute.model.js';
import Stop from './stop.model.js';
import DriverRoute from './driverRoute.model.js';
import User from './user.model.js';
import Bus from './bus.model.js';
import UserStop from './userStop.model.js';
import Notification from './notification.model.js';
import BusNotification from './bus_notification.model.js';
import QrCode from "./qrCode.model.js";
import AttendanceTaker from "./attendanceTaker.model.js";
import AttendanceTakerAttendanceTemp from "./attendanceTakerAttendanceTemp.model.js";
import StudentMapSubscription from "./studentMapSubscription.model.js";

// ------------------- MAIN FUNCTION -------------------
const setupAssociations = () => {
      console.log("🔥 setupAssociations executed");
  // Institute-Route relationship
  Institute.hasMany(Route, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
  Route.belongsTo(Institute, { foreignKey: 'instituteId' });

  // User-Institute relationship using instituteCode
  User.belongsTo(Institute, {
    foreignKey: 'instituteCode',
    targetKey: 'instituteCode',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
  Institute.hasMany(User, {
    foreignKey: 'instituteCode',
    sourceKey: 'instituteCode',
  });

  // Route-Stop relationship
  Route.hasMany(Stop, { foreignKey: 'routeId', onDelete: 'CASCADE' });
  Stop.belongsTo(Route, { foreignKey: 'routeId' });

  // Driver-Institute relationship
  Institute.hasMany(Driver, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
  Driver.belongsTo(Institute, { foreignKey: 'instituteId' });

  // Driver-Route relationship (Many-to-Many)
  Driver.belongsToMany(Route, { through: DriverRoute, foreignKey: 'driverId' });
  Route.belongsToMany(Driver, { through: DriverRoute, foreignKey: 'routeId' });

  // User-Stop relationship (Many-to-Many)
  User.belongsToMany(Stop, { through: UserStop, foreignKey: 'userId' });
  Stop.belongsToMany(User, { through: UserStop, foreignKey: 'stopId' });

  // QR Code and User
  User.hasOne(QrCode, { foreignKey: "student_id" });
  QrCode.belongsTo(User, { foreignKey: "student_id" });

  // Driver-Bus relationship
  Driver.hasOne(Bus, { foreignKey: 'driverId', onDelete: 'SET NULL' });
  Bus.belongsTo(Driver, { foreignKey: 'driverId' });

  //   export const setupAssociations = () => {
  // console.log("🔥 setupAssociations executed");

  User.hasMany(StudentMapSubscription, {
    foreignKey: "student_id",
  });

  StudentMapSubscription.belongsTo(User, {
    foreignKey: "student_id",
  });
// };

  // ------------------- NEW AttendanceTaker Relationships -------------------
  Institute.hasMany(AttendanceTaker, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
  AttendanceTaker.belongsTo(Institute, { foreignKey: 'instituteId' });

  AttendanceTaker.hasMany(AttendanceTakerAttendanceTemp, {
    foreignKey: "attendance_taker_id",
    as: "attendanceRecords",
  });
  AttendanceTakerAttendanceTemp.belongsTo(AttendanceTaker, {
    foreignKey: "attendance_taker_id",
    as: "attendanceTaker",
  });
};

// Export the setup function
export { setupAssociations };

