// Scheduled job to auto-cancel expired bookings
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Setting } from "../models/Setting.js";

export async function autoCancelExpiredBookings() {
  // Get expire minutes from settings (default 30)
  const setting = await Setting.findOne({ key: "bookingExpireMinutes" }).lean();
  const expireMinutes = Number(setting?.value ?? 30);
  const now = new Date();
  const expireDate = new Date(now.getTime() - expireMinutes * 60 * 1000);

  // Find bookings that are still pending and createdAt < expireDate
  const expired = await Booking.find({
    bookingStatus: { $in: ["pending_payment", "waiting_confirmation"] },
    createdAt: { $lt: expireDate },
  });

  for (const b of expired) {
    b.bookingStatus = "cancelled";
    b.paymentStatus = "unpaid";
    b.status = "Dibatalkan";
    b.catatan = (b.catatan ? b.catatan + "\n" : "") +
      `[AUTO] Booking dibatalkan otomatis oleh sistem karena tidak dibayar dalam ${expireMinutes} menit.`;
    await b.save();
  }

  if (expired.length > 0) {
    console.log(`[auto-cancel] ${expired.length} booking dibatalkan otomatis.`);
  }
}
