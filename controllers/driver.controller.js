import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import Driver from "../models/driver.model.js";
import Institute from "../models/institute.model.js";
import DriverRoute from "../models/driverRoute.model.js";
import sequelize from '../config/database.js';
import multer from "multer";
import User from "../models/user.model.js";
import DriverQrToken from "../models/driverQrToken.model.js";
import { Op } from "sequelize";
import { findActiveQrOverride } from "../utils/qrOverride.js";
import DriverJourney from "../models/driverJourney.model.js";
import { io } from "../index.js"; 


const baseURL = "https://api.smartbus360.com";

// Configure Multer for handling driver image uploads
const driverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/drivers"); // Save images in the 'uploads/drivers' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Generate a unique filename
  },
});

// Export the Multer instance for driver image uploads
export const uploadDriverImage = multer({ storage: driverStorage });

export const getDrivers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    const isAdmin = Number(user.isAdmin);
    const instituteId = Number(user.instituteId);

    let query = `
      SELECT d.*, r.id AS routeId, r.routeName AS routeName, i.name AS instituteName, i.id AS instituteId
      FROM tbl_sm360_drivers AS d
      LEFT JOIN tbl_sm360_driver_routes AS dr ON d.id = dr.driverId
      LEFT JOIN tbl_sm360_routes AS r ON dr.routeId = r.id
      LEFT JOIN tbl_sm360_institutes i ON d.instituteId = i.id
    `;

    if (isAdmin === 2) {
      // Restrict to drivers of the admin's institute
      query += ` WHERE d.instituteId = ${instituteId}`;
    }

    const [drivers] = await sequelize.query(query);

    // Format the response
    const driversWithRoutes = drivers.reduce((acc, driver) => {
      const existingDriver = acc.find(d => d.id === driver.id);
      const assignedRoute = {
        routeId: driver.routeId,
        routeName: driver.routeName
      };

      if (existingDriver) {
        // If driver already exists in the accumulator, push the new route
        existingDriver.assignedRoutes.push(assignedRoute);
      } else {
        // Create a new driver entry with the assigned route
        acc.push({
          id: driver.id,
          instituteName: driver.instituteName,
          instituteId: driver.instituteId,
          name: driver.name,
          licenseNumber: driver.licenseNumber,
          email: driver.email,
          phone: driver.phone,
          emergencyContact: driver.emergencyContact,
          aadhaarNumber: driver.aadhaarNumber,
          licenseExpiry: driver.licenseExpiry,
          experienceYears: driver.experienceYears,
          startDate: driver.startDate,
          endDate: driver.endDate,
          dateOfBirth: driver.dateOfBirth,
          profilePicture: driver.profilePicture.startsWith("http")
          ? driver.profilePicture
          : `${baseURL}/${driver.profilePicture}`,
          shiftType: driver.shiftType,
          vehicleAssigned: driver.vehicleAssigned,
          rating: driver.rating,
          lastLogin: driver.lastLogin,
          isVerified: driver.isVerified,
          availabilityStatus: driver.availabilityStatus,
          assignedRoutes: [assignedRoute], // Start with the current route
        });
      }

      return acc;
    }, []);

    res.status(200).json(driversWithRoutes);
  } catch (error) {
    console.error('Error retrieving drivers:', error);
    res.status(500).json({ message: 'Error retrieving drivers', error });
  }
};

export const addDriver = async (req, res, next) => {
  const {
    name,
    licenseNumber,
    password,
    phone,
    email,
    drivingExperience,
    instituteId: providedInstituteId,
    availabilityStatus,
    aadhaarNumber,
    licenseExpiry,
    startDate,
    endDate,
    dateOfBirth,
    shiftType,
    vehicleAssigned,
    rating,
    lastLogin,
    isVerified,
    assignedRoutes,
    profilePicture
  } = req.body;

  // Retrieve user data from the decoded JWT token middleware
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);  // explicitly converting to number
  const instituteId = Number(user.instituteId);  // user's actual institute ID

  // // Determine which institute to target based on admin status
  // const targetInstituteId = isAdmin === 2 ? instituteId : Number(providedInstituteId);

  // Restrict addition if the user attempts to add a driver for an unauthorized institute
  if (isAdmin === 2 && Number(providedInstituteId) !== instituteId) {
    console.warn("Unauthorized access attempt:", {
      userId,
      isAdmin,
      userInstituteId: instituteId,
    });
    return next(errorHandler(403, 'You are not authorized to add drivers to other institutes.'));
  }

  // Check if all required fields are present
  if (!name || !licenseNumber || !phone || !email || !password || !providedInstituteId) {
    return next(errorHandler(400, "All required fields must be provided."));
  }

  const existingDriver = await sequelize.query(
    'SELECT id FROM tbl_sm360_drivers WHERE email = :email',
    { replacements: { email }, type: sequelize.QueryTypes.SELECT }
  );

  if (existingDriver.length) {
    return next(errorHandler(400, 'A driver with this email id already exists'));
  }

  try {
    const hashedPassword = bcryptjs.hashSync(password, 12);
    const profilePicturePath = req.file
      ? req.file.path
      : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

    // Driver creation with targetInstituteId
    const newDriver = await Driver.create({
      name: name,
      email,
      password: hashedPassword,
      phone,
      licenseNumber,
      experienceYears: drivingExperience || null,
      profilePicture: profilePicturePath,
      instituteId: Number(providedInstituteId),
      availabilityStatus: availabilityStatus || null,
      aadhaarNumber: aadhaarNumber || null,
      licenseExpiry: licenseExpiry || null,
      startDate: startDate || null,
      endDate: endDate || null,
      dateOfBirth: dateOfBirth || null,
      shiftType: shiftType || null,
      vehicleAssigned: vehicleAssigned || null,
      rating: rating || 0, // Default rating to 0 if not provided
      lastLogin: lastLogin || null,
      isVerified: isVerified || false, // Default to 'false' if not provided
    });

    const assignedRoutesArray = Array.isArray(assignedRoutes)
      ? assignedRoutes
      : assignedRoutes
      ? [assignedRoutes] // Wrap in an array if it's a single value
      : [];

    if (assignedRoutesArray.length > 0) {
      const driverRouteEntries = assignedRoutesArray.map((routeId) => ({
        driverId: newDriver.id,
        routeId,
      }));

      await DriverRoute.bulkCreate(driverRouteEntries);
    }

    const profilePictureURL = newDriver.profilePicture.startsWith("http")
      ? newDriver.profilePicture
      : `${baseURL}/${newDriver.profilePicture}`;

    const institute = await Institute.findByPk(Number(providedInstituteId));
    const instituteName = institute ? institute.name : null;

    res.status(201).json({
      success: true,
      message: "Driver added successfully",
      driver: {
        id: newDriver.id,
        name: newDriver.name,
        licenseNumber: newDriver.licenseNumber,
        email: newDriver.email,
        phone: newDriver.phone,
        experienceYears: newDriver.experienceYears,
        availabilityStatus: newDriver.availabilityStatus,
        profilePicture: profilePictureURL,
        aadhaarNumber: newDriver.aadhaarNumber,
        licenseExpiry: newDriver.licenseExpiry,
        startDate: newDriver.startDate,
        endDate: newDriver.endDate,
        dateOfBirth: newDriver.dateOfBirth,
        shiftType: newDriver.shiftType,
        vehicleAssigned: newDriver.vehicleAssigned,
        rating: newDriver.rating,
        lastLogin: newDriver.lastLogin,
        isVerified: newDriver.isVerified,
        instituteName
      },
    });
  } catch (error) {
    console.error("Error adding driver:", error);
    return next(errorHandler(500, "Error adding driver."));
  }
};

// Update an existing driver
export const updateDriver = async (req, res, next) => {
  const driverId = req.params.id;
  const {
    name,
    email,
    phone,
    licenseNumber,
    experienceYears,
    availabilityStatus,
    aadhaarNumber,
    licenseExpiry,
    startDate,
    endDate,
    dateOfBirth,
    shiftType,
    vehicleAssigned,
    rating,
    lastLogin,
    isVerified,
    profilePicture,
    password,
    instituteId: providedInstituteId
  } = req.body;

  const userId = req.user.id;

  if (isNaN(Number(userId))) {
    return next(errorHandler(400, 'Invalid user ID.'));
  }  
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  // const targetInstituteId = isAdmin === 2 ? instituteId : Number(providedInstituteId);

  const providedInstituteIdNum = providedInstituteId ? Number(providedInstituteId) : null;
  const instituteIdNum = instituteId ? Number(instituteId) : null;
  
  if (isAdmin === 2 && providedInstituteIdNum !== instituteIdNum) {
    return next(errorHandler(403, 'You are not authorized to add drivers to other institutes.'));
  }
  
  if (isNaN(Number(driverId))) {
    return next(errorHandler(400, 'Invalid driver ID.'));
  }

  // Validation
  if (!name || !email || !phone || !licenseNumber) {
    return next(errorHandler(400, "All required fields must be provided."));
  }

  try {
    // Find the driver by ID
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return next(errorHandler(404, "Driver not found."));
    }
  
    // Handle password update only if changed
    if (password) {
      const isSamePassword = bcryptjs.compareSync(password, driver.password);
      if (!isSamePassword) {
        driver.password = bcryptjs.hashSync(password, 12);
      }
    }

    const parseDate = (date) => {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    };
  
    // Update fields with null-checks
    driver.name = name ?? driver.name;
    driver.email = email ?? driver.email;
    driver.phone = phone ?? driver.phone;
    driver.licenseNumber = licenseNumber ?? driver.licenseNumber;
    driver.experienceYears = experienceYears !== undefined ? Number(experienceYears) : driver.experienceYears;
    driver.availabilityStatus = availabilityStatus ?? driver.availabilityStatus;
    driver.aadhaarNumber = aadhaarNumber ?? driver.aadhaarNumber;
    driver.licenseExpiry = licenseExpiry ? parseDate(licenseExpiry) : driver.licenseExpiry;
    driver.startDate = startDate ? parseDate(startDate) : driver.startDate;
    driver.endDate = endDate ? parseDate(endDate) : driver.endDate;
    driver.dateOfBirth = dateOfBirth ? parseDate(dateOfBirth) : driver.dateOfBirth;
    driver.shiftType = shiftType ?? driver.shiftType;
    driver.vehicleAssigned = vehicleAssigned ?? driver.vehicleAssigned;
    driver.rating = rating ?? driver.rating;
    driver.lastLogin = lastLogin ? parseDate(lastLogin) : driver.lastLogin;
    driver.isVerified = isVerified ?? driver.isVerified;
    
    // Handle profile picture update properly
    driver.profilePicture = req.file ? req.file.path : driver.profilePicture;
  
    // Save the updated driver
    await driver.save();
  
    // Fetch institute name safely
    const instituteId = Number(providedInstituteId);
    const institute = Number.isNaN(instituteId) ? null : await Institute.findByPk(instituteId);
    const instituteName = institute ? institute.name : null;

    const baseURL = process.env.BASE_URL || 'https://api.smartbus360.com';
  
    // Return updated driver info
    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        experienceYears: driver.experienceYears,
        availabilityStatus: driver.availabilityStatus,
        profilePicture: driver.profilePicture
        ? driver.profilePicture.startsWith("http")
          ? driver.profilePicture
          : `${baseURL}/${driver.profilePicture}`
        : null,
        aadhaarNumber: driver.aadhaarNumber,
        licenseExpiry: driver.licenseExpiry,
        startDate: driver.startDate,
        endDate: driver.endDate,
        dateOfBirth: driver.dateOfBirth,
        shiftType: driver.shiftType,
        vehicleAssigned: driver.vehicleAssigned,
        rating: driver.rating,
        lastLogin: driver.lastLogin,
        isVerified: driver.isVerified,
        instituteName,
      },
    });

  } catch (error) {
    console.error("Error updating driver:", error);
    next(error);
  }
};

// Delete a driver
export const deleteDriver = async (req, res, next) => {
  const { id } = req.params; 
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  try {
    const driver = await Driver.findByPk(id);

    if (!driver) {
      return next(errorHandler(404, "Driver not found."));
    }

    if (isAdmin === 2 && driver.instituteId !== instituteId) {
      return next(errorHandler(403, "You are not authorized to delete drivers of other institutes."));
    }

    await driver.destroy();

    res.json({ message: "Driver deleted successfully." });
  } catch (error) {
    console.error("Error deleting driver:", error);
    res.status(500).json({ message: "Failed to delete driver." });
  }
};
export const getDriverSelf = async (req, res, next) => {
  try {
    // assuming auth middleware has set req.user to the driver row / payload
    const driver = req.user;
    if (!driver) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // If this is the main driver (not a sub-driver), block during active QR window
// If this is a normal driver (not a sub-driver), block while a claimed QR is still unexpired
const isSub = Number(driver.isSubdriver) === 1 || driver.isSubdriver === true;
if (!isSub) {
    const activeQr = await findActiveQrOverride(driver.id);
    const isQrJwt = Boolean(req.user?.qr);
    if (activeQr && !isQrJwt) {
      return res.status(423).json({
        success: false,
        reason: "qr_override_active",
        message: "Temporarily blocked: a QR login is active for this driver.",
        until: activeQr.expiresAt,
      });
    }
  }

    // Return whatever minimal profile your app needs on reopen
    return res.json({
      success: true,
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        isSubdriver: driver.isSubdriver ?? false,
        instituteId: driver.instituteId,
        shiftType: driver.shiftType,
      },
    });
  } catch (err) {
    console.error("getDriverSelf error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// controllers/driver.controller.js
export const updateDriverShift = async (req, res) => {
  const { id } = req.params; // driverId
  const { newShift, newPhase, newRound } = req.body;

  try {
    const driver = await Driver.findByPk(id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    driver.shiftType = newShift || driver.shiftType;
    await driver.save();

    await DriverJourney.create({
      driverId: id,
      phase: newPhase,
      round: newRound,
      action: `Admin updated driver shift/journey to ${newShift || ''} ${newPhase || ''} Round ${newRound || ''}`
    });

    res.json({ success: true, driver });
  } catch (err) {
    res.status(500).json({ error: "Error updating driver shift" });
  }
};
export const getDriverJourneys = async (req, res) => {
  const { driverId } = req.params;
  try {
    const journeys = await DriverJourney.findAll({
      where: { driverId },
      order: [['timestamp', 'DESC']]
    });
    res.json(journeys);
  } catch (err) {
    res.status(500).json({ error: "Error fetching journeys" });
  }
};
    await DriverJourney.create({
      driverId,
      phase,
      round,
      action: action || "Updated by Admin",
    });

    // Update driver's current phase/round in DB
    await Driver.update(
      { shiftType: phase }, // optional, if you store phase in driver
      { where: { id: driverId } }
    );

    // Broadcast via socket to both driver + admin
    io.of("/drivers").to(`driver_${driverId}`).emit("shiftUpdated", {
      driverId,
      phase,
      round,
      action: "Admin Update",
    });

    io.of("/admin/notification").to(`driver_${driverId}`).emit("shiftUpdated", {
      driverId,
      phase,
      round,
      action: "Admin Update",
    });

    res.json({
      success: true,
      message: "Journey updated successfully",
      driverId,
      phase,
      round,
    });
  } catch (err) {
    console.error("Error in updateJourney:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

