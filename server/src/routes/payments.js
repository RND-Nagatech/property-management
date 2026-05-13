import express from "express";
import mongoose from "mongoose";
import { Payment } from "../models/Payment.js";

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
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["invoice", "bookingId", "tamuId", "metode", "jumlah"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }
    const created = await Payment.create(body);
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

