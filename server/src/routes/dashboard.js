import express from "express";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";
import { Payment } from "../models/Payment.js";
import { Maintenance } from "../models/Maintenance.js";
import { Expense } from "../models/Expense.js";
import { getJakartaDayRange } from "../utils/jakarta-dates.js";

export const dashboardRouter = express.Router();

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const { start: dayStart, end: dayEnd } = getJakartaDayRange(now);

    const monthStart = new Date(dayStart);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [
      totalBooking,
      checkInToday,
      checkOutToday,
      kamarTersedia,
      pembayaranPending,
      pendapatanHariIni,
      pendapatanBulanan,
      pendapatanTrend14,
      bookingTerbaru,
      kerusakanAktif,
      biayaHariIni,
    ] = await Promise.all([
      Booking.countDocuments({ kodeBooking: { $exists: true, $ne: null } }),
      Booking.countDocuments({ checkIn: { $gte: dayStart, $lt: dayEnd } }),
      Booking.countDocuments({ checkOut: { $gte: dayStart, $lt: dayEnd } }),
      Room.countDocuments({ status: "tersedia" }),
      Payment.countDocuments({ status: { $in: ["waiting_confirmation", "Menunggu"] } }),
      Payment.aggregate([
        { $match: { status: { $in: ["paid", "Terverifikasi"] }, createdAt: { $gte: dayStart, $lt: dayEnd } } },
        { $group: { _id: null, total: { $sum: "$jumlah" } } },
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ["paid", "Terverifikasi"] }, createdAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$jumlah" } } },
      ]),
      (async () => {
        // 14 hari terakhir berdasarkan hari Jakarta (termasuk hari ini)
        const { start: todayStart } = getJakartaDayRange(now);
        const start14 = new Date(todayStart);
        start14.setDate(start14.getDate() - 13);

        const agg = await Payment.aggregate([
          { $match: { status: { $in: ["paid", "Terverifikasi"] }, createdAt: { $gte: start14 } } },
          {
            $group: {
              _id: {
                y: { $year: "$createdAt" },
                m: { $month: "$createdAt" },
                d: { $dayOfMonth: "$createdAt" },
              },
              total: { $sum: "$jumlah" },
            },
          },
          { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
        ]);

        // normalize missing days to 0
        const map = new Map(agg.map((t) => [`${t._id.y}-${String(t._id.m).padStart(2, "0")}-${String(t._id.d).padStart(2, "0")}`, t.total]));
        const out = [];
        for (let i = 0; i < 14; i++) {
          const d = new Date(start14);
          d.setDate(d.getDate() + i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          out.push({ day: key, total: map.get(key) ?? 0 });
        }
        return out;
      })(),
      Booking.find({ kodeBooking: { $exists: true, $ne: null } })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("tamuId")
        .populate("roomTypeId")
        .populate("roomId")
        .select("-__v")
        .lean(),
      Maintenance.find({ status: { $ne: "Selesai" } })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("roomId")
        .populate("roomTypeId")
        .select("-__v")
        .lean(),
      Expense.aggregate([
        { $match: { tanggal: { $gte: dayStart, $lt: dayEnd } } },
        { $group: { _id: null, total: { $sum: "$jumlah" } } },
      ]),
    ]);

    const pendapatanHariIniTotal = pendapatanHariIni[0]?.total ?? 0;
    const pendapatanBulananTotal = pendapatanBulanan[0]?.total ?? 0;
    const biayaHariIniTotal = biayaHariIni[0]?.total ?? 0;

    res.json({
      data: {
        totals: {
          totalBooking,
          checkInHariIni: checkInToday,
          checkOutHariIni: checkOutToday,
          kamarTersedia,
          pembayaranPending,
          pendapatanHariIni: pendapatanHariIniTotal,
          pendapatanBulanan: pendapatanBulananTotal,
          biayaHariIni: biayaHariIniTotal,
        },
        pendapatanTrend14,
        bookingTerbaru,
        kerusakanAktif,
      },
    });
  } catch (err) {
    next(err);
  }
});
