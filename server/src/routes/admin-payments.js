import express from "express";
import mongoose from "mongoose";
import { Payment } from "../models/Payment.js";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";
import { requireAdminAuth } from "../auth.js";
import { waSendDocument, waSendText } from "../utils/wa-web.js";
import { waInvoiceVerified, waPaymentRejected } from "../utils/wa-templates.js";
import { Setting } from "../models/Setting.js";
import { buildInvoicePdf } from "../utils/pdfUtils.js";

export const adminPaymentsRouter = express.Router();
adminPaymentsRouter.use(requireAdminAuth);

function env(name, fallback = "") {
  const v = process.env[name];
  return typeof v === "string" ? v : fallback;
}

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

adminPaymentsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await Payment.find({})
      .sort({ createdAt: -1 })
      .populate("bookingId")
      .populate("customerId")
      .populate("tamuId")
      .select("-__v")
      .lean();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

adminPaymentsRouter.get("/pending-count", async (_req, res, next) => {
  try {
    const count = await Payment.countDocuments({ status: { $in: ["waiting_confirmation", "Menunggu"] } });
    res.json({ data: { count } });
  } catch (err) {
    next(err);
  }
});

adminPaymentsRouter.post("/:id/verify", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" } });

    payment.status = "paid";
    payment.verifiedAt = new Date();
    payment.verifiedBy = String(req.body?.verifiedBy ?? "admin");
    payment.rejectionReason = "";
    await payment.save();

    const booking = await Booking.findById(payment.bookingId).populate("roomTypeId");
    if (booking) {
      booking.paymentStatus = "paid";
      booking.bookingStatus = "confirmed";
      booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
      await booking.save();
    }

    // WhatsApp: kirim invoice PDF resmi setelah verify (hindari double send)
    try {
      const toPhone = String(booking?.guestSnapshot?.noHp ?? "").trim();
      if (booking && toPhone && !payment.invoiceEmailSent) {
        const roomType = typeof booking.roomTypeId === "object" ? booking.roomTypeId : null;
        const checkIn = booking.checkIn;
        const checkOut = booking.checkOut;
        const msDay = 24 * 60 * 60 * 1000;
        const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msDay));
        const pricePerNight = Number(roomType?.hargaDefault ?? 0);
        const totalAmount = Number(payment.jumlah ?? booking.total ?? 0);
        const text = waInvoiceVerified({
          bookingCode: booking.kodeBooking,
          invoiceNumber: payment.invoice,
          customerName: booking.guestSnapshot?.namaLengkap ?? "",
          roomTypeName: roomType?.namaTipe ?? "",
          checkIn,
          checkOut,
          nights,
          pricePerNight,
          totalAmount,
        });

        const settingsRows = await Setting.find({
          key: { $in: ["propertyName", "address", "phone", "contactEmail", "invoiceNote", "logoDataUrl"] },
        })
          .select({ key: 1, value: 1 })
          .lean();
        const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));
        const pdf = await buildInvoicePdf({
          settings: {
            propertyName: settingsMap.propertyName,
            address: settingsMap.address,
            phone: settingsMap.phone,
            contactEmail: settingsMap.contactEmail,
            invoiceNote: settingsMap.invoiceNote,
            logoDataUrl: settingsMap.logoDataUrl,
          },
          booking,
          roomType,
          payment,
        });

        const sent = await waSendDocument({
          to: toPhone,
          buffer: pdf,
          fileName: `invoice_${booking.kodeBooking}.pdf`,
          mimetype: "application/pdf",
          caption: text,
        });

        if (sent.ok) {
          payment.invoiceEmailSent = true;
          payment.invoiceEmailSentAt = new Date();
          await payment.save();
        }
      }
    } catch {
      // Non-fatal
    }

    res.json({ data: payment.toObject() });
  } catch (err) {
    next(err);
  }
});

adminPaymentsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "id tidak valid" } });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" } });

    const reason = String(req.body?.rejectionReason ?? req.body?.reason ?? "").trim();
    payment.status = "failed";
    payment.rejectionReason = reason;
    payment.verifiedAt = new Date();
    payment.verifiedBy = String(req.body?.verifiedBy ?? "admin");
    await payment.save();

    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.paymentStatus = "failed";
      booking.bookingStatus = "pending_payment";
      booking.status = mapBookingStatusToLegacy(booking.bookingStatus);
      await booking.save();

      if (booking.roomId) {
        await Room.findByIdAndUpdate(booking.roomId, { status: "tersedia" });
      }
    }

    // WhatsApp: (opsional) notifikasi pembayaran ditolak
    try {
      const toPhone = String(booking?.guestSnapshot?.noHp ?? "").trim();
      if (booking && toPhone && !payment.paymentRejectedEmailSent) {
        const text = waPaymentRejected({
          customerName: booking.guestSnapshot?.namaLengkap ?? "",
          bookingCode: booking.kodeBooking,
          reason,
        });
        const sent = await waSendText({ to: toPhone, text });
        if (sent.ok) {
          payment.paymentRejectedEmailSent = true;
          payment.paymentRejectedEmailSentAt = new Date();
          await payment.save();
        }
      }
    } catch {
      // Non-fatal
    }

    res.json({ data: payment.toObject() });
  } catch (err) {
    next(err);
  }
});
