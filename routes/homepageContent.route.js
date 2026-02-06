import express from "express";
import multer from "multer";
import { verifyToken } from "../utils/verifyUser.js";
import {
  addHomepageContent,
  getHomepageContent,
  deleteHomepageContent,
} from "../controllers/homepageContent.controller.js";

const router = express.Router();

// file upload config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// SUPER ADMIN
router.post(
  "/homepage-content",
  verifyToken,
  upload.single("image"),
  addHomepageContent
);
router.delete(
  "/homepage-content/:id",
  verifyToken,
  deleteHomepageContent
);


// PUBLIC
router.get("/homepage-content", getHomepageContent);

export default router;
