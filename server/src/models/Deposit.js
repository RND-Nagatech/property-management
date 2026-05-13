import mongoose from "mongoose";

const DepositSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    tamuId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: true, index: true },
    jumlah: { type: Number, required: true },
    potongan: { type: Number, required: false, default: 0 },
    refundJumlah: { type: Number, required: false, default: 0 },
    status: { type: String, required: true, enum: ["Ditahan", "Dikembalikan", "Dipakai"], default: "Ditahan", index: true },
    catatan: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

export const Deposit = mongoose.model("Deposit", DepositSchema);
