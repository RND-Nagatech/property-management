import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    invoice: { type: String, required: true, trim: true, unique: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    tamuId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: true, index: true },
    metode: { type: String, required: true, trim: true },
    jumlah: { type: Number, required: true },
    status: { type: String, required: true, enum: ["Menunggu", "Terverifikasi", "Ditolak"], default: "Menunggu", index: true },
    catatan: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", PaymentSchema);

