import mongoose from "mongoose";

export async function connectDb(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);

  // Dev-safety: clean up legacy indexes from earlier schema experiments
  try {
    const indexes = await mongoose.connection.db.collection("rooms").indexes();
    const legacy = indexes.find((idx) => idx.name === "code_1");
    if (legacy) await mongoose.connection.db.collection("rooms").dropIndex("code_1");
  } catch {
    // ignore
  }
}
