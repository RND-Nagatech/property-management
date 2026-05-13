import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    kodeBooking: { type: String, required: true, trim: true, unique: true, index: true },
    tamuId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: true, index: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: false, index: true }, // assigned physical room
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    dewasa: { type: Number, required: true, default: 2 },
    anak: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ["Menunggu", "Dikonfirmasi", "Check-in", "Check-out", "Dibatalkan"],
      default: "Menunggu",
      index: true,
    },
    total: { type: Number, required: true, default: 0 },
    catatan: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", BookingSchema);

