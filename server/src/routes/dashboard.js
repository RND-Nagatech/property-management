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
      bookingTerbaru,
      kerusakanAktif,
      biayaHariIni,
    ] = await Promise.all([
      Booking.countDocuments({ kodeBooking: { $exists: true, $ne: null } }),
      Booking.countDocuments({ checkIn: { $gte: dayStart, $lt: dayEnd } }),
      Booking.countDocuments({ checkOut: { $gte: dayStart, $lt: dayEnd } }),
      Room.countDocuments({ status: "tersedia" }),
      Payment.countDocuments({ status: "Menunggu" }),
      Payment.aggregate([
        { $match: { status: "Terverifikasi", createdAt: { $gte: dayStart, $lt: dayEnd } } },
        { $group: { _id: null, total: { $sum: "$jumlah" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "Terverifikasi", createdAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$jumlah" } } },
      ]),
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
        bookingTerbaru,
        kerusakanAktif,
      },
    });
  } catch (err) {
    next(err);
  }
});

