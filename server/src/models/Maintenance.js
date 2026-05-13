import mongoose from "mongoose";

const MaintenanceSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: false, index: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: false, index: true },
    judul: { type: String, required: true, trim: true },
    deskripsi: { type: String, required: false, default: "" },
    status: { type: String, required: true, enum: ["Baru", "Diproses", "Selesai"], default: "Baru", index: true },
    biayaEstimasi: { type: Number, required: false, default: 0 },
  },
  { timestamps: true }
);

export const Maintenance = mongoose.model("Maintenance", MaintenanceSchema);

