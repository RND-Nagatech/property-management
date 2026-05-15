function titleCaseWords(input: string) {
  return input
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function labelEnum(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";

  const v = raw.toLowerCase();

  const overrides: Record<string, string> = {
    // payment method
    transfer_bank: "Transfer Bank",
    qris: "QRIS",
    cash: "Cash",
    transfer: "Transfer Bank",

    // payment status
    waiting_confirmation: "Menunggu Verifikasi",
    pending_verification: "Menunggu Verifikasi",
    unpaid: "Menunggu Pembayaran",
    waiting_payment: "Menunggu Pembayaran",
    paid: "Lunas",
    approved: "Lunas",
    failed: "Gagal",

    // booking status
    pending_payment: "Menunggu Pembayaran",
    confirmed: "Dikonfirmasi",
    confirmed_paid: "Terkonfirmasi",
    checked_in: "Check-in",
    checked_out: "Check-out",
    cancelled: "Dibatalkan",
    cancelled_by_customer: "Dibatalkan Customer",
  };

  if (overrides[v]) return overrides[v];

  // fallback: replace separators then Title Case
  const normalized = v.replace(/[_-]+/g, " ");
  return titleCaseWords(normalized);
}
