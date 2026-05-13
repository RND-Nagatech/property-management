import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { requireAuth, signToken } from "../auth.js";

export const authRouter = express.Router();

function toPublicCustomer(c) {
  if (!c) return null;
  const obj = typeof c.toObject === "function" ? c.toObject() : c;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, __v, ...rest } = obj;
  return rest;
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["namaLengkap", "noHp", "email", "password"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }
    const email = String(body.email).trim().toLowerCase();
    const noHp = String(body.noHp).trim();
    const namaLengkap = String(body.namaLengkap).trim();
    const password = String(body.password);
    if (password.length < 6) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Password minimal 6 karakter" } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await Customer.create({
      namaLengkap,
      noHp,
      email,
      nik: String(body.nik ?? "").trim(),
      alamat: String(body.alamat ?? "").trim(),
      passwordHash,
    });

    const token = signToken({ sub: String(created._id), role: "customer" });
    res.status(201).json({ data: { token, customer: toPublicCustomer(created) } });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Email atau No HP sudah digunakan" } });
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const identifier = String(body.identifier ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!identifier || !password) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "identifier dan password wajib" } });
    }

    const customer = await Customer.findOne({
      $or: [{ email: identifier }, { noHp: identifier }],
    });
    if (!customer) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Email/No HP atau password salah" } });
    }

    const ok = await bcrypt.compare(password, customer.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Email/No HP atau password salah" } });
    }

    const token = signToken({ sub: String(customer._id), role: "customer" });
    res.json({ data: { token, customer: toPublicCustomer(customer) } });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }
    const customer = await Customer.findById(userId).select("-passwordHash -__v").lean();
    if (!customer) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User tidak ditemukan" } });
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
});

