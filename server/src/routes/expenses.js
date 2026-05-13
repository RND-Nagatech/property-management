import express from "express";
import mongoose from "mongoose";
import { Expense } from "../models/Expense.js";

export const expensesRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

expensesRouter.get("/", async (req, res, next) => {
  try {
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : null;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : null;

    const match = {};
    if (from && !Number.isNaN(from.getTime())) match.tanggal = { ...(match.tanggal ?? {}), $gte: from };
    if (to && !Number.isNaN(to.getTime())) match.tanggal = { ...(match.tanggal ?? {}), $lte: to };

    const items = await Expense.find(match).sort({ tanggal: -1 }).select("-__v").lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

expensesRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["tanggal", "kategori", "deskripsi", "jumlah"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }
    const created = await Expense.create(body);
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    next(err);
  }
});

expensesRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body ?? {}, { new: true, runValidators: true })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Biaya tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

expensesRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const deleted = await Expense.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Biaya tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});

