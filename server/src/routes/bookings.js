import express from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";

export const bookingsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

bookingsRouter.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const kodeBooking = typeof req.query.kodeBooking === "string" ? req.query.kodeBooking.trim() : "";
    const tamuId = typeof req.query.tamuId === "string" ? req.query.tamuId : "";
    const roomTypeId = typeof req.query.roomTypeId === "string" ? req.query.roomTypeId : "";
    const validStatuses = ["Menunggu", "Dikonfirmasi", "Check-in", "Check-out", "Dibatalkan"];
    const match = {
      kodeBooking: { $exists: true, $ne: null },
      status: { $in: validStatuses },
      ...(status ? { status } : {}),
      ...(kodeBooking ? { kodeBooking } : {}),
      ...(tamuId && mongoose.isValidObjectId(tamuId) ? { tamuId } : {}),
      ...(roomTypeId && mongoose.isValidObjectId(roomTypeId) ? { roomTypeId } : {}),
    };
    const items = await Booking.find(match)
      .sort({ createdAt: -1 })
      .populate("tamuId")
      .populate("roomTypeId")
      .populate("roomId")
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/by-code/:code", async (req, res, next) => {
  try {
    const kodeBooking = String(req.params.code ?? "").trim();
    const booking = await Booking.findOne({ kodeBooking })
      .populate("tamuId")
      .populate("roomTypeId")
      .populate("roomId")
      .select("-__v")
      .lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["kodeBooking", "tamuId", "roomTypeId", "checkIn", "checkOut"];
    for (const k of required) {
      if (!body[k]) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
      }
    }
    const created = await Booking.create(body);
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Kode booking sudah digunakan" } });
    }
    next(err);
  }
});

bookingsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body ?? {}, {
      new: true,
      runValidators: true,
    })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/:id/check-in", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    booking.status = "Check-in";
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "terisi" });
    }

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/:id/check-out", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    booking.status = "Check-out";
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "tersedia" });
    }

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const deleted = await Booking.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});
