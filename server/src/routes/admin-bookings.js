import express from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";
import { Payment } from "../models/Payment.js";
import { RoomType } from "../models/RoomType.js";
import { Guest } from "../models/Guest.js";
import { requireAdminAuth } from "../auth.js";
import { generateBookingCode } from "../utils/booking-code.js";

export const adminBookingsRouter = express.Router();
adminBookingsRouter.use(requireAdminAuth);

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
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

function overlaps(checkIn, checkOut) {
  return {
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
}

function parseLocalDate(value) {
  const s = String(value ?? "").trim();
  if (!s) return new Date("invalid");
  // If it's a plain YYYY-MM-DD, force local midnight to avoid UTC shift.
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  return new Date(s);
}

// Admin creates booking for guest, optionally with immediate cash payment.
adminBookingsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const required = ["tamuId", "roomTypeId", "checkIn", "checkOut"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }
    const tamuId = String(body.tamuId);
    const roomTypeId = String(body.roomTypeId);
    if (!isObjectId(tamuId)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "tamuId tidak valid" } });
    if (!isObjectId(roomTypeId)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "roomTypeId tidak valid" } });

    const checkIn = parseLocalDate(body.checkIn);
    const checkOut = parseLocalDate(body.checkOut);
    if (!checkIn.getTime() || !checkOut.getTime()) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "checkIn/checkOut tidak valid" } });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "checkOut harus setelah checkIn" } });
    }

    const guest = await Guest.findById(tamuId).select({ nama: 1, hp: 1, email: 1 }).lean();
    if (!guest) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tamu tidak ditemukan" } });

    const roomType = await RoomType.findById(roomTypeId).select({ hargaDefault: 1 }).lean();
    if (!roomType) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Tipe kamar tidak ditemukan" } });

    // Assign first available physical room (exclude maintenance) with no overlap on active bookings.
    const rooms = await Room.find({ roomTypeId, status: { $ne: "perbaikan" } })
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

    const msDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msDay));
    const pricePerNight = Number(roomType.hargaDefault ?? 0);
    const subtotal = pricePerNight * nights;

    const paymentMethod = String(body.payment?.metode ?? body.paymentMethod ?? "").trim();
    const cashPayment = paymentMethod === "cash";
    const transferPayment = paymentMethod === "transfer_bank";
    const proofImage = String(body.payment?.proofImage ?? "").trim();

    // Admin booking flow:
    // - cash: langsung lunas (paid) + booking confirmed
    // - transfer bank (admin): juga langsung lunas (paid) + booking confirmed (bukti hanya lampiran)
    let bookingStatus = cashPayment || transferPayment ? "confirmed" : "pending_payment";
    let paymentStatus = cashPayment || transferPayment ? "paid" : "unpaid";
    const total = Number(body.total ?? subtotal) || subtotal;

    const kodeBooking = await generateBookingCode(new Date());

    const created = await Booking.create({
      kodeBooking,
      tamuId,
      guestSnapshot: {
        namaLengkap: guest.nama ?? "",
        noHp: guest.hp ?? "",
        email: guest.email ?? "",
        nik: "",
        alamat: "",
      },
      roomTypeId,
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

    let payment = null;
    if (cashPayment || transferPayment) {
      const invoice = String(body.payment?.invoice ?? created.kodeBooking ?? "").trim() || `INV-${created._id}`;
      const jumlah = Number(body.payment?.jumlah ?? total) || total;
      const metode = cashPayment ? "cash" : "transfer_bank";
      payment = await Payment.create({
        invoice,
        bookingId: created._id,
        tamuId,
        metode,
        jumlah,
        proofImage: cashPayment ? "" : proofImage,
        status: "paid",
        verifiedBy: String(req.body?.verifiedBy ?? "admin"),
        verifiedAt: new Date(),
        catatan: String(
          body.payment?.catatan ??
            (cashPayment
              ? "Pembayaran cash saat booking dibuat"
              : "Pembayaran transfer bank dicatat oleh admin saat booking dibuat")
        ),
      });
    }

    res.status(201).json({ data: { ...created.toObject(), payment: payment ? payment.toObject() : null } });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { code: "DUPLICATE", message: "Kode booking/invoice sudah digunakan" } });
    }
    next(err);
  }
});

adminBookingsRouter.get("/by-code/:bookingCode", async (req, res, next) => {
  try {
    const kodeBookingRaw = String(req.params.bookingCode ?? "").trim();
    const kodeBooking = kodeBookingRaw.toUpperCase();
    // Case-insensitive match to be resilient to scanner output.
    const booking = await Booking.findOne({ kodeBooking: new RegExp(`^${kodeBooking.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
      .populate("roomTypeId")
      .populate("roomId")
      .populate("customerId")
      .select("-__v")
      .lean();
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    const payment = await Payment.findOne({ bookingId: booking._id })
      .sort({ createdAt: -1 })
      .select({ _id: 1, invoice: 1, metode: 1, jumlah: 1, status: 1, proofImage: 1, createdAt: 1, verifiedAt: 1 })
      .lean();

    res.json({ data: { ...booking, payment: payment ?? null } });
  } catch (err) {
    next(err);
  }
});

adminBookingsRouter.get("/checkout-search", async (req, res, next) => {
  try {
    const bookingCodeRaw = typeof req.query.bookingCode === "string" ? req.query.bookingCode.trim() : "";
    const roomNumberRaw = typeof req.query.roomNumber === "string" ? req.query.roomNumber.trim() : "";
    const guestNameRaw = typeof req.query.guestName === "string" ? req.query.guestName.trim() : "";
    const guestPhoneRaw = typeof req.query.guestPhone === "string" ? req.query.guestPhone.trim() : "";

    const match = {
      $or: [
        { bookingStatus: "checked_in" },
        { bookingStatus: { $exists: false }, status: "Check-in" },
      ],
    };

    if (bookingCodeRaw) {
      const kodeBooking = bookingCodeRaw.toUpperCase();
      match.kodeBooking = new RegExp(`^${kodeBooking.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    }

    if (roomNumberRaw) {
      const room = await Room.findOne({ nomorKamar: roomNumberRaw }).select({ _id: 1 }).lean();
      if (!room) return res.json({ data: [] });
      match.roomId = room._id;
    }

    let items = await Booking.find(match)
      .populate("roomTypeId")
      .populate("roomId")
      .populate("tamuId")
      .populate("customerId")
      .select("-__v")
      .lean();

    const guestName = guestNameRaw.toLowerCase();
    const guestPhone = guestPhoneRaw.toLowerCase();
    if (guestName || guestPhone) {
      items = items.filter((b) => {
        const name =
          String(b.guestSnapshot?.namaLengkap ?? b.customerId?.namaLengkap ?? b.tamuId?.nama ?? "").toLowerCase();
        const phone =
          String(b.guestSnapshot?.noHp ?? b.customerId?.noHp ?? b.tamuId?.hp ?? "").toLowerCase();
        const nameOk = guestName ? name.includes(guestName) : true;
        const phoneOk = guestPhone ? phone.includes(guestPhone) : true;
        return nameOk && phoneOk;
      });
    }

    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

adminBookingsRouter.post("/:id/check-in", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    const bookingStatus = booking.bookingStatus ?? (booking.status === "Dikonfirmasi" ? "confirmed" : undefined);
    const paymentStatus = booking.paymentStatus ?? "unpaid";

    if (!(paymentStatus === "paid" && bookingStatus === "confirmed")) {
      return res.status(409).json({
        error: { code: "NOT_ALLOWED", message: "Booking belum terkonfirmasi pembayaran" },
      });
    }

    booking.bookingStatus = "checked_in";
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "terisi" });
    }

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});

adminBookingsRouter.post("/:id/check-out", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    const bookingStatus = booking.bookingStatus ?? (booking.status === "Check-in" ? "checked_in" : undefined);
    if (bookingStatus !== "checked_in") {
      return res.status(409).json({ error: { code: "NOT_ALLOWED", message: "Booking belum check-in" } });
    }

    booking.bookingStatus = "checked_out";
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

adminBookingsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });

    const status = booking.bookingStatus ?? (booking.status === "Dibatalkan" ? "cancelled" : undefined);
    if (status === "checked_in" || status === "checked_out") {
      return res.status(409).json({ error: { code: "NOT_ALLOWED", message: "Booking sudah check-in/check-out" } });
    }

    booking.bookingStatus = "cancelled";
    booking.paymentStatus = booking.paymentStatus === "paid" ? booking.paymentStatus : "failed";
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    res.json({ data: booking.toObject() });
  } catch (err) {
    next(err);
  }
});
