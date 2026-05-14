import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AdminUser } from "../models/AdminUser.js";
import { requireAdminAuth, signToken } from "../auth.js";

export const adminAuthRouter = express.Router();

function toPublicAdmin(u) {
  if (!u) return null;
  const obj = typeof u.toObject === "function" ? u.toObject() : u;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, __v, ...rest } = obj;
  return rest;
}

adminAuthRouter.post("/login", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!username || !password) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "username dan password wajib" } });
    }

    const admin = await AdminUser.findOne({ username, isActive: true });
    if (!admin) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Username atau password salah" } });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Username atau password salah" } });
    }

    const token = signToken({ sub: String(admin._id), role: "admin" });
    res.json({ data: { token, admin: toPublicAdmin(admin) } });
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.get("/me", requireAdminAuth, async (req, res, next) => {
  try {
    const adminId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(adminId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }
    const admin = await AdminUser.findById(adminId).select("-passwordHash -__v").lean();
    if (!admin) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Admin tidak ditemukan" } });
    res.json({ data: admin });
  } catch (err) {
    next(err);
  }
});

