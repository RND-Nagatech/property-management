import mongoose from "mongoose";

const AdminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    nama: { type: String, required: false, trim: true, default: "" },
    role: { type: String, required: true, default: "admin" },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

AdminUserSchema.index({ username: 1 }, { unique: true });

export const AdminUser = mongoose.model("AdminUser", AdminUserSchema);

