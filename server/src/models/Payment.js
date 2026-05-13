import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    invoice: { type: String, required: true, trim: true, unique: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    tamuId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: false, index: true }, // legacy
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false, index: true },
    metode: { type: String, required: true, trim: true }, // transfer_bank | qris | cash
    jumlah: { type: Number, required: true },
    proofImage: { type: String, required: false, default: "" }, // data url / url
    status: {
      type: String,
      required: true,
      enum: ["Menunggu", "Terverifikasi", "Ditolak", "waiting_confirmation", "paid", "failed"],
      default: "waiting_confirmation",
      index: true,
    },
    verifiedBy: { type: String, required: false, default: "" },
    verifiedAt: { type: Date, required: false },
    rejectionReason: { type: String, required: false, default: "" },
    catatan: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", PaymentSchema);
