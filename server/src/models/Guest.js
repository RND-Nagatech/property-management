import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    nama: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    hp: { type: String, required: true, trim: true },
    catatan: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

GuestSchema.index({ email: 1 }, { unique: true });

export const Guest = mongoose.model("Guest", GuestSchema);
