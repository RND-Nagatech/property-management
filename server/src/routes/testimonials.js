import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireAdminAuth } from "../auth.js";
import { Testimonial } from "../models/Testimonial.js";
import { Booking } from "../models/Booking.js";
import { Customer } from "../models/Customer.js";

export const testimonialsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

// Public testimonials for landing (active only)
testimonialsRouter.get("/public", async (_req, res, next) => {
  try {
    const items = await Testimonial.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(12)
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// Customer: create testimonial for a checked_out booking they own
testimonialsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }
    const body = req.body ?? {};
    const bookingId = String(body.bookingId ?? "");
    const comment = String(body.comment ?? "").trim();
    const rating = Number(body.rating ?? 5) || 5;
    if (!bookingId || !isObjectId(bookingId)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingId tidak valid" } });
    }
    if (!comment) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "comment wajib" } });
    }

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    if (String(booking.customerId ?? "") !== userId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Tidak punya akses" } });
    }
    if (booking.bookingStatus !== "checked_out") {
      return res.status(409).json({ error: { code: "NOT_ALLOWED", message: "Testimoni hanya bisa setelah check-out" } });
    }

    const customer = await Customer.findById(userId).select({ namaLengkap: 1 }).lean();
    const guestName = String(customer?.namaLengkap ?? booking.guestSnapshot?.namaLengkap ?? "Tamu").trim();

    const created = await Testimonial.create({
      bookingId: booking._id,
      customerId: userId,
      guestName,
      rating: Math.max(1, Math.min(5, rating)),
      comment,
      isActive: false,
    });

    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Testimoni untuk booking ini sudah ada" } });
    }
    next(err);
  }
});

// Customer: check if booking already has testimonial
testimonialsRouter.get("/by-booking/:bookingId", requireAuth, async (req, res, next) => {
  try {
    const bookingId = String(req.params.bookingId ?? "");
    if (!isObjectId(bookingId)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingId tidak valid" } });
    }
    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }
    const booking = await Booking.findById(bookingId).select({ customerId: 1 }).lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    if (String(booking.customerId ?? "") !== userId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Tidak punya akses" } });
    }
    const item = await Testimonial.findOne({ bookingId }).select("-__v").lean();
    res.json({ data: item ?? null });
  } catch (err) {
    next(err);
  }
});

// Admin: list all testimonials
testimonialsRouter.get("/admin", requireAdminAuth, async (_req, res, next) => {
  try {
    const items = await Testimonial.find({}).sort({ createdAt: -1 }).select("-__v").lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// Admin: activate/deactivate
testimonialsRouter.post("/admin/:id/toggle", requireAdminAuth, async (req, res, next) => {
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

