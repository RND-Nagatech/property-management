import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDb } from "../db.js";
import { env } from "../env.js";
import { AdminUser } from "../models/AdminUser.js";

dotenv.config();

async function main() {
  await connectDb(env.MONGODB_URI);

  const username = "rnd";
  const password = "b3r4sput1h";

  const existing = await AdminUser.findOne({ username });
  if (existing) {
    console.log(`Admin user already exists: ${username}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await AdminUser.create({ username, nama: "RND", role: "admin", passwordHash, isActive: true });
  console.log(`Seeded admin user: ${username} / ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

