import mongoose from "mongoose";

const TestimonialSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    guestName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    comment: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true }
);

export const Testimonial = mongoose.model("Testimonial", TestimonialSchema);

