function rupiah(n) {
  const v = Number(n ?? 0) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function paymentSubmittedEmail({ customerName, bookingCode, totalAmount, checkIn, checkOut }) {
  const subject = "Pembayaran Berhasil Dikirim";
  const html = `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"/></head>
<body style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; color:#111; padding:20px">
  <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;padding:18px">
    <h2 style="margin:0 0 10px;font-size:18px">${subject}</h2>
    <p style="margin:0 0 12px;font-size:14px">Halo <b>${customerName || "Customer"}</b>,</p>
    <p style="margin:0 0 14px;font-size:14px">
      Bukti pembayaran Anda sudah kami terima. Pembayaran sedang menunggu verifikasi admin.
      Kami akan mengirimkan invoice resmi setelah pembayaran diverifikasi.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Nomor Booking</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600">${bookingCode}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Total Pembayaran</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600">${rupiah(totalAmount)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Check-in</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${String(checkIn).slice(0, 10)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Check-out</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${String(checkOut).slice(0, 10)}</td></tr>
      <tr><td style="padding:8px 0">Status</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#92400e">Menunggu Verifikasi Admin</td></tr>
    </table>
    <p style="margin:14px 0 0;font-size:12px;color:#6b7280">Email ini bukan invoice final.</p>
  </div>
</body>
</html>`;
  const text = `${subject}\n\nNomor Booking: ${bookingCode}\nTotal: ${rupiah(totalAmount)}\nCheck-in: ${String(checkIn).slice(0, 10)}\nCheck-out: ${String(checkOut).slice(0, 10)}\nStatus: Menunggu Verifikasi Admin\n\nBukti pembayaran Anda sudah kami terima. Pembayaran sedang menunggu verifikasi admin.`;
  return { subject, html, text };
}

export function invoiceEmail({
  bookingCode,
  invoiceNumber,
  customerName,
  roomTypeName,
  checkIn,
  checkOut,
  nights,
  pricePerNight,
  totalAmount,
  invoiceUrl,
}) {
  const subject = `Invoice Booking ${bookingCode}`;
  const html = `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"/></head>
<body style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; color:#111; padding:20px">
  <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;padding:18px">
    <h2 style="margin:0 0 10px;font-size:18px">${subject}</h2>
    <p style="margin:0 0 12px;font-size:14px">Halo <b>${customerName || "Customer"}</b>,</p>
    <p style="margin:0 0 14px;font-size:14px">
      Pembayaran Anda sudah <b>terverifikasi</b>. Berikut invoice/receipt resmi untuk booking Anda.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Nomor Booking</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600">${bookingCode}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Nomor Invoice</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${invoiceNumber || "-"}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Tipe Kamar</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${roomTypeName || "-"}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Check-in</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${String(checkIn).slice(0, 10)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Check-out</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${String(checkOut).slice(0, 10)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Total Malam</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${nights}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Harga / malam</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${rupiah(pricePerNight)}</td></tr>
      <tr><td style="padding:8px 0">Total Pembayaran</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0f766e">${rupiah(totalAmount)}</td></tr>
    </table>
    <p style="margin:14px 0 0;font-size:14px">Status pembayaran: <b>Terverifikasi/Lunas</b></p>
    ${
      invoiceUrl
        ? `<p style="margin:10px 0 0;font-size:14px"><a href="${invoiceUrl}">Download Invoice</a></p>`
        : ""
    }
    <p style="margin:14px 0 0;font-size:12px;color:#6b7280">Terima kasih telah melakukan booking.</p>
  </div>
</body>
</html>`;
  const text = `${subject}\n\nNomor Booking: ${bookingCode}\nInvoice: ${invoiceNumber || "-"}\nTipe Kamar: ${roomTypeName || "-"}\nCheck-in: ${String(checkIn).slice(0, 10)}\nCheck-out: ${String(checkOut).slice(0, 10)}\nTotal malam: ${nights}\nHarga/malam: ${rupiah(pricePerNight)}\nTotal: ${rupiah(totalAmount)}\nStatus: Terverifikasi/Lunas\n${invoiceUrl ? `Download: ${invoiceUrl}\n` : ""}`;
  return { subject, html, text };
}

export function paymentRejectedEmail({ customerName, bookingCode, reason }) {
  const subject = "Pembayaran Ditolak";
  const html = `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"/></head>
<body style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; color:#111; padding:20px">
  <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;padding:18px">
    <h2 style="margin:0 0 10px;font-size:18px">${subject}</h2>
    <p style="margin:0 0 12px;font-size:14px">Halo <b>${customerName || "Customer"}</b>,</p>
    <p style="margin:0 0 12px;font-size:14px">
      Pembayaran untuk booking <b>${bookingCode}</b> ditolak oleh admin.
    </p>
    ${reason ? `<p style="margin:0;font-size:14px">Alasan: <b>${reason}</b></p>` : ""}
    <p style="margin:14px 0 0;font-size:12px;color:#6b7280">Silakan unggah ulang bukti pembayaran yang valid.</p>
  </div>
</body>
</html>`;
  const text = `${subject}\n\nBooking: ${bookingCode}\n${reason ? `Alasan: ${reason}\n` : ""}`;
  return { subject, html, text };
}

