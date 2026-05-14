import express from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";

export const invoicesRouter = express.Router();

function isObjectId(value) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function diffNights(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  return nights || 1;
}

function rupiah(n) {
  const v = Number(n ?? 0) || 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

invoicesRouter.get("/:bookingId", async (req, res, next) => {
  try {
    const bookingId = String(req.params.bookingId ?? "");
    if (!isObjectId(bookingId)) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "bookingId tidak valid" } });
    }

    const booking = await Booking.findById(bookingId)
      .populate("roomTypeId")
      .select("-__v")
      .lean();

    if (!booking) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking tidak ditemukan" } });
    }

    const roomType = typeof booking.roomTypeId === "object" ? booking.roomTypeId : null;
    const nights = diffNights(booking.checkIn, booking.checkOut);
    const pricePerNight = roomType?.hargaDefault ?? 0;
    const totalAmount = Number(booking.total ?? pricePerNight * nights);

    const guestName =
      booking.guestSnapshot?.namaLengkap ||
      booking.guestSnapshot?.email ||
      "-";

    const paymentStatus = booking.paymentStatus ?? "unpaid";
    const bookingStatus = booking.bookingStatus ?? "pending_payment";

    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${booking.kodeBooking}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#111}
    .card{max-width:780px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;padding:20px}
    h1{font-size:20px;margin:0}
    .muted{color:#6b7280;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    td{padding:10px 0;border-bottom:1px solid #eee;font-size:14px}
    td:last-child{text-align:right;font-weight:600}
    .row{display:flex;justify-content:space-between;gap:12px;margin-top:10px}
    .badge{display:inline-block;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#ecfeff;color:#0f766e}
    .badge.warn{background:#fef3c7;color:#92400e}
  </style>
</head>
<body>
  <div class="card">
    <div class="row">
      <div>
        <h1>Invoice</h1>
        <div class="muted">No Booking: <b>${booking.kodeBooking}</b></div>
      </div>
      <div style="text-align:right">
        <div class="badge ${paymentStatus === "paid" ? "" : "warn"}">${paymentStatus === "paid" ? "PAID" : "UNPAID"}</div>
        <div class="muted">Booking: ${bookingStatus}</div>
      </div>
    </div>

    <table>
      <tr><td>Nama Tamu</td><td>${guestName}</td></tr>
      <tr><td>Tipe Kamar</td><td>${roomType?.namaTipe ?? "-"}</td></tr>
      <tr><td>Check-in</td><td>${String(booking.checkIn).slice(0,10)}</td></tr>
      <tr><td>Check-out</td><td>${String(booking.checkOut).slice(0,10)}</td></tr>
      <tr><td>Total Malam</td><td>${nights}</td></tr>
      <tr><td>Harga / malam</td><td>${rupiah(pricePerNight)}</td></tr>
      <tr><td>Total Pembayaran</td><td>${rupiah(totalAmount)}</td></tr>
    </table>

    <p class="muted" style="margin-top:14px">Invoice ini dapat dicetak dari browser (Print / Save as PDF).</p>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    next(err);
  }
});

