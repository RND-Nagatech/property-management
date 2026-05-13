import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema(
  {
    nomorKamar: { type: String, required: true, trim: true, unique: true, index: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true, index: true },
    lantai: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      required: true,
      enum: ["tersedia", "dipesan", "terisi", "perbaikan"],
      default: "tersedia",
      index: true,
    },
    catatan: { type: String, required: false, default: "" },
    hargaOverride: { type: Number, required: false },
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", RoomSchema);
