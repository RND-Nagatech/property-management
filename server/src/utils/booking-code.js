import { Booking } from "../models/Booking.js";

function pad3(n) {
  return String(n).padStart(3, "0");
}

function formatYYMMDD(d) {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export async function generateBookingCode(now = new Date()) {
  const yymmdd = formatYYMMDD(now);
  const prefix = `BK-${yymmdd}-`;

  const from = startOfDay(now);
  const to = endOfDay(now);

  // Cari kode terakhir hari ini, format: BK-yymmdd-xxx
  const latest = await Booking.findOne({
    kodeBooking: { $regex: `^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}` },
    createdAt: { $gte: from, $lte: to },
  })
    .sort({ kodeBooking: -1 })
    .select({ kodeBooking: 1 })
    .lean();

  const last = latest?.kodeBooking ?? "";
  const m = /-(\d{3,})$/.exec(last);
  const nextSeq = m ? Number(m[1]) + 1 : 1;
  return `${prefix}${pad3(nextSeq)}`;
}
