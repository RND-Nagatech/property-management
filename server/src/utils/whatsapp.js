function env(name, fallback = "") {
  const v = process.env[name];
  return typeof v === "string" ? v : fallback;
}

export function normalizePhoneE164Digits(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  // Keep digits only
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  // Indonesia default: 0xxx -> 62xxx
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  // If already starts with country code, keep as-is.
  return digits.replace(/\D/g, "");
}

function isEnabled() {
  return Boolean(env("WA_PHONE_NUMBER_ID") && env("WA_ACCESS_TOKEN"));
}

export async function sendWhatsAppText({ to, text }) {
  if (!isEnabled()) {
    return { ok: false, skipped: true, error: "WA not configured" };
  }

  const phoneNumberId = env("WA_PHONE_NUMBER_ID").trim();
  const accessToken = env("WA_ACCESS_TOKEN").trim();
  const toDigits = normalizePhoneE164Digits(to);
  if (!toDigits) return { ok: false, skipped: false, error: "Invalid recipient number" };

  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toDigits,
        type: "text",
        text: { body: String(text ?? "") },
      }),
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = json?.error?.message || `WA request gagal (${resp.status})`;
      return { ok: false, skipped: false, error: msg };
    }
    return { ok: true, skipped: false, data: json };
  } catch (err) {
    return { ok: false, skipped: false, error: err instanceof Error ? err.message : String(err) };
  }
}

