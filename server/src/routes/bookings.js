import express from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";
import { requireAuth } from "../auth.js";
import { Customer } from "../models/Customer.js";
import { RoomType } from "../models/RoomType.js";
import { generateBookingCode } from "../utils/booking-code.js";

export const bookingsRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function overlaps(checkIn, checkOut) {
  return {
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
}

function mapBookingStatusToLegacy(status) {
  switch (status) {
    case "pending_payment":
    case "waiting_confirmation":
      return "Menunggu";
    case "confirmed":
      return "Dikonfirmasi";
    case "checked_in":
      return "Check-in";
    case "checked_out":
      return "Check-out";
    case "cancelled":
      return "Dibatalkan";
    default:
      return "Menunggu";
  }
}

bookingsRouter.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const kodeBooking = typeof req.query.kodeBooking === "string" ? req.query.kodeBooking.trim() : "";
    const tamuId = typeof req.query.tamuId === "string" ? req.query.tamuId : "";
    const roomTypeId = typeof req.query.roomTypeId === "string" ? req.query.roomTypeId : "";
    const validStatuses = ["Menunggu", "Dikonfirmasi", "Check-in", "Check-out", "Dibatalkan"];
    const match = {
      kodeBooking: { $exists: true, $ne: null },
      status: { $in: validStatuses },
      ...(status ? { status } : {}),
      ...(kodeBooking ? { kodeBooking } : {}),
      ...(tamuId && mongoose.isValidObjectId(tamuId) ? { tamuId } : {}),
      ...(roomTypeId && mongoose.isValidObjectId(roomTypeId) ? { roomTypeId } : {}),
    };
    const items = await Booking.find(match)
      .sort({ createdAt: -1 })
      .populate("tamuId")
      .populate("roomTypeId")
      .populate("roomId")
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// Customer bookings (requires login)
bookingsRouter.get("/my", requireAuth, async (req, res, next) => {
  try {
    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }
    const items = await Booking.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .populate("roomTypeId")
      .populate("roomId")
      .populate("bookingItems.roomTypeId")
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/by-code/:code", async (req, res, next) => {
  try {
    const kodeBooking = String(req.params.code ?? "").trim();
    const booking = await Booking.findOne({ kodeBooking })
      .populate("tamuId")
      .populate("roomTypeId")
      .populate("roomId")
      .populate("bookingItems.roomTypeId")
      .select("-__v")
      .lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
});

// Get booking by id (customer access)
bookingsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id)
      .populate("roomTypeId")
      .populate("roomId")
      .populate("bookingItems.roomTypeId")
      .select("-__v")
      .lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    if (String(booking.customerId ?? "") !== userId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Tidak punya akses" } });
    }
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
});

// Create booking (customer must login). Auto-generate kodeBooking (BK-yymmdd-xxx) + auto assign physical room.
bookingsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["checkIn", "checkOut"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }
    const bookingItemsInput = Array.isArray(body.bookingItems) ? body.bookingItems : null;
    const legacyRoomTypeId = body.roomTypeId ? String(body.roomTypeId) : "";
    if (bookingItemsInput && bookingItemsInput.length > 0) {
      for (const it of bookingItemsInput) {
        if (!it?.roomTypeId) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingItems.roomTypeId wajib" } });
        }
        if (!mongoose.isValidObjectId(String(it.roomTypeId))) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingItems.roomTypeId tidak valid" } });
        }
        const q = Number(it.quantity ?? 0);
        if (!Number.isFinite(q) || q < 1) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingItems.quantity minimal 1" } });
        }
      }
    } else {
      if (!legacyRoomTypeId) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "roomTypeId atau bookingItems wajib" } });
      }
      if (!mongoose.isValidObjectId(legacyRoomTypeId)) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "roomTypeId tidak valid" } });
      }
    }
    function parseLocalDate(value) {
      const s = String(value ?? "").trim();
      if (!s) return new Date("invalid");
      // If it's a plain YYYY-MM-DD, force local midnight to avoid UTC shift.
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
      return new Date(s);
    }

    const checkIn = parseLocalDate(body.checkIn);
    const checkOut = parseLocalDate(body.checkOut);
    if (!checkIn.getTime() || !checkOut.getTime()) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "checkIn/checkOut tidak valid" } });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "checkOut harus setelah checkIn" } });
    }

    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }

    const customer = await Customer.findById(userId).select("-passwordHash -__v").lean();
    if (!customer) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User tidak ditemukan" } });

    const msDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msDay));
    const bookingItems = [];
    let total = 0;
    let legacyAssignedRoomId = null;
    let legacyRoomTypeForCompat = legacyRoomTypeId || null;

    const itemsToCreate = bookingItemsInput && bookingItemsInput.length > 0
      ? bookingItemsInput.map((it) => ({ roomTypeId: String(it.roomTypeId), quantity: Number(it.quantity) }))
      : [{ roomTypeId: legacyRoomTypeId, quantity: 1 }];

    // Preload room types
    const roomTypeIds = [...new Set(itemsToCreate.map((it) => it.roomTypeId))];
    const roomTypes = await RoomType.find({ _id: { $in: roomTypeIds } })
      .select({ namaTipe: 1, hargaDefault: 1 })
      .lean();
    const roomTypeById = new Map(roomTypes.map((t) => [String(t._id), t]));
    for (const id of roomTypeIds) {
      if (!roomTypeById.has(String(id))) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tipe kamar tidak ditemukan" } });
      }
    }

    // Fetch all active conflicting bookings once (for room assignment exclusion)
    const conflictBookings = await Booking.find({
      $or: [
        { bookingStatus: { $in: ["pending_payment", "waiting_confirmation", "confirmed", "checked_in"] } },
        { bookingStatus: { $exists: false }, status: { $in: ["Menunggu", "Dikonfirmasi", "Check-in"] } },
      ],
      ...overlaps(checkIn, checkOut),
      $or: [{ roomId: { $exists: true } }, { "bookingItems.assignedRoomIds.0": { $exists: true } }],
    })
      .select({ roomId: 1, bookingItems: 1 })
      .lean();
    const takenRoomIds = new Set();
    for (const b of conflictBookings) {
      if (b.roomId) takenRoomIds.add(String(b.roomId));
      const its = Array.isArray(b.bookingItems) ? b.bookingItems : [];
      for (const it of its) {
        for (const rid of it?.assignedRoomIds ?? []) takenRoomIds.add(String(rid));
      }
    }

    // Assign rooms per item quantity
    for (const it of itemsToCreate) {
      const rt = roomTypeById.get(String(it.roomTypeId));
      const pricePerNight = Number(rt?.hargaDefault ?? 0);
      const quantity = Math.max(1, Number(it.quantity ?? 1));

      const rooms = await Room.find({ roomTypeId: it.roomTypeId, status: { $ne: "perbaikan" } })
        .sort({ nomorKamar: 1 })
        .select({ _id: 1 })
        .lean();

      const assignedRoomIds = [];
      for (const r of rooms) {
        if (takenRoomIds.has(String(r._id))) continue;
        assignedRoomIds.push(r._id);
        takenRoomIds.add(String(r._id));
        if (assignedRoomIds.length >= quantity) break;
      }
      if (assignedRoomIds.length < quantity) {
        return res.status(409).json({
          error: { code: "NO_AVAILABILITY", message: `Kamar tidak tersedia untuk tipe ${rt?.namaTipe ?? ""}` },
        });
      }

      const subtotal = pricePerNight * nights * quantity;
      total += subtotal;
      bookingItems.push({
        roomTypeId: it.roomTypeId,
        roomTypeName: rt?.namaTipe ?? "",
        quantity,
        pricePerNight,
        totalNights: nights,
        subtotal,
        assignedRoomIds,
      });

      if (!legacyAssignedRoomId) legacyAssignedRoomId = assignedRoomIds[0] ?? null;
      if (!legacyRoomTypeForCompat) legacyRoomTypeForCompat = it.roomTypeId;
    }

    const kodeBooking = await generateBookingCode(new Date());
    const bookingStatus = "pending_payment";
    const paymentStatus = "unpaid";

    const created = await Booking.create({
      kodeBooking,
      tamuId: body.tamuId, // legacy (optional), keep if FE still sends
      customerId: userId,
      guestSnapshot: {
        namaLengkap: customer.namaLengkap ?? "",
        noHp: customer.noHp ?? "",
        email: customer.email ?? "",
        nik: customer.nik ?? "",
        alamat: customer.alamat ?? "",
      },
      roomTypeId: legacyRoomTypeForCompat,
      roomId: legacyAssignedRoomId,
      bookingItems: bookingItemsInput && bookingItemsInput.length > 0 ? bookingItems : undefined,
      checkIn,
      checkOut,
      dewasa: Number(body.dewasa ?? 2),
      anak: Number(body.anak ?? 0),
      catatan: String(body.catatan ?? ""),
      total,
      bookingStatus,
      paymentStatus,
      status: mapBookingStatusToLegacy(bookingStatus),
    });

    // Do not change Room.status here. Availability is calculated by booking overlap.
    res.status(201).json({ data: created.toObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Kode booking sudah digunakan" } });
    }
    next(err);
  }
});

bookingsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body ?? {}, {
      new: true,
      runValidators: true,
    })
      .select("-__v")
      .lean();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/:id/check-in", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    booking.status = "Check-in";
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "terisi" });
    }
    const items = Array.isArray(booking.bookingItems) ? booking.bookingItems : [];
    const roomIds = items.flatMap((it) => it?.assignedRoomIds ?? []).filter(Boolean);
    if (roomIds.length) {
      await Room.updateMany({ _id: { $in: roomIds } }, { $set: { status: "terisi" } });
    }

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/:id/check-out", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    booking.status = "Check-out";
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "tersedia" });
    }
    const items = Array.isArray(booking.bookingItems) ? booking.bookingItems : [];
    const roomIds = items.flatMap((it) => it?.assignedRoomIds ?? []).filter(Boolean);
    if (roomIds.length) {
      await Room.updateMany({ _id: { $in: roomIds } }, { $set: { status: "tersedia" } });
    }

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});

// Customer cancel booking (requires login + ownership)
bookingsRouter.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const userId = String(req.user?.sub ?? "");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    if (String(booking.customerId ?? "") !== userId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Tidak punya akses" } });
    }

    // Customer hanya boleh cancel sebelum check-in.
    const bs = booking.bookingStatus ?? "pending_payment";
    if (bs === "checked_in" || bs === "checked_out" || bs === "cancelled") {
      return res.status(409).json({ error: { code: "NOT_ALLOWED", message: "Booking tidak bisa dibatalkan" } });
    }

    booking.bookingStatus = "cancelled";
    // Jika sudah paid/approved: tidak ada refund, status payment tetap.
    // Jika belum paid: anggap batal sebelum bayar.
    booking.paymentStatus = booking.paymentStatus === "paid" ? booking.paymentStatus : booking.paymentStatus;
    booking.refundStatus = booking.paymentStatus === "paid" ? "NO_REFUND" : booking.refundStatus;
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const deleted = await Booking.findByIdAndDelete(req.params.id).select("-__v").lean();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});
