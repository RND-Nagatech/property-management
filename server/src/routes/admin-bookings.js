import express from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";

export const adminBookingsRouter = express.Router();

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

adminBookingsRouter.get("/by-code/:bookingCode", async (req, res, next) => {
  try {
    const kodeBooking = String(req.params.bookingCode ?? "").trim();
    const booking = await Booking.findOne({ kodeBooking })
      .populate("roomTypeId")
      .populate("roomId")
      .populate("customerId")
      .select("-__v")
      .lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
});

adminBookingsRouter.post("/:id/check-in", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    const bookingStatus = booking.bookingStatus ?? (booking.status === "Dikonfirmasi" ? "confirmed" : undefined);
    const paymentStatus = booking.paymentStatus ?? "unpaid";

    if (!(paymentStatus === "paid" && bookingStatus === "confirmed")) {
      return res.status(409).json({
        error: { code: "NOT_ALLOWED", message: "Booking belum terkonfirmasi pembayaran" },
      });
    }

    booking.bookingStatus = "checked_in";
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "terisi" });
    }

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});

adminBookingsRouter.post("/:id/check-out", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    const bookingStatus = booking.bookingStatus ?? (booking.status === "Check-in" ? "checked_in" : undefined);
    if (bookingStatus !== "checked_in") {
      return res.status(409).json({ error: { code: "NOT_ALLOWED", message: "Booking belum check-in" } });
    }

    booking.bookingStatus = "checked_out";
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "tersedia" });
    }

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});
