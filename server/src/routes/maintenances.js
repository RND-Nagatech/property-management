import express from "express";
import mongoose from "mongoose";
import { Maintenance } from "../models/Maintenance.js";

export const maintenancesRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

maintenancesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Maintenance.find({})
      .sort({ createdAt: -1 })
      .populate("roomId")
      .populate("roomTypeId")
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

maintenancesRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (!body.judul) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "judul wajib" } });
    const created = await Maintenance.create(body);
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    next(err);
  }
});

maintenancesRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const updated = await Maintenance.findByIdAndUpdate(req.params.id, req.body ?? {}, { new: true, runValidators: true })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Kerusakan tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

maintenancesRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const deleted = await Maintenance.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Kerusakan tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});

