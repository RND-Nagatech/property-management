import express from "express";
import mongoose from "mongoose";
import { Room } from "../models/Room.js";

export const roomsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

roomsRouter.get("/", async (req, res, next) => {
  try {
    const roomTypeId = typeof req.query.roomTypeId === "string" ? req.query.roomTypeId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const match = roomTypeId && isObjectId(roomTypeId) ? { roomTypeId } : {};
    const matchWithStatus = {
      ...match,
      ...(status ? { status } : {}),
    };

    const rooms = await Room.find(matchWithStatus)
      .sort({ createdAt: -1 })
      .populate("roomTypeId")
      .select("-__v")
      .lean();

    res.json({ data: rooms });
  } catch (err) {
    next(err);
  }
});

roomsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (!body.nomorKamar || !body.roomTypeId) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "nomorKamar dan roomTypeId wajib" } });
    }
    const created = await Room.create(body);
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Nomor kamar sudah digunakan" } });
    }
    next(err);
  }
});

roomsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const updated = await Room.findByIdAndUpdate(req.params.id, req.body ?? {}, {
      new: true,
      runValidators: true,
    })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Kamar tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Nomor kamar sudah digunakan" } });
    }
    next(err);
  }
});

roomsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const deleted = await Room.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Kamar tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});
