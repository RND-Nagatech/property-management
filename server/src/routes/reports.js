import express from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { Deposit } from "../models/Deposit.js";
import { Expense } from "../models/Expense.js";
import { getJakartaDayRange, getJakartaMonthRange } from "../utils/jakarta-dates.js";

export const reportsRouter = express.Router();

function parseMonth(value) {
  const m = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

reportsRouter.get("/finance", async (req, res, next) => {
  try {
    const now = new Date();
    const parsed = parseMonth(req.query.month);
    const year = parsed?.year ?? now.getFullYear();
    const month = parsed?.month ?? now.getMonth() + 1;
    const { start, end } = getJakartaMonthRange(year, month);
    const { start: dayStart, end: dayEnd } = getJakartaDayRange(now);

    const paidStatuses = ["Terverifikasi", "paid"];

    const [incomeMonthAgg, incomeDayAgg, cashMonthAgg, cashDayAgg, depositCutAgg] =
      await Promise.all([
        Payment.aggregate([
          { $match: { status: { $in: paidStatuses }, createdAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: "$jumlah" } } },
        ]),
        Payment.aggregate([
          { $match: { status: { $in: paidStatuses }, createdAt: { $gte: dayStart, $lt: dayEnd } } },
          { $group: { _id: null, total: { $sum: "$jumlah" } } },
        ]),
        Expense.aggregate([
          { $match: { tanggal: { $gte: start, $lt: end } } },
          {
            $group: {
              _id: null,
              masuk: { $sum: { $cond: [{ $eq: ["$tipeTransaksi", "IN"] }, "$jumlah", 0] } },
              keluar: { $sum: { $cond: [{ $eq: ["$tipeTransaksi", "OUT"] }, "$jumlah", 0] } },
            },
          },
        ]),
        Expense.aggregate([
          { $match: { tanggal: { $gte: dayStart, $lt: dayEnd } } },
          {
            $group: {
              _id: null,
              masuk: { $sum: { $cond: [{ $eq: ["$tipeTransaksi", "IN"] }, "$jumlah", 0] } },
              keluar: { $sum: { $cond: [{ $eq: ["$tipeTransaksi", "OUT"] }, "$jumlah", 0] } },
            },
          },
        ]),
        Deposit.aggregate([
          { $match: { status: "Dipakai", createdAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: "$potongan" } } },
        ]),
      ]);

    const pendapatanBulanan = incomeMonthAgg[0]?.total ?? 0;
    const pendapatanHariIni = incomeDayAgg[0]?.total ?? 0;
    const kasMasukBulanan = cashMonthAgg[0]?.masuk ?? 0;
    const kasKeluarBulanan = cashMonthAgg[0]?.keluar ?? 0;
    const kasMasukHariIni = cashDayAgg[0]?.masuk ?? 0;
    const kasKeluarHariIni = cashDayAgg[0]?.keluar ?? 0;
    const potonganDepositBulanan = depositCutAgg[0]?.total ?? 0;

    // breakdown per tipe kamar (booking) berdasarkan total booking field
    const byRoomType = await Booking.aggregate([
      { $match: { checkIn: { $lt: end }, checkOut: { $gt: start } } },
      {
        $group: {
          _id: "$roomTypeId",
          totalBooking: { $sum: 1 },
          pendapatan: { $sum: "$total" },
        },
      },
      {
        $lookup: {
          from: "roomtypes",
          localField: "_id",
          foreignField: "_id",
          as: "roomType",
        },
      },
      { $unwind: { path: "$roomType", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          roomTypeId: "$_id",
          namaTipe: "$roomType.namaTipe",
          slug: "$roomType.slug",
          totalBooking: 1,
          pendapatan: 1,
        },
      },
      { $sort: { pendapatan: -1 } },
    ]);

    // Tabel data: pembayaran & biaya pada bulan terpilih (untuk laporan)
    const [payments, expenses] = await Promise.all([
      Payment.aggregate([
        { $match: { status: { $in: paidStatuses }, createdAt: { $gte: start, $lt: end } } },
        { $sort: { createdAt: -1 } },
        { $limit: 500 },
        {
          $lookup: {
            from: "bookings",
            localField: "bookingId",
            foreignField: "_id",
            as: "booking",
          },
        },
        { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            invoice: 1,
            metode: 1,
            jumlah: 1,
            status: 1,
            bookingId: 1,
            kodeBooking: "$booking.kodeBooking",
          },
        },
      ]),
      Expense.find({ tanggal: { $gte: start, $lt: end } })
        .sort({ tanggal: -1 })
        .limit(500)
        .select("-__v")
        .lean(),
    ]);

    res.json({
      data: {
        month: `${year}-${String(month).padStart(2, "0")}`,
        pendapatanHariIni,
        pendapatanBulanan,
        // Legacy fields: biaya = kas keluar (uang keluar)
        biayaHariIni: kasKeluarHariIni,
        biayaBulanan: kasKeluarBulanan,
        // New cashflow fields
        kasMasukHariIni,
        kasKeluarHariIni,
        saldoKasHariIni: kasMasukHariIni - kasKeluarHariIni,
        kasMasukBulanan,
        kasKeluarBulanan,
        saldoKasBulanan: kasMasukBulanan - kasKeluarBulanan,
        labaBulanan: pendapatanBulanan - kasKeluarBulanan,
        potonganDepositBulanan,
        byRoomType,
        payments,
        expenses,
      },
    });
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/bookings", async (req, res, next) => {
  try {
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : null;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : null;
    const match = {};
    if (from && !Number.isNaN(from.getTime())) match.createdAt = { ...(match.createdAt ?? {}), $gte: from };
    if (to && !Number.isNaN(to.getTime())) match.createdAt = { ...(match.createdAt ?? {}), $lt: to };

    const [statusAgg, totalAgg, avgAgg] = await Promise.all([
      Booking.aggregate([
        { $match: match },
        { $group: { _id: "$bookingStatus", total: { $sum: 1 } } },
      ]),
      Booking.countDocuments(match),
      Booking.aggregate([
        { $match: match },
        {
          $project: {
            nights: {
              $divide: [{ $subtract: ["$checkOut", "$checkIn"] }, 24 * 60 * 60 * 1000],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: "$nights" } } },
      ]),
    ]);

    const byStatus = Object.fromEntries(statusAgg.map((s) => [s._id, s.total]));
    const avgLength = avgAgg[0]?.avg ?? 0;

    // trend 30 hari terakhir (Jakarta day)
    const { start: todayStart } = getJakartaDayRange(new Date());
    const start30 = new Date(todayStart);
    start30.setDate(start30.getDate() - 29);

    const trendAgg = await Booking.aggregate([
      { $match: { createdAt: { $gte: start30 } } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    // Tabel data: daftar booking (untuk laporan)
    const bookings = await Booking.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: 500 },
      {
        $lookup: {
          from: "roomtypes",
          localField: "roomTypeId",
          foreignField: "_id",
          as: "roomType",
        },
      },
      { $unwind: { path: "$roomType", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          kodeBooking: 1,
          guestName: "$guestSnapshot.namaLengkap",
          roomTypeName: "$roomType.namaTipe",
          checkIn: 1,
          checkOut: 1,
          bookingStatus: 1,
          paymentStatus: 1,
          total: 1,
        },
      },
    ]);

    res.json({
      data: {
        totalBooking: totalAgg,
        sukses:
          (byStatus["checked_out"] ?? 0) + (byStatus["checked_in"] ?? 0) + (byStatus["confirmed"] ?? 0),
        dibatalkan: byStatus["cancelled"] ?? 0,
        byStatus,
        avgLengthNights: avgLength,
        trend30: trendAgg.map((t) => ({
          day: `${t._id.y}-${String(t._id.m).padStart(2, "0")}-${String(t._id.d).padStart(2, "0")}`,
          total: t.total,
        })),
        bookings,
      },
    });
  } catch (err) {
    next(err);
  }
});
