import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import { Server as socketIO } from 'socket.io'; 
import cors from 'cors';
import profileRoutes from './routes/profile.route.js';
import adminRoutes from './routes/admin.route.js';
import apiRoutes from './routes/api.route.js';
import sequelize from './config/database.js';
import { configureSocket } from './controllers/socket.controller.js'; 
import cookieParser from 'cookie-parser';
import path from 'path';
import './cronJobs.js';
import { setupAssociations } from './models/associations.js';
import attendanceRoutes from "./routes/attendance.route.js";
import attendanceTakerRoutes from './routes/attendanceTaker.route.js';
import mapSubscriptionRoutes from "./routes/mapSubscription.route.js";
import razorpayRoutes from "./routes/razorpay.route.js";
import razorpayWebhookRoutes from "./routes/razorpayWebhook.route.js";


    setupAssociations();

// Sync models and setup associations
sequelize.sync().then(() => { //{ alter: true }
    // setupAssociations();
        console.log("DB synced with associations");
    //console.log('Database & tables created!');
}).catch(err => {
    console.error('Error syncing database:', err);
});


const app = express();
const server = http.createServer(app);
const io = new socketIO(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"],
        allowedHeaders: ["Authorization"], 
        credentials: true
    },
    // transports: ["websocket"], 
});

// Middleware
app.use(cors({
    origin: true,           // Reflect the request origin
    credentials: true       // Allow cookies/auth headers
}));


app.use(express.json());
app.use(cookieParser());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api', apiRoutes);
app.use('/api/attendance-taker', attendanceTakerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use("/api", razorpayRoutes);
app.use("/webhook", razorpayWebhookRoutes);
app.use("/api", mapSubscriptionRoutes);



app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        statusCode,
        message
    })
});

configureSocket(io);
export { io };

// Start server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
