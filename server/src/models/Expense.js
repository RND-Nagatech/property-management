import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    tanggal: { type: Date, required: true, index: true },
    kategori: { type: String, required: true, trim: true },
    deskripsi: { type: String, required: true, trim: true },
    jumlah: { type: Number, required: true },
    metode: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

export const Expense = mongoose.model("Expense", ExpenseSchema);

