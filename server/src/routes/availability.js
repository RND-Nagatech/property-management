import express from "express";
import mongoose from "mongoose";
import { RoomType } from "../models/RoomType.js";
import { Room } from "../models/Room.js";
import { Booking } from "../models/Booking.js";

export const availabilityRouter = express.Router();

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 0, 0, 0, 0);
}

function overlapsRange(checkIn, checkOut, from, toExclusive) {
  // booking overlaps range [from, toExclusive) if checkIn < toExclusive AND checkOut > from
  return checkIn < toExclusive && checkOut > from;
}

function bookingIsActive(b) {
  const bs = b.bookingStatus;
  const legacy = b.status;
  if (bs) return ["pending_payment", "waiting_confirmation", "confirmed", "checked_in"].includes(bs);
  return ["Menunggu", "Dikonfirmasi", "Check-in"].includes(legacy);
}

function bookingQtyForType(booking, typeId) {
  const target = String(typeId);
  const items = Array.isArray(booking?.bookingItems) ? booking.bookingItems : [];
  if (items.length) {
    return items.reduce((acc, it) => {
      if (!it?.roomTypeId) return acc;
      if (String(it.roomTypeId) !== target) return acc;
      const q = Number(it.quantity ?? 0) || 0;
      return acc + Math.max(0, q);
    }, 0);
  }
  if (booking?.roomTypeId && String(booking.roomTypeId) === target) return 1;
  return 0;
}

availabilityRouter.get("/", async (req, res, next) => {
  try {
    const fromRaw = typeof req.query.from === "string" ? req.query.from : "";
    const toRaw = typeof req.query.to === "string" ? req.query.to : "";
    const roomTypeId = typeof req.query.roomTypeId === "string" ? req.query.roomTypeId : "";
    const includeInactive = String(req.query.includeInactive ?? "0") === "1";

    const from = startOfDay(new Date(fromRaw));
    const to = startOfDay(new Date(toRaw));
    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "from dan to wajib (YYYY-MM-DD)" } });
    }
    if (to < from) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "to harus >= from" } });
    }

    // to is inclusive day in API; convert to exclusive end (next day)
    const toExclusive = addDays(to, 1);

    const matchType = includeInactive ? {} : { isActive: true };
    if (roomTypeId) {
      if (!mongoose.isValidObjectId(roomTypeId)) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "roomTypeId tidak valid" } });
      }
      matchType._id = new mongoose.Types.ObjectId(roomTypeId);
    }

    const types = await RoomType.find(matchType).select({ __v: 0 }).lean();
    const typeIds = types.map((t) => t._id);

    // Total kamar aktif per type (exclude perbaikan)
    const roomCounts = await Room.aggregate([
      { $match: { roomTypeId: { $in: typeIds }, status: { $ne: "perbaikan" } } },
      { $group: { _id: "$roomTypeId", total: { $sum: 1 } } },
    ]);
    const totalByType = new Map(roomCounts.map((r) => [String(r._id), r.total]));

    // Fetch bookings overlapping range for these types (active only).
    // Support both legacy (roomTypeId) and new (bookingItems.roomTypeId).
    const bookings = await Booking.find({
      $or: [{ roomTypeId: { $in: typeIds } }, { "bookingItems.roomTypeId": { $in: typeIds } }],
      checkIn: { $lt: toExclusive },
      checkOut: { $gt: from },
    })
      .select({ roomTypeId: 1, bookingItems: 1, checkIn: 1, checkOut: 1, bookingStatus: 1, status: 1 })
      .lean();

    const activeBookings = bookings.filter(bookingIsActive);

    // Build day list
    const days = [];
    for (let d = new Date(from); d < toExclusive; d = addDays(d, 1)) {
      days.push(startOfDay(d));
    }

    const result = types.map((t) => {
      const total = totalByType.get(String(t._id)) ?? 0;
      const perDay = days.map((day) => {
        const nextDay = addDays(day, 1);
        const booked = activeBookings.reduce((acc, b) => {
          const ci = new Date(b.checkIn);
          const co = new Date(b.checkOut);
          if (!isValidDate(ci) || !isValidDate(co)) return acc;
          if (!overlapsRange(ci, co, day, nextDay)) return acc;
          return acc + bookingQtyForType(b, t._id);
        }, 0);
        const available = Math.max(0, total - booked);
        const status =
          available <= 0
            ? "FULL_BOOKED"
            : booked > 0
              ? "PARTIAL_BOOKED"
              : "AVAILABLE";
        return { date: toYmd(day), total, booked, available, status };
      });
      return { roomType: { _id: t._id, namaTipe: t.namaTipe, slug: t.slug }, days: perDay };
    });

    // If roomTypeId requested, return single object for convenience
    if (roomTypeId) {
      return res.json({ data: result[0] ?? { roomType: null, days: [] } });
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
