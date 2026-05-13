import mongoose from "mongoose";

const CalendarEventSchema = new mongoose.Schema(
  {
    tanggal: { type: Date, required: true, index: true },
    label: { type: String, required: true, trim: true },
    colorClass: { type: String, required: false, default: "bg-secondary text-muted-foreground" },
  },
  { timestamps: true }
);

export const CalendarEvent = mongoose.model("CalendarEvent", CalendarEventSchema);

