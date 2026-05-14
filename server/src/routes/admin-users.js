import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AdminUser } from "../models/AdminUser.js";
import { requireAdminAuth } from "../auth.js";

export const adminUsersRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function toPublic(u) {
  if (!u) return null;
  const obj = typeof u.toObject === "function" ? u.toObject() : u;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, __v, ...rest } = obj;
  return rest;
}

adminUsersRouter.use(requireAdminAuth);

adminUsersRouter.get("/", async (_req, res, next) => {
  try {
    const list = await AdminUser.find({}).sort({ createdAt: -1 }).select("-passwordHash -__v").lean();
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

adminUsersRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const nama = String(body.nama ?? "").trim();
    if (!username || !password) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "username dan password wajib" } });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Password minimal 6 karakter" } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await AdminUser.create({ username, nama, passwordHash, role: "admin", isActive: true });
    res.status(201).json({ data: toPublic(created) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Username sudah digunakan" } });
    }
    next(err);
  }
});

adminUsersRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const body = req.body ?? {};
    const patch = {};
    if (typeof body.nama === "string") patch.nama = body.nama;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    if (typeof body.password === "string" && body.password) {
      if (String(body.password).length < 6) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Password minimal 6 karakter" } });
      }
      patch.passwordHash = await bcrypt.hash(String(body.password), 10);
    }
    const updated = await AdminUser.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User admin tidak ditemukan" } });
    res.json({ data: toPublic(updated) });
  } catch (err) {
    next(err);
  }
});

