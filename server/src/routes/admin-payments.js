import express from "express";
import mongoose from "mongoose";
import { Payment } from "../models/Payment.js";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";
import { requireAdminAuth } from "../auth.js";

export const adminPaymentsRouter = express.Router();
adminPaymentsRouter.use(requireAdminAuth);

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function mapBookingStatusToLegacy(status) {
  switch (status) {
    case "pending_payment":
    case "waiting_confirmation":
      return "Menunggu";
    case "confirmed":
      return "Dikonfirmasi";
    case "checked_in":
      return "Check-in";
    case "checked_out":
      return "Check-out";
    case "cancelled":
      return "Dibatalkan";
    default:
      return "Menunggu";
  }
}

adminPaymentsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Payment.find({})
      .sort({ createdAt: -1 })
      .populate("bookingId")
      .populate("customerId")
      .populate("tamuId")
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

adminPaymentsRouter.post("/:id/verify", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" } });

    payment.status = "paid";
    payment.verifiedAt = new Date();
    payment.verifiedBy = String(req.body?.verifiedBy ?? "admin");
    payment.rejectionReason = "";
    await payment.save();

    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.paymentStatus = "paid";
      booking.bookingStatus = "confirmed";
      booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
      await booking.save();
    }

    res.json({ data: payment.toObject() });
  } catch (err) {
    next(err);
  }
});

adminPaymentsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" } });

    const reason = String(req.body?.rejectionReason ?? req.body?.reason ?? "").trim();
    payment.status = "failed";
    payment.rejectionReason = reason;
    payment.verifiedAt = new Date();
    payment.verifiedBy = String(req.body?.verifiedBy ?? "admin");
    await payment.save();

    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.paymentStatus = "failed";
      booking.bookingStatus = "pending_payment";
      booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
      await booking.save();

      if (booking.roomId) {
        await Room.findByIdAndUpdate(booking.roomId, { status: "tersedia" });
      }
    }

    res.json({ data: payment.toObject() });
  } catch (err) {
    next(err);
  }
});
