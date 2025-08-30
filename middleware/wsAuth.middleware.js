import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'; 
import { Op } from 'sequelize'; 
import Institute from "../models/institute.model.js";
import { findActiveQrOverride } from "../utils/qrOverride.js";


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

        // Fetch user or driver from the database
        let user;
        if (payload.role === 'user') {
            user = await User.findOne({ where: { email: payload.email, token } });
        } else if (payload.role === 'driver') {
            user = await Driver.findOne({ where: { email: payload.email, token } });
        }

        // Ensure the token matches the one stored in the database
        if (!user) {
            return res.status(401).json({ message: 'Authentication error: Invalid or expired token' });
        }
// ...after you verified the token (jwt.verify) and fetched `user` by email+token...

// Ensure the token matches the one stored in the database
if (!user) {
  return res.status(401).json({ message: 'Authentication error: Invalid or expired token' });
}

/* >>> INSERT THIS BLOCK <<< */
if (payload.role === 'driver') {
  // QR JWTs must be issued with { qr: true } in their payload
  const isQrToken = payload?.qr === true;

  // For normal (non-QR) tokens, soft-block while a QR override is active
  if (!isQrToken) {
    const activeQr = await findActiveQrOverride(user.id); // user is the Driver row
    if (activeQr) {
      return res.status(423).json({
        success: false,
        code: "QR_SESSION_ACTIVE",
        message: `Normal session is paused until ${new Date(activeQr.expiresAt).toISOString()}`,
        expiresAt: activeQr.expiresAt
      });
    }
  }

  // Optional: let downstream know which token type authenticated the call
  req.authSource = isQrToken ? "qr" : "normal";
}
/* >>> END INSERT <<< */

// Attach user and continue


        // Attach user to the request object for later use
        req.user = user;
        next(); // Proceed to the next middleware
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
        let user;
        if (payload.role === 'user') {
            user = await User.findOne({ where: { email: payload.email, token } });
        } else if (payload.role === 'driver') {
            user = await Driver.findOne({ where: { email: payload.email, token } });
        }

        if (!user) {
            return next(new Error('Authentication error: Invalid or expired token'));
        }

        // Attach user to the socket object for later use
        socket.user = user;
        next(); // Proceed to the next middleware
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
            const token = jwt.sign({ email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '8h' });
            user.token = token; // Optionally save the token in the database
            await user.save();

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
export const getDriverToken = async (email, password) => {
    const driver = await Driver.findOne({ where: { email } });
    //console.log('Driver:', driver); 
    
    // Check if driver exists and verify the password
    if (driver && await bcrypt.compare(password, driver.password)) {
        const token = jwt.sign({ email: driver.email, role: 'driver' }, JWT_SECRET, { expiresIn: '8h' });
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
            await User.update({ token: null }, { where: { id } });
        } else if (role === 'driver') {
            await Driver.update({ token: null }, { where: { id } });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging out' });
    }
};
export const canViewMap = async (req, res, next) => {
  try {
    const actor = req.user;                 // set by httpAuth
    const instituteId = actor?.instituteId; // present on your tokens/rows

    if (!instituteId) {
      return res.status(403).json({ message: "Map access not configured." });
    }

    const inst = await Institute.findByPk(instituteId);
    if (!inst) return res.status(404).json({ message: "Institute not found." });

    if (inst.mapAccess !== true) {
      return res.status(403).json({ message: "Map access disabled by superadmin." });
    }

    next();
  } catch (e) {
    return res.status(500).json({ message: "Map access check failed." });
  }
};

