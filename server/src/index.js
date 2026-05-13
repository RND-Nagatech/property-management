import express from "express";
import cors from "cors";
import morgan from "morgan";

import { env } from "./env.js";
import { connectDb } from "./db.js";
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

async function main() {
  await connectDb(env.MONGODB_URI);

  const app = express();
  app.disable("x-powered-by");

  app.use(morgan("dev"));
  app.use(express.json({ limit: "6mb" }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/admin/payments", adminPaymentsRouter);
  app.use("/api/admin/bookings", adminBookingsRouter);
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
