function rupiah(n) {
  const v = Number(n ?? 0) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function waPaymentSubmitted({
  customerName,
  bookingCode,
  totalAmount,
  checkIn,
  checkOut,
}) {
  return [
    `Pembayaran Berhasil Dikirim`,
    ``,
    `Halo ${customerName || "Customer"},`,
    `Bukti pembayaran Anda sudah kami terima.`,
    `Status: Menunggu Verifikasi Admin`,
    ``,
    `No Booking: ${bookingCode}`,
    `Total Pembayaran: ${rupiah(totalAmount)}`,
    `Check-in: ${String(checkIn).slice(0, 10)}`,
    `Check-out: ${String(checkOut).slice(0, 10)}`,
    ``,
    `Kami akan mengirimkan invoice resmi setelah pembayaran diverifikasi.`,
  ].join("\n");
}

export function waInvoiceVerified({
  customerName,
  bookingCode,
  invoiceNumber,
  roomTypeName,
  checkIn,
  checkOut,
  nights,
  pricePerNight,
  totalAmount,
}) {
  return [
    `Invoice Booking ${bookingCode}`,
    ``,
    `Halo ${customerName || "Customer"},`,
    `Pembayaran Anda sudah *Terverifikasi/Lunas*.`,
    ``,
    `No Booking: ${bookingCode}`,
    `No Invoice: ${invoiceNumber || "-"}`,
    `Tipe Kamar: ${roomTypeName || "-"}`,
    `Check-in: ${String(checkIn).slice(0, 10)}`,
    `Check-out: ${String(checkOut).slice(0, 10)}`,
    `Total malam: ${nights}`,
    `Harga/malam: ${rupiah(pricePerNight)}`,
    `Total pembayaran: ${rupiah(totalAmount)}`,
    ``,
    `Invoice PDF terlampir.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function waPaymentRejected({ customerName, bookingCode, reason }) {
  return [
    `Pembayaran Ditolak`,
    ``,
    `Halo ${customerName || "Customer"},`,
    `Pembayaran untuk booking *${bookingCode}* ditolak oleh admin.`,
    reason ? `Alasan: ${reason}` : "",
    ``,
    `Silakan unggah ulang bukti pembayaran yang valid.`,
  ]
    .filter(Boolean)
    .join("\n");
}
