import express from "express";
import mongoose from "mongoose";
import { Setting } from "../models/Setting.js";

export const settingsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

settingsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Setting.find({}).sort({ key: 1 }).select("-__v").lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

settingsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (!body.key) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "key wajib" } });
    const created = await Setting.create(body);
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Key sudah ada" } });
    }
    next(err);
  }
});

settingsRouter.put("/by-key/:key", async (req, res, next) => {
  try {
    const key = String(req.params.key ?? "").trim();
    if (!key) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "key wajib" } });
    const value = (req.body ?? {}).value;
    const updated = await Setting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true, runValidators: true }
    )
      .select("-__v")
      .lean();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

settingsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const updated = await Setting.findByIdAndUpdate(req.params.id, req.body ?? {}, { new: true, runValidators: true })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pengaturan tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

settingsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const deleted = await Setting.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pengaturan tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});
