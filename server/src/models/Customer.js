import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    namaLengkap: { type: String, required: true, trim: true },
    noHp: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    nik: { type: String, required: false, trim: true, default: "" },
    alamat: { type: String, required: false, trim: true, default: "" },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ email: 1 }, { unique: true });
CustomerSchema.index({ noHp: 1 }, { unique: true, partialFilterExpression: { noHp: { $type: "string" } } });

export const Customer = mongoose.model("Customer", CustomerSchema);
