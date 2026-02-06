import express from "express";
import { createHomeContent } from "../controllers/homeContent.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/home-content", verifyToken, createHomeContent);

export default router;
