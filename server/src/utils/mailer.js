import nodemailer from "nodemailer";

function env(name, fallback = "") {
  const v = process.env[name];
  return typeof v === "string" ? v : fallback;
}

function isEnabled() {
  return Boolean(env("SMTP_HOST") && env("SMTP_FROM"));
}

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT", "587"));
  const secure = env("SMTP_SECURE", "").trim() === "true" || port === 465;
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
  return cachedTransporter;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!isEnabled()) {
    // Email disabled; do not throw to keep main flow working.
    return { ok: false, skipped: true, messageId: null, error: "SMTP not configured" };
  }
  try {
    const from = env("SMTP_FROM");
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    return { ok: true, skipped: false, messageId: info.messageId ?? null };
  } catch (err) {
    return { ok: false, skipped: false, messageId: null, error: err instanceof Error ? err.message : String(err) };
  }
}

