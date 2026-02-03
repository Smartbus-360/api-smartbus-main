import HomepageContent from "../models/homepageContent.model.js";
import { errorHandler } from "../utils/error.js";

export const addHomepageContent = async (req, res, next) => {
  try {
    // only SUPER ADMIN
    if (req.user.isAdmin !== 1) {
      return next(errorHandler(403, "Access denied"));
    }

    const { title, description, type, instituteId } = req.body;

    if (!title || !type) {
      return next(errorHandler(400, "Title and type are required"));
    }

    if (!req.file) {
      return next(errorHandler(400, "Image is required"));
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const content = await HomepageContent.create({
      title,
      description,
      type,
      instituteId: instituteId || null,
      imageUrl,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Homepage content added",
      data: content,
    });
  } catch (err) {
    next(err);
  }
};
export const getHomepageContent = async (req, res, next) => {
  try {
    const content = await HomepageContent.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(content);
  } catch (err) {
    next(err);
  }
};
