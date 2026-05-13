import express from "express";
import mongoose from "mongoose";
import { Guest } from "../models/Guest.js";
import { Booking } from "../models/Booking.js";

export const guestsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

guestsRouter.get("/", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const match = q
      ? {
          $or: [
            { nama: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { hp: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const items = await Guest.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "tamuId",
          as: "bookings",
        },
      },
      { $addFields: { totalBooking: { $size: "$bookings" } } },
      { $project: { __v: 0, bookings: 0 } },
    ]);
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

guestsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (!body.nama || !body.email || !body.hp) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "nama, email, hp wajib" } });
    }
    const created = await Guest.create(body);
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Email sudah terdaftar" } });
    }
    next(err);
  }
});

guestsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const updated = await Guest.findByIdAndUpdate(req.params.id, req.body ?? {}, {
      new: true,
      runValidators: true,
    })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tamu tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Email sudah terdaftar" } });
    }
    next(err);
  }
});

guestsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const hasBooking = await Booking.exists({ tamuId: req.params.id });
    if (hasBooking) {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Tamu masih memiliki booking, tidak bisa dihapus" },
      });
    }
    const deleted = await Guest.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tamu tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});

