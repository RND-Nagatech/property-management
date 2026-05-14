import express from "express";
import mongoose from "mongoose";
import { requireAdminAuth } from "../auth.js";
import { Testimonial } from "../models/Testimonial.js";
import { Booking } from "../models/Booking.js";
import { Customer } from "../models/Customer.js";

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

// Admin: create testimonial manually by booking code (for legacy/migration)
adminTestimonialsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const bookingCode = String(body.bookingCode ?? "").trim();
    const comment = String(body.comment ?? "").trim();
    const rating = Number(body.rating ?? 5) || 5;
    const isActive = Boolean(body.isActive ?? false);

    if (!bookingCode) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingCode wajib" } });
    }
    if (!comment) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "comment wajib" } });
    }

    const booking = await Booking.findOne({ kodeBooking: bookingCode }).lean();
    if (!booking) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    }
    if (booking.bookingStatus !== "checked_out") {
      return res
        .status(409)
        .json({ error: { code: "NOT_ALLOWED", message: "Testimoni hanya bisa setelah check-out" } });
    }
    if (!booking.customerId) {
      return res
        .status(409)
        .json({ error: { code: "NOT_ALLOWED", message: "Booking ini tidak punya customerId" } });
    }

    const customer = await Customer.findById(booking.customerId).select({ namaLengkap: 1 }).lean();
    const guestName = String(customer?.namaLengkap ?? booking.guestSnapshot?.namaLengkap ?? "Tamu").trim();

    const created = await Testimonial.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      guestName,
      rating: Math.max(1, Math.min(5, rating)),
      comment,
      isActive,
    });
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Testimoni untuk booking ini sudah ada" } });
    }
    next(err);
  }
});

// Admin: update testimonial
adminTestimonialsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const body = req.body ?? {};
    const patch = {};
    if (body.comment != null) patch.comment = String(body.comment ?? "").trim();
    if (body.rating != null) patch.rating = Math.max(1, Math.min(5, Number(body.rating ?? 5) || 5));
    if (body.isActive != null) patch.isActive = Boolean(body.isActive);
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Tidak ada perubahan" } });
    }

    const item = await Testimonial.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!item) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Testimoni tidak ditemukan" } });
    res.json({ data: item.toObject() });
  } catch (err) {
    next(err);
  }
});

// Admin: delete testimonial
adminTestimonialsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const deleted = await Testimonial.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Testimoni tidak ditemukan" } });
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
