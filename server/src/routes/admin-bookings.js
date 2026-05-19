import express from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";
import { Payment } from "../models/Payment.js";
import { RoomType } from "../models/RoomType.js";
import { Guest } from "../models/Guest.js";
import { Expense } from "../models/Expense.js";
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
    const required = ["tamuId", "checkIn", "checkOut"];
    for (const k of required) {
      if (!body[k]) return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${k} wajib` } });
    }
    const tamuId = String(body.tamuId);
    if (!isObjectId(tamuId)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "tamuId tidak valid" } });
    const bookingItemsInput = Array.isArray(body.bookingItems) ? body.bookingItems : null;
    const legacyRoomTypeId = body.roomTypeId ? String(body.roomTypeId) : "";
    if (bookingItemsInput && bookingItemsInput.length > 0) {
      for (const it of bookingItemsInput) {
        if (!it?.roomTypeId) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingItems.roomTypeId wajib" } });
        }
        if (!isObjectId(String(it.roomTypeId))) {
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
      if (!isObjectId(legacyRoomTypeId)) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "roomTypeId tidak valid" } });
      }
    }

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

    const msDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msDay));
    const bookingItems = [];
    let total = 0;
    let legacyAssignedRoomId = null;
    let legacyRoomTypeForCompat = legacyRoomTypeId || null;

    const itemsToCreate = bookingItemsInput && bookingItemsInput.length > 0
      ? bookingItemsInput.map((it) => ({ roomTypeId: String(it.roomTypeId), quantity: Number(it.quantity) }))
      : [{ roomTypeId: legacyRoomTypeId, quantity: 1 }];

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

    const paymentMethod = String(body.payment?.metode ?? body.paymentMethod ?? "").trim();
    const cashPayment = paymentMethod === "cash";
    const transferPayment = paymentMethod === "transfer_bank";
    const proofImage = String(body.payment?.proofImage ?? "").trim();

    // Admin booking flow:
    // - cash: langsung lunas (paid) + booking confirmed
    // - transfer bank (admin): juga langsung lunas (paid) + booking confirmed (bukti hanya lampiran)
    let bookingStatus = cashPayment || transferPayment ? "confirmed" : "pending_payment";
    let paymentStatus = cashPayment || transferPayment ? "paid" : "unpaid";
    total = Number(body.total ?? total) || total;

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
    const bookingDoc = await Booking.findOne({ kodeBooking: new RegExp(`^${kodeBooking.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
      .populate("roomTypeId")
      .populate("roomId")
      .populate("customerId")
      .populate("bookingItems.roomTypeId")
      .populate("bookingItems.assignedRoomIds")
      .select("-__v")
      .exec();
    if (!bookingDoc) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    const booking = bookingDoc.toObject();

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

    const itemDocs = await Booking.find(match)
      .populate("roomTypeId")
      .populate("roomId")
      .populate("tamuId")
      .populate("customerId")
      .populate("bookingItems.roomTypeId")
      .populate("bookingItems.assignedRoomIds")
      .select("-__v")
      .exec();
    let items = itemDocs.map((d) => d.toObject());

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

    // Ensure auto-assigned physical rooms exist for legacy and bookingItems before check-in.
    // We keep the same overlap rules as booking creation.
    const checkIn = booking.checkIn;
    const checkOut = booking.checkOut;
    const activeMatch = {
      $or: [
        { bookingStatus: { $in: ["pending_payment", "waiting_confirmation", "confirmed", "checked_in"] } },
        { bookingStatus: { $exists: false }, status: { $in: ["Menunggu", "Dikonfirmasi", "Check-in"] } },
      ],
      ...overlaps(checkIn, checkOut),
      $or: [{ roomId: { $exists: true } }, { "bookingItems.assignedRoomIds.0": { $exists: true } }],
    };
    const conflictBookings = await Booking.find(activeMatch)
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

    const items = Array.isArray(booking.bookingItems) ? booking.bookingItems : [];
    if (items.length) {
      for (const it of items) {
        const typeId = String(it.roomTypeId ?? "");
        const quantity = Math.max(1, Number(it.quantity ?? 1));
        const current = Array.isArray(it.assignedRoomIds) ? it.assignedRoomIds : [];
        if (current.length >= quantity) continue;

        const rooms = await Room.find({ roomTypeId: typeId, status: { $ne: "perbaikan" } })
          .sort({ nomorKamar: 1 })
          .select({ _id: 1 })
          .lean();

        const assigned = [...current];
        for (const r of rooms) {
          if (takenRoomIds.has(String(r._id))) continue;
          assigned.push(r._id);
          takenRoomIds.add(String(r._id));
          if (assigned.length >= quantity) break;
        }
        if (assigned.length < quantity) {
          return res.status(409).json({
            error: { code: "NO_AVAILABILITY", message: "Kamar tidak tersedia di tanggal tersebut" },
          });
        }
        it.assignedRoomIds = assigned;
      }

      // Keep legacy fields populated for older UI
      if (!booking.roomTypeId) booking.roomTypeId = items[0]?.roomTypeId;
      if (!booking.roomId) booking.roomId = items[0]?.assignedRoomIds?.[0] ?? booking.roomId;
    } else {
      // Legacy booking without bookingItems
      if (!booking.roomId && booking.roomTypeId) {
        const rooms = await Room.find({ roomTypeId: booking.roomTypeId, status: { $ne: "perbaikan" } })
          .sort({ nomorKamar: 1 })
          .select({ _id: 1 })
          .lean();
        let assignedRoomId = null;
        for (const r of rooms) {
          if (takenRoomIds.has(String(r._id))) continue;
          assignedRoomId = r._id;
          break;
        }
        if (!assignedRoomId) {
          return res.status(409).json({
            error: { code: "NO_AVAILABILITY", message: "Kamar tidak tersedia di tanggal tersebut" },
          });
        }
        booking.roomId = assignedRoomId;
      }
    }

    booking.bookingStatus = "checked_in";
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "terisi" });
    }
    const roomIds = items.flatMap((it) => it?.assignedRoomIds ?? []).filter(Boolean);
    if (roomIds.length) {
      await Room.updateMany({ _id: { $in: roomIds } }, { $set: { status: "terisi" } });
    }

    const freshDoc = await Booking.findById(booking._id)
      .populate("roomTypeId")
      .populate("roomId")
      .populate("tamuId")
      .populate("customerId")
      .populate("bookingItems.roomTypeId")
      .populate("bookingItems.assignedRoomIds")
      .select("-__v")
      .exec();
    const fresh = freshDoc ? freshDoc.toObject() : null;

    res.json({ data: fresh ?? booking.toObject() });
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

    const body = req.body ?? {};
    const chargesInput = Array.isArray(body.charges) ? body.charges : [];
    const charges = chargesInput
      .map((c) => ({
        kategori: String(c?.kategori ?? c?.nama ?? c?.category ?? "").trim(),
        nominal: Number(c?.nominal ?? c?.amount ?? 0) || 0,
        keterangan: String(c?.keterangan ?? c?.note ?? "").trim(),
      }))
      .filter((c) => c.kategori && c.nominal > 0);

    const chargesTotal = charges.reduce((acc, c) => acc + (Number(c.nominal) || 0), 0);
    booking.checkoutCharges = charges.length ? charges : undefined;
    booking.checkoutChargesTotal = chargesTotal;
    booking.checkoutTotal = Number(booking.total ?? 0) + chargesTotal;

    // Snapshot deposit settlement (optional; deposit is still the source of truth).
    if (body.depositSettlement && typeof body.depositSettlement === "object") {
      booking.depositSettlement = {
        type: String(body.depositSettlement.type ?? ""),
        deductedAmount: Number(body.depositSettlement.deductedAmount ?? 0) || 0,
        returnedAmount: Number(body.depositSettlement.returnedAmount ?? 0) || 0,
        returnStatus: String(body.depositSettlement.returnStatus ?? ""),
      };
    }

    booking.bookingStatus = "checked_out";
    booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
    await booking.save();

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { status: "tersedia" });
    }
    const items = Array.isArray(booking.bookingItems) ? booking.bookingItems : [];
    const roomIds = items.flatMap((it) => it?.assignedRoomIds ?? []).filter(Boolean);
    if (roomIds.length) {
      await Room.updateMany({ _id: { $in: roomIds } }, { $set: { status: "tersedia" } });
    }

    // Record checkout charges as cashflow IN for financial report
    if (charges.length) {
      const tanggal = new Date();
      await Expense.insertMany(
        charges.map((c) => ({
          tanggal,
          tipeTransaksi: "IN",
          kategori: c.kategori,
          deskripsi: `${booking.kodeBooking} · ${c.keterangan || "Charge tambahan saat check-out"}`,
          jumlah: c.nominal,
          metode: "checkout",
        }))
      );
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
