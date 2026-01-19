import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs'; 
import { Op } from 'sequelize'; 
import Institute from "../models/institute.model.js";
import { findActiveQrOverride } from "../utils/qrOverride.js";
import DriverQrToken from '../models/driverQrToken.model.js';
import AttendanceTaker from '../models/attendanceTaker.model.js';  // ⬅️ add this import at top


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const httpAuth = async (req, res, next) => {
    const jwtToken = req.headers['authorization'];
    if (!jwtToken || !jwtToken.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication error: No token provided' });
    }

    const token = jwtToken.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication error: No token provided' });
    }

    try {
        // Verify the token and extract the payload
        const payload = jwt.verify(token, JWT_SECRET);

        // ✅ Allow ADMIN tokens
if (payload.isAdmin && payload.isAdmin >= 1) {
    req.user = { id: payload.id, role: "admin",isAdmin: 1 };
    return next();
}


        // Fetch user or driver from the database
        
        if (payload.role === 'user') {
            // user = await User.findOne({ where: { email: payload.email, token } });

            const [session] = await User.sequelize.query(
  `SELECT userId FROM tbl_sm360_user_sessions 
   WHERE token = :token AND revokedAt IS NULL AND expiresAt > NOW() 
   LIMIT 1`,
  { replacements: { token }, type: User.sequelize.QueryTypes.SELECT }
);
if (!session) return res.status(401).json({ message: 'Authentication error: Invalid or expired token' });

const user = await User.findByPk(session.userId);
if (!user) return res.status(401).json({ message: 'Authentication error: User not found' });

req.user = user;
return next();

} 
    if (payload.role === 'driver') {
    // QR-session token lane
    if (payload.qr === true) {
        const row = await DriverQrToken.findOne({
            where: {
                originalDriverId: payload.id,
                token: payload.qrToken,
                status: { [Op.in]: ['active', 'used'] },
                expiresAt: { [Op.gt]: new Date() },
            },
            order: [['expiresAt', 'DESC']],
        });

        if (!row)  return res.status(401).json({ message: 'QR session invalid or expired' });
        

        const driver = await Driver.findByPk(payload.id);
        if (!driver) return res.status(401).json({ message: 'Driver not found' });
                
if (driver.currentSessionId !== payload.sessionId) {
  return res.status(401).json({
    code: "SESSION_EXPIRED",
    message: "QR session replaced by another login",
  });
}

        req.user = driver;
        return next();
    }
        // ✅ Attendance-Taker token lane
if (payload.role === 'attendance_taker') {
    const attendanceTaker = await AttendanceTaker.findOne({ where: { email: payload.email, token } });
    if (!attendanceTaker) {
        return res.status(401).json({ message: 'Authentication error: Invalid or expired token' });
    }

    req.user = attendanceTaker;
    return next();
}


    // Normal token lane
    const driver = await Driver.findOne({ where: { email: payload.email, token } });
    if (!driver)  return res.status(401).json({ message: 'Authentication error: Invalid or expired token' });
    
// 🔥 FORCE LOGOUT if session changed
if (driver.currentSessionId !== payload.sessionId) {
  return res.status(401).json({
    code: "SESSION_EXPIRED",
    message: "Logged out because you signed in from another device",
  });
}

    const activeQr = await DriverQrToken.findOne({
        where: {
            originalDriverId: driver.id,
            status: { [Op.in]: ['active', 'used'] },
            expiresAt: { [Op.gt]: new Date() },
        },
        order: [['expiresAt', 'DESC']],
    });

    if (activeQr) {
        return res.status(423).json({
            code: 'QR_SESSION_ACTIVE',
            message: `Temporarily blocked by QR session until ${activeQr.expiresAt.toISOString()}`,
            expiresAt: activeQr.expiresAt,
        });
    }
    req.user = driver;

    // req.user = driver;
    return next();
}
       

        // Attach user to the request object for later use
            return res.status(401).json({ message: 'Authentication error: Invalid token role' });
    } catch (err) {
        console.error(err);
        return res.status(401).json({ message: 'Authentication error: Invalid token' });
    }
};



// Middleware for WebSocket Authentication
export const wsAuth = async (socket, next) => {
    const jwtToken = socket.handshake.headers['authorization'];
    if (!jwtToken || !jwtToken.startsWith('Bearer ')) {
        return next(new Error('Authentication error: No token provided'));
    }

    const token = jwtToken.split(' ')[1];
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        // Verify the token and extract the payload
        const payload = jwt.verify(token, JWT_SECRET);

        // Fetch user or driver from the database and ensure token matches
        if (payload.role === 'user') {
            // user = await User.findOne({ where: { email: payload.email, token } });
            const [session] = await User.sequelize.query(
  `SELECT userId FROM tbl_sm360_user_sessions
   WHERE token = :token AND revokedAt IS NULL AND expiresAt > NOW()
   LIMIT 1`,
  { replacements: { token }, type: User.sequelize.QueryTypes.SELECT }
);
if (!session) return next(new Error('Authentication error: Invalid or expired token'));

const user = await User.findByPk(session.userId);
if (!user) return next(new Error('Authentication error: User not found'));

socket.user = user;
return next();

}
  if (payload.role === 'driver') {
    if (payload.qr === true) {
        const row = await DriverQrToken.findOne({
            where: {
                originalDriverId: payload.id,
                token: payload.qrToken,
                status: { [Op.in]: ['active', 'used'] },
                expiresAt: { [Op.gt]: new Date() },
            },
            order: [['expiresAt', 'DESC']],
        });

        if (!row) return next(new Error('QR session invalid or expired'));

        const driver = await Driver.findByPk(payload.id);
        if (!driver) return next(new Error('Driver not found'));
        if (driver.currentSessionId !== payload.sessionId) {
  return next(new Error("SESSION_EXPIRED"));
}

// socket.driverId = driver.id;
        socket.user = driver;
        socket.driverId = driver.id;  // ✅ attach id
        return next();
    }

    const driver = await Driver.findOne({ where: { email: payload.email, token } });
    if (!driver) return next(new Error('Authentication error: Invalid or expired token'));

      // 🔥 FORCE LOGOUT CHECK
if (driver.currentSessionId !== payload.sessionId) {
  return next(new Error("SESSION_EXPIRED"));
}

    const activeQr = await DriverQrToken.findOne({
        where: {
            originalDriverId: driver.id,
            status: { [Op.in]: ['active', 'used'] },
            expiresAt: { [Op.gt]: new Date() },
        },
        order: [['expiresAt', 'DESC']],
    });

    if (activeQr) {
        return next(new Error(`Temporarily blocked by QR session until ${activeQr.expiresAt.toISOString()}`));
    }

    socket.user = driver;
    socket.driverId = driver.id;  // ✅ attach id
    return next();
}


        

        // Attach user to the socket object for later use
        // socket.user = user;
        // next(); // Proceed to the next middleware
            return next(new Error('Authentication error: Invalid token role'));
    } catch (err) {
        console.error(err);
        return next(new Error('Authentication error: Invalid token'));
    }
};

// Function to get User Token
export const getUserToken = async (usernameOrEmail, password) => {
    const user = await User.findOne({
        where: {
            [Op.or]: [
                { email: usernameOrEmail }, // Check if it's an email
                { username: usernameOrEmail } // Check if it's a username
            ]
        }
    });

    // Check if the user was found
    if (user) {
        //console.log(`User found: ${user.username}, Email: ${user.email}`);

        // Compare the entered password with the hashed password in the database
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        //console.log(`Password correct: ${isPasswordCorrect}`);

        if (isPasswordCorrect) {
            const token = jwt.sign({ email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
            // user.token = token; // Optionally save the token in the database
            // await user.save();

  //           await User.sequelize.query(
  //   `INSERT INTO tbl_sm360_user_sessions (userId, token, createdAt, expiresAt)
  //    VALUES (:userId, :token, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
  //   {
  //     replacements: { userId: user.id, token },
  //     type: User.sequelize.QueryTypes.INSERT,
  //   }
  // );
            // Return token along with user id, username, and email
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                token
            };
        } else {
            //console.log('Password did not match');
        }
    } else {
        //console.log(`No user found for ${usernameOrEmail}`);
    }

    throw new Error('Invalid credentials');
};

// Function to get Driver Token
export const getDriverToken = async (email, password, sessionId) => {
    const driver = await Driver.findOne({ where: { email } });
    //console.log('Driver:', driver); 
    
    // Check if driver exists and verify the password
    if (driver && await bcrypt.compare(password, driver.password)) {
        const token = jwt.sign({ email: driver.email, role: 'driver',sessionId }, JWT_SECRET, { expiresIn: '30d' });
        driver.token = token; // Optionally save the token in the database
        await driver.save();

        // Return token along with driver id, name, and email
        return {
            id: driver.id,
            name: driver.name,
            email: driver.email,
            token
        };
    }

    throw new Error('Invalid credentials');
};

export const logout = async (req, res) => {
    const { id, role } = req.user;
    try {
            if (role === 'user') {
        const bearer = req.headers['authorization'] || '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;

  if (token) {
    await User.sequelize.query(
      `UPDATE tbl_sm360_user_sessions
         SET revokedAt = NOW()
       WHERE token = :token
         AND revokedAt IS NULL`,
      { replacements: { token }, type: User.sequelize.QueryTypes.UPDATE }
    );
  }
        } else if (role === 'driver') {
            await Driver.update({ token: null }, { where: { id } });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging out' });
    }
};
// export const canViewMap = async (req, res, next) => {
//   try {
//     const actor = req.user;                 // set by httpAuth
//     const instituteId = actor?.instituteId; // present on your tokens/rows

//     if (!instituteId) {
//       return res.status(403).json({ message: "Map access not configured." });
//     }

//     const inst = await Institute.findByPk(instituteId);
//     if (!inst) return res.status(404).json({ message: "Institute not found." });

//     if (inst.mapAccess !== true) {
//       return res.status(403).json({ message: "Map access disabled by superadmin." });
//     }

//     next();
//   } catch (e) {
//     return res.status(500).json({ message: "Map access check failed." });
//   }
// };

// export const canViewMap = async (req, res, next) => {
//   try {
//     const user = req.user;

//     // Institute-level hard block only
//     if (user.instituteId) {
//       const institute = await Institute.findByPk(user.instituteId);
//       if (institute && institute.mapAccess === false) {
//         return res.status(403).json({
//           message: "Institute map access disabled"
//         });
//       }
//     }

//     // Let controller decide (checkMapAccess)
//     console.log("httpAuth PASSING");
//     return next();

//   } catch (err) {
//     console.error("canViewMap error:", err);
//     return res.status(500).json({ message: "Map access check failed." });
//   }
// };

export const canViewMap = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.instituteId) {
      const institute = await Institute.findByPk(user.instituteId);

      // Institute disabled → allow controller to decide
      if (institute && institute.mapAccess === false) {
        return next(); // ✅ DO NOT BLOCK HERE
      }
    }

    return next();
  } catch (err) {
    return res.status(500).json({ message: "Map access check failed." });
  }
};
