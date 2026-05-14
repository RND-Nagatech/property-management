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
    const required = ["roomTypeId", "checkIn", "checkOut"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }
    if (!mongoose.isValidObjectId(String(body.roomTypeId))) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "roomTypeId tidak valid" } });
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

    // Find an available physical room of this type that has no overlapping active booking
    const rooms = await Room.find({ roomTypeId: body.roomTypeId, status: "tersedia" })
      .sort({ nomorKamar: 1 })
      .select({ _id: 1 })
      .lean();

    let assignedRoomId = null;
    for (const r of rooms) {
      const conflict = await Booking.exists({
        roomId: r._id,
        $or: [
          { bookingStatus: { $in: ["pending_payment", "waiting_confirmation", "confirmed", "checked_in"] } },
          { bookingStatus: { $exists: false }, status: { $in: ["Menunggu", "Dikonfirmasi", "Check-in"] } },
        ],
        ...overlaps(checkIn, checkOut),
      });
      if (!conflict) {
        assignedRoomId = r._id;
        break;
      }
    }
    if (!assignedRoomId) {
      return res.status(409).json({ error: { code: "NO_AVAILABILITY", message: "Kamar tidak tersedia di tanggal tersebut" } });
    }

    const roomType = await RoomType.findById(body.roomTypeId).select({ hargaDefault: 1, depositDefault: 1 }).lean();
    if (!roomType) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tipe kamar tidak ditemukan" } });
    }

    const msDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msDay));
    const pricePerNight = Number(roomType.hargaDefault ?? 0);
    const deposit = Number(roomType.depositDefault ?? 0);
    const subtotal = pricePerNight * nights;
    const total = subtotal + deposit;

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
      roomTypeId: body.roomTypeId,
      roomId: assignedRoomId,
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

    await Room.findByIdAndUpdate(assignedRoomId, { status: "dipesan" });
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

    // MVP: customer hanya boleh cancel sebelum confirmed/checked-in
    const bs = booking.bookingStatus ?? "pending_payment";
    if (bs === "confirmed" || bs === "checked_in" || bs === "checked_out") {
      return res.status(409).json({ error: { code: "NOT_ALLOWED", message: "Booking tidak bisa dibatalkan" } });
    }

    booking.bookingStatus = "cancelled";
    booking.paymentStatus = booking.paymentStatus === "paid" ? booking.paymentStatus : "failed";
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "tersedia" });
    }

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
