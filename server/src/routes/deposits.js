import express from "express";
import mongoose from "mongoose";
import { Deposit } from "../models/Deposit.js";
import { Booking } from "../models/Booking.js";

export const depositsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

depositsRouter.get("/", async (_req, res, next) => {
  try {
    const bookingId = typeof _req.query.bookingId === "string" ? _req.query.bookingId : "";
    const match = bookingId && isObjectId(bookingId) ? { bookingId } : {};

    const items = await Deposit.find(match)
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

depositsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["bookingId", "jumlah"];
    for (const k of required) {
      const v = body[k];
      if (v === undefined || v === null || v === "") {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
      }
    }

    // If tamuId not provided (customer booking), resolve snapshot/customerId from booking
    const bookingId = String(body.bookingId);
    if (!isObjectId(bookingId)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingId tidak valid" } });
    }
    const booking = await Booking.findById(bookingId).select({ tamuId: 1, customerId: 1, guestSnapshot: 1 }).lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    const created = await Deposit.create({
      ...body,
      tamuId: body.tamuId && isObjectId(String(body.tamuId)) ? body.tamuId : booking.tamuId,
      customerId: booking.customerId ?? body.customerId,
      guestSnapshot: booking.guestSnapshot ?? body.guestSnapshot,
    });
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    next(err);
  }
});

depositsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const updated = await Deposit.findByIdAndUpdate(req.params.id, req.body ?? {}, { new: true, runValidators: true })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Deposit tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

depositsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const deleted = await Deposit.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Deposit tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});
