import mongoose from "mongoose";

const DepositSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    tamuId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: false, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false, index: true },
    guestSnapshot: {
      namaLengkap: { type: String, required: false, default: "" },
      noHp: { type: String, required: false, default: "" },
      email: { type: String, required: false, default: "" },
      nik: { type: String, required: false, default: "" },
      alamat: { type: String, required: false, default: "" },
    },
    // Legacy numeric fields (kept for backward compatibility / reporting).
    jumlah: { type: Number, required: true, default: 0 },
    potongan: { type: Number, required: false, default: 0 },
    refundJumlah: { type: Number, required: false, default: 0 },
    status: { type: String, required: true, enum: ["Ditahan", "Dikembalikan", "Dipakai"], default: "Ditahan", index: true },
    catatan: { type: String, required: false, default: "" },

    // New deposit flow (actual deposit recorded by admin at check-in; settled at checkout).
    type: {
      type: String,
      required: true,
      enum: ["NONE", "CASH", "KTP", "SIM", "PASSPORT"],
      default: "NONE",
      index: true,
    },
    amount: { type: Number, required: false, default: 0 },
    identityName: { type: String, required: false, default: "" },
    identityNumber: { type: String, required: false, default: "" },
    note: { type: String, required: false, default: "" },
    receivedAt: { type: Date, required: false, default: null },
    receivedBy: { type: String, required: false, default: "" },
    returnStatus: {
      type: String,
      required: false,
      enum: ["PENDING", "RETURNED", "PARTIALLY_DEDUCTED", "NOT_RETURNED", null],
      default: "PENDING",
      index: true,
    },
    returnedAmount: { type: Number, required: false, default: 0 },
    deductedAmount: { type: Number, required: false, default: 0 },
    returnNote: { type: String, required: false, default: "" },
    returnedAt: { type: Date, required: false, default: null },
    returnedBy: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

export const Deposit = mongoose.model("Deposit", DepositSchema);
