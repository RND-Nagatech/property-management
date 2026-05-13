import express from "express";
import mongoose from "mongoose";
import { Payment } from "../models/Payment.js";
import { Booking } from "../models/Booking.js";
import { requireAuth } from "../auth.js";

export const paymentsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

paymentsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Payment.find({})
      .sort({ createdAt: -1 })
      .populate("bookingId")
      .populate("tamuId")
      .populate("customerId")
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// Customer submits payment proof (requires login)
paymentsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["bookingId", "metode", "jumlah"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }

    if (!mongoose.isValidObjectId(String(body.bookingId))) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingId tidak valid" } });
    }

    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }

    const booking = await Booking.findById(body.bookingId);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    if (String(booking.customerId ?? "") !== userId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Tidak punya akses" } });
    }

    const invoice = String(body.invoice ?? booking.kodeBooking ?? "").trim() || `INV-${booking._id}`;

    const created = await Payment.create({
      invoice,
      bookingId: booking._id,
      customerId: userId,
      metode: String(body.metode),
      jumlah: Number(body.jumlah),
      proofImage: String(body.proofImage ?? ""),
      status: "waiting_confirmation",
      catatan: String(body.catatan ?? ""),
    });

    booking.paymentStatus = "waiting_confirmation";
    booking.bookingStatus = "waiting_confirmation";
    booking.status = "Menunggu";
    await booking.save();

    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Invoice sudah digunakan" } });
    }
    next(err);
  }
});

paymentsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const updated = await Payment.findByIdAndUpdate(req.params.id, req.body ?? {}, { new: true, runValidators: true })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const deleted = await Payment.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});
