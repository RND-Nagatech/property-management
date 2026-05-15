import mongoose from "mongoose";

const RoomTypeSchema = new mongoose.Schema(
  {
    namaTipe: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    deskripsi: { type: String, required: false, default: "" },
    fasilitasUtama: { type: [String], required: true, default: [] },
    fasilitasKamar: { type: [String], required: true, default: [] },
    fasilitasKamarMandi: { type: [String], required: true, default: [] },
    hargaDefault: { type: Number, required: true },
    kapasitas: { type: Number, required: true },
    ukuranKamar: { type: Number, required: true },
    tipeKasur: { type: String, required: false, default: "" },
    includeSarapan: { type: Boolean, required: true, default: false },
    depositDefault: { type: Number, required: true, default: 0 },
    deposit: {
      type: {
        type: String,
        required: false,
        enum: ["MONEY", "DOCUMENT"],
      },
      amount: { type: Number, required: false, default: 0 },
      documentType: {
        type: String,
        required: false,
        enum: ["KTP", "PASSPORT", "SIM", null],
        default: null,
      },
    },
    // Policy/info only (not charged during booking). Actual deposit is recorded at check-in.
    depositPolicy: {
      enabled: { type: Boolean, required: true, default: false },
      allowedTypes: {
        type: [String],
        required: true,
        default: [],
        enum: ["CASH", "KTP", "SIM", "PASSPORT"],
      },
      cashAmount: { type: Number, required: false, default: 0 },
      note: { type: String, required: false, default: "" },
    },
    kebijakanRefund: { type: String, required: false, default: "" },
    kebijakanReschedule: { type: String, required: false, default: "" },
    jamCheckIn: { type: String, required: true, default: "14:00" },
    jamCheckOut: { type: String, required: true, default: "12:00" },
    gambarThumbnail: { type: String, required: false, default: "" },
    galeriGambar: { type: [String], required: true, default: [] },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export const RoomType = mongoose.model("RoomType", RoomTypeSchema);
