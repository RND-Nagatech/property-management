import express from "express";
import mongoose from "mongoose";
import { requireAdminAuth } from "../auth.js";
import { Testimonial } from "../models/Testimonial.js";

export const adminTestimonialsRouter = express.Router();
adminTestimonialsRouter.use(requireAdminAuth);

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

// Admin: list all testimonials
adminTestimonialsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Testimonial.find({}).sort({ createdAt: -1 }).select("-__v").lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// Admin: activate/deactivate
adminTestimonialsRouter.post("/:id/toggle", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const item = await Testimonial.findById(req.params.id);
    if (!item) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Testimoni tidak ditemukan" } });
    item.isActive = !item.isActive;
    await item.save();
    res.json({ data: item.toObject() });
  } catch (err) {
    next(err);
  }
});

