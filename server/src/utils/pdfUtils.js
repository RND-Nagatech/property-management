import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const formatRp = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const toBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

function diffNights(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  return nights || 1;
}

function dataUrlToBuffer(dataUrl) {
  const s = String(dataUrl ?? "");
  const m = /^data:([^;]+);base64,(.+)$/.exec(s);
  if (!m) return null;
  try {
    return Buffer.from(m[2], "base64");
  } catch {
    return null;
  }
}

export async function buildInvoicePdf({
  settings,
  booking,
  roomType,
  payment,
}) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const propertyName = String(settings?.propertyName ?? "").trim() || "Properti";
  const address = String(settings?.address ?? "").trim();
  const phone = String(settings?.phone ?? "").trim();
  const contactEmail = String(settings?.contactEmail ?? "").trim();
  const invoiceNote = String(settings?.invoiceNote ?? "").trim();
  const logoDataUrl = String(settings?.logoDataUrl ?? "").trim();

  const bookingCode = String(booking?.kodeBooking || "-");
  const guestName =
    booking?.guestSnapshot?.namaLengkap ||
    booking?.guestSnapshot?.email ||
    (booking?.customerId?.namaLengkap ?? "") ||
    "-";

  const checkIn = booking?.checkIn;
  const checkOut = booking?.checkOut;
  const nights = diffNights(checkIn, checkOut);
  const pricePerNight = Number(roomType?.hargaDefault ?? 0);
  const totalAmount = Number(payment?.jumlah ?? booking?.total ?? pricePerNight * nights);

  // Header (branding)
  const headerTop = doc.y;
  const logoBuf = logoDataUrl ? dataUrlToBuffer(logoDataUrl) : null;
  if (logoBuf) {
    try {
      doc.image(logoBuf, doc.x, headerTop, { width: 46, height: 46, fit: [46, 46] });
    } catch {
      // ignore invalid image
    }
  }
  const titleX = doc.x + (logoBuf ? 56 : 0);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111").text(propertyName, titleX, headerTop, {
    align: "left",
  });
  doc.moveDown(0.15);
  doc.font("Helvetica").fontSize(10).fillColor("#444");
  if (address) doc.text(address, titleX);
  const contactLine = [phone ? `Telp: ${phone}` : "", contactEmail ? `Email: ${contactEmail}` : ""]
    .filter(Boolean)
    .join(" · ");
  if (contactLine) doc.text(contactLine, titleX);

  doc.y = Math.max(doc.y, headerTop + 52);
  doc.moveDown(0.4);
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.6);

  // Title block
  doc.fillColor("#111").font("Helvetica-Bold").fontSize(14).text("INVOICE / RECEIPT", { align: "left" });
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(10).fillColor("#444").text(`No Booking: ${bookingCode}`);
  if (payment?.invoice) doc.text(`No Invoice: ${payment.invoice}`);
  doc.text(`Tanggal: ${new Date().toLocaleString("id-ID")}`);
  doc.moveDown(0.6);

  const tableX = doc.x;
  const col1 = tableX;
  const col2 = 320;

  const row = (label, value) => {
    doc.font("Helvetica").fontSize(11).fillColor("#444").text(label, col1, doc.y, { width: 260 });
    doc.font("Helvetica-Bold").fillColor("#111").text(String(value ?? "-"), col2, doc.y, { width: 220, align: "right" });
    doc.moveDown(0.35);
  };

  row("Nama Customer/Tamu", guestName);
  row("Tipe Kamar", roomType?.namaTipe ?? "-");
  row("Check-in", String(checkIn).slice(0, 10));
  row("Check-out", String(checkOut).slice(0, 10));
  row("Total malam", nights);
  row("Harga / malam", formatRp(pricePerNight));
  row("Total pembayaran", formatRp(totalAmount));
  row("Metode pembayaran", payment?.metode ?? "-");
  row("Status pembayaran", "Terverifikasi/Lunas");

  doc.moveDown(0.6);
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.6);

  // QR Code untuk check-in (scan kode booking)
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text("QR Check-in (Kode Booking)");
  doc.moveDown(0.4);
  const qrPng = await QRCode.toBuffer(bookingCode, { type: "png", width: 180, margin: 1 });
  doc.image(qrPng, { width: 180 });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).fillColor("#444").text(`Kode: ${bookingCode}`);

  if (invoiceNote) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111").text("Catatan");
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(10).fillColor("#444").text(invoiceNote, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    });
  }

  return toBuffer(doc);
}
