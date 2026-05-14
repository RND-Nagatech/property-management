import express from "express";
import mongoose from "mongoose";
import { RoomType } from "../models/RoomType.js";
import { Room } from "../models/Room.js";

export const roomTypesRouter = express.Router();

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

roomTypesRouter.get("/", async (req, res, next) => {
  try {
    const includeInactive = String(req.query.includeInactive ?? "0") === "1";
    const match = includeInactive ? {} : { isActive: true };

    const items = await RoomType.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "roomTypeId",
          as: "rooms",
        },
      },
      {
        $addFields: {
          totalKamar: { $size: "$rooms" },
          kamarTersedia: {
            $size: {
              $filter: {
                input: "$rooms",
                as: "r",
                cond: { $eq: ["$$r.status", "tersedia"] },
              },
            },
          },
        },
      },
      { $project: { __v: 0, rooms: 0 } },
    ]);

    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

roomTypesRouter.get("/:slug", async (req, res, next) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    const roomType = await RoomType.findOne({ slug }).select("-__v").lean();
    if (!roomType) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tipe kamar tidak ditemukan" } });

    const counts = await Room.aggregate([
      { $match: { roomTypeId: roomType._id } },
      {
        $group: {
          _id: "$roomTypeId",
          totalKamar: { $sum: 1 },
          kamarTersedia: { $sum: { $cond: [{ $eq: ["$status", "tersedia"] }, 1, 0] } },
        },
      },
    ]);
    const c = counts[0] ?? { totalKamar: 0, kamarTersedia: 0 };

    res.json({ data: { ...roomType, totalKamar: c.totalKamar, kamarTersedia: c.kamarTersedia } });
  } catch (err) {
    next(err);
  }
});

roomTypesRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const slug = normalizeSlug(body.slug ?? body.namaTipe);
    if (!body.namaTipe || !slug) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "namaTipe dan slug wajib" } });
    }

    const created = await RoomType.create({
      ...body,
      slug,
    });

    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Slug sudah digunakan" } });
    }
    next(err);
  }
});

roomTypesRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const body = req.body ?? {};
    const nextSlug = body.slug
      ? normalizeSlug(body.slug)
      : body.namaTipe
        ? normalizeSlug(body.namaTipe)
        : undefined;

    const updated = await RoomType.findByIdAndUpdate(
      req.params.id,
      { ...body, ...(nextSlug ? { slug: nextSlug } : {}) },
      { new: true, runValidators: true }
    )
      .select("-__v")
      .lean();

    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tipe kamar tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Slug sudah digunakan" } });
    }
    next(err);
  }
});

// "hapus/nonaktifkan" -> soft delete
roomTypesRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }

    const updated = await RoomType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
      .select("-__v")
      .lean();

    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tipe kamar tidak ditemukan" } });

    // Optional: mark rooms as not available when type inactive? (leave as-is for now)
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
