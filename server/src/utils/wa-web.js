import fs from "node:fs/promises";
import path from "node:path";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

const AUTH_DIR = path.resolve(process.cwd(), ".wa_auth");

const state = {
  status: "disconnected", // disconnected | connecting | qr | connected
  qr: "",
  me: "",
  lastError: "",
  lastErrorDetail: null,
  socket: null,
  connectPromise: null,
  reconnectTimer: null,
  baileysVersion: null,
};

const setStatus = (status) => {
  state.status = status;
};

const getSnapshot = () => ({
  status: state.status,
  qr: state.qr,
  me: state.me,
  lastError: state.lastError,
  lastErrorDetail: state.lastErrorDetail,
});

const clearReconnect = () => {
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  state.reconnectTimer = null;
};

const scheduleReconnect = () => {
  clearReconnect();
  state.reconnectTimer = setTimeout(() => {
    void connectInternal().catch(() => null);
  }, 3000);
};

const startSocket = async () => {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  if (!state.baileysVersion) {
    try {
      const { version } = await fetchLatestBaileysVersion();
      state.baileysVersion = version;
    } catch {
      state.baileysVersion = null;
    }
  }

  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: authState,
    browser: ["Stayly", "Chrome", "1.0.0"],
    syncFullHistory: true,
    markOnlineOnConnect: true,
    ...(state.baileysVersion ? { version: state.baileysVersion } : {}),
  });

  state.socket = sock;
  state.lastError = "";
  state.lastErrorDetail = null;
  state.qr = "";
  state.me = "";

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    void (async () => {
      if (update.connection === "open") {
        state.qr = "";
        state.me = sock?.user?.id ? String(sock.user.id) : "";
        state.lastError = "";
        state.lastErrorDetail = null;
        setStatus("connected");
        clearReconnect();
        return;
      }

      if (update.connection === "close") {
        const statusCode = update?.lastDisconnect?.error?.output?.statusCode;
        const lastErr = update?.lastDisconnect?.error;
        const lastMessage = lastErr?.message || lastErr?.toString?.() || "";
        const detail = {
          message: lastMessage || "",
          statusCode: statusCode || null,
          stack: lastErr?.stack || null,
          data: lastErr?.data || null,
        };
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        state.me = "";
        state.socket = null;

        if (loggedOut) {
          state.qr = "";
          state.lastError = lastMessage || `Logged out (code ${statusCode || "-"})`;
          state.lastErrorDetail = detail;
          setStatus("disconnected");
        } else {
          state.lastError = lastMessage || `Disconnected (code ${statusCode || "-"})`;
          state.lastErrorDetail = detail;
          setStatus("disconnected");
          scheduleReconnect();
        }
        return;
      }

      if (update.connection === "connecting") {
        setStatus("connecting");
      }

      if (update.qr && state.status !== "connected") {
        state.qr = String(update.qr);
        state.me = "";
        setStatus("qr");
      }
    })().catch((err) => {
      state.lastError = err instanceof Error ? err.message : String(err);
      state.lastErrorDetail = { message: state.lastError, stack: err?.stack || null };
      setStatus("disconnected");
    });
  });

  sock.ev.on("messages.upsert", () => {});
};

const connectInternal = async () => {
  if (state.status === "connected") return getSnapshot();
  if (state.connectPromise) return state.connectPromise;
  setStatus("connecting");
  state.connectPromise = (async () => {
    try {
      await startSocket();
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
      setStatus("disconnected");
    } finally {
      state.connectPromise = null;
    }
    return getSnapshot();
  })();
  return state.connectPromise;
};

const waitForQrOrConnected = async ({ timeoutMs = 20000 } = {}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (state.status === "qr" && state.qrDataUrl) return getSnapshot();
    if (state.status === "connected") return getSnapshot();
    if (state.status === "disconnected" && state.lastError) return getSnapshot();
    await new Promise((r) => setTimeout(r, 250));
  }
  return getSnapshot();
};

async function logoutInternal() {
  clearReconnect();
  try {
    if (state.socket) await state.socket.logout();
  } catch {
    // ignore
  }
  state.socket = null;
  state.qr = "";
  state.me = "";
  setStatus("disconnected");
  try {
    await fs.rm(AUTH_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
  return getSnapshot();
}

function normalizeWaPhoneId(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (digits.startsWith("620")) digits = `62${digits.slice(3)}`;
  return digits.startsWith("62") ? digits : null;
}

export async function waGetStatus() {
  return getSnapshot();
}

export async function waConnect() {
  // ensure we have either QR or connected; if auth is bad, force logout then reconnect
  await connectInternal();
  const first = await waitForQrOrConnected();
  if (first.status === "qr" || first.status === "connected") return first;
  // if disconnected with auth present but invalid -> reset
  await logoutInternal();
  await connectInternal();
  return waitForQrOrConnected();
}

export async function waDisconnect() {
  return logoutInternal();
}

export async function waSendText({ to, text }) {
  const normalized = normalizeWaPhoneId(to);
  if (!normalized) return { ok: false, error: "No HP tidak valid" };
  if (!state.socket || state.status !== "connected") {
    return { ok: false, error: "WhatsApp belum terhubung (scan QR dulu)" };
  }
  try {
    const jid = `${normalized}@s.whatsapp.net`;
    await state.socket.sendMessage(jid, { text: String(text ?? "") });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function waSendDocument({ to, buffer, fileName = "invoice.pdf", mimetype = "application/pdf", caption = "" }) {
  const normalized = normalizeWaPhoneId(to);
  if (!normalized) return { ok: false, error: "No HP tidak valid" };
  if (!state.socket || state.status !== "connected") {
    return { ok: false, error: "WhatsApp belum terhubung (scan QR dulu)" };
  }
  if (!buffer) return { ok: false, error: "File kosong" };
  try {
    const jid = `${normalized}@s.whatsapp.net`;
    await state.socket.sendMessage(jid, {
      document: buffer,
      mimetype,
      fileName,
      ...(caption ? { caption: String(caption) } : {}),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
