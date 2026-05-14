import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./env.js";
import { connectDb } from "./db.js";
import bcrypt from "bcryptjs";
import { AdminUser } from "./models/AdminUser.js";
import { roomsRouter } from "./routes/rooms.js";
import { roomTypesRouter } from "./routes/room-types.js";
import { guestsRouter } from "./routes/guests.js";
import { bookingsRouter } from "./routes/bookings.js";
import { paymentsRouter } from "./routes/payments.js";
import { depositsRouter } from "./routes/deposits.js";
import { maintenancesRouter } from "./routes/maintenances.js";
import { expensesRouter } from "./routes/expenses.js";
import { calendarRouter } from "./routes/calendar.js";
import { settingsRouter } from "./routes/settings.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { reportsRouter } from "./routes/reports.js";
import { authRouter } from "./routes/auth.js";
import { adminPaymentsRouter } from "./routes/admin-payments.js";
import { adminBookingsRouter } from "./routes/admin-bookings.js";
import { adminAuthRouter } from "./routes/admin-auth.js";
import { adminUsersRouter } from "./routes/admin-users.js";
import { availabilityRouter } from "./routes/availability.js";
import { invoicesRouter } from "./routes/invoices.js";
import { testimonialsRouter } from "./routes/testimonials.js";
import { adminTestimonialsRouter } from "./routes/admin-testimonials.js";

async function main() {
  await connectDb(env.MONGODB_URI);

  // Ensure there's always at least one admin user for first run.
  try {
    const count = await AdminUser.countDocuments({});
    if (count === 0) {
      const passwordHash = await bcrypt.hash("b3r4sput1h", 10);
      await AdminUser.create({
        username: "rnd",
        nama: "RND",
        role: "admin",
        isActive: true,
        passwordHash,
      });
      console.log("Seeded default admin user: rnd / b3r4sput1h");
    }
  } catch (e) {
    console.warn("Failed to auto-seed default admin user:", e);
  }

  const app = express();
  app.disable("x-powered-by");

  app.use(morgan("dev"));
  app.use(express.json({ limit: "6mb" }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser tools (no Origin) and configured origins.
        if (!origin) return cb(null, true);
        const allowed = String(env.CORS_ORIGIN || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (allowed.length === 0) return cb(null, true);
        return cb(null, allowed.includes(origin));
      },
      credentials: true,
    })
  );

  // Serve uploaded/static assets if present (e.g. /uploads/xxx.jpg)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/admin/auth", adminAuthRouter);
  app.use("/api/admin/users", adminUsersRouter);
  app.use("/api/admin/payments", adminPaymentsRouter);
  app.use("/api/admin/bookings", adminBookingsRouter);
  app.use("/api/availability", availabilityRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/testimonials", testimonialsRouter);
  // Admin-only endpoints should live under /api/admin/* so FE sends admin token.
  app.use("/api/admin/testimonials", adminTestimonialsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/room-types", roomTypesRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/guests", guestsRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/deposits", depositsRouter);
  app.use("/api/maintenances", maintenancesRouter);
  app.use("/api/expenses", expensesRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/settings", settingsRouter);

  // Minimal error handler (keep response shape consistent)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
  });

  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
