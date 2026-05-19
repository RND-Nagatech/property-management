import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    kodeBooking: { type: String, required: true, trim: true, unique: true, index: true },
    tamuId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: false, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false, index: true },
    guestSnapshot: {
      namaLengkap: { type: String, required: false, default: "" },
      noHp: { type: String, required: false, default: "" },
      email: { type: String, required: false, default: "" },
      nik: { type: String, required: false, default: "" },
      alamat: { type: String, required: false, default: "" },
    },
    // Legacy single-room booking fields (kept for backward compatibility)
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: false, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: false, index: true }, // assigned physical room

    // New: multi room types in one booking
    bookingItems: {
      type: [
        new mongoose.Schema(
          {
            roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true },
            roomTypeName: { type: String, required: false, default: "" },
            quantity: { type: Number, required: true, min: 1, default: 1 },
            pricePerNight: { type: Number, required: true, default: 0 },
            totalNights: { type: Number, required: true, default: 1 },
            subtotal: { type: Number, required: true, default: 0 },
            assignedRoomIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Room", required: false, default: [] },
          },
          { _id: false }
        ),
      ],
      required: false,
      default: undefined,
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    dewasa: { type: Number, required: true, default: 2 },
    anak: { type: Number, required: true, default: 0 },
    bookingStatus: {
      type: String,
      required: true,
      enum: [
        "pending_payment",
        "waiting_confirmation",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      default: "pending_payment",
      index: true,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["unpaid", "waiting_confirmation", "paid", "failed"],
      default: "unpaid",
      index: true,
    },
    refundStatus: {
      type: String,
      required: false,
      enum: ["NO_REFUND", "REFUNDED", "PENDING", ""],
      default: "",
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Menunggu", "Dikonfirmasi", "Check-in", "Check-out", "Dibatalkan"],
      default: "Menunggu",
      index: true,
    },
    total: { type: Number, required: true, default: 0 },
    catatan: { type: String, required: false, default: "" },

    // Checkout extra charges (do not mix silently with room price; keep detailed records).
    checkoutCharges: {
      type: [
        new mongoose.Schema(
          {
            kategori: { type: String, required: true, trim: true },
            nominal: { type: Number, required: true, default: 0 },
            keterangan: { type: String, required: false, default: "" },
          },
          { _id: false }
        ),
      ],
      required: false,
      default: undefined,
    },
    checkoutChargesTotal: { type: Number, required: false, default: 0 },
    checkoutTotal: { type: Number, required: false, default: 0 },
    // Snapshot of deposit settlement at checkout (for quick view in booking detail)
    depositSettlement: {
      type: {
        type: String,
        required: false,
        enum: ["NONE", "CASH", "KTP", "SIM", "PASSPORT", ""],
        default: "",
      },
      deductedAmount: { type: Number, required: false, default: 0 },
      returnedAmount: { type: Number, required: false, default: 0 },
      returnStatus: { type: String, required: false, default: "" },
    },
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", BookingSchema);
