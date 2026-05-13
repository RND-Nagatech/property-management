import express from "express";
import mongoose from "mongoose";
import { CalendarEvent } from "../models/CalendarEvent.js";

export const calendarRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

calendarRouter.get("/", async (req, res, next) => {
  try {
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : null;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : null;

    const match = {};
    if (from && !Number.isNaN(from.getTime())) match.tanggal = { ...(match.tanggal ?? {}), $gte: from };
    if (to && !Number.isNaN(to.getTime())) match.tanggal = { ...(match.tanggal ?? {}), $lte: to };

    const items = await CalendarEvent.find(match).sort({ tanggal: 1 }).select("-__v").lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

calendarRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (!body.tanggal || !body.label) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "tanggal dan label wajib" } });
    }
    const created = await CalendarEvent.create(body);
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    next(err);
  }
});

calendarRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const updated = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body ?? {}, { new: true, runValidators: true })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

calendarRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const deleted = await CalendarEvent.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});

