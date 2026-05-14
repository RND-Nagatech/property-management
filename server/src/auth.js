import jwt from "jsonwebtoken";
import { env } from "./env.js";

export function signToken(payload, opts) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d", ...(opts ?? {}) });
}

export function requireAuth(req, res, next) {
  const header = String(req.headers.authorization ?? "");
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Silakan login dulu" } });
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
  }
}

export function requireAdminAuth(req, res, next) {
  const header = String(req.headers.authorization ?? "");
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Silakan login admin dulu" } });
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded?.role !== "admin") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Akses admin diperlukan" } });
    }
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } });
  }
}
