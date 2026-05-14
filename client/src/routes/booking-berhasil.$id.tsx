import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/customer/Nav";
import { CheckCircle2, QrCode, Download, Calendar } from "lucide-react";
import { isLoggedIn } from "@/services/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { resolveMediaUrl } from "@/lib/media";
import heroImg from "@/assets/hero-villa.jpg";

export const Route = createFileRoute("/booking-berhasil/$id")({
  head: () => ({ meta: [{ title: "Booking Berhasil — Stayly" }] }),
  component: Success,
});

function Success() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const [qr, setQr] = useState<string>("");

  const booking = useQuery({
    queryKey: ["bookings", params.id],
    enabled: isLoggedIn(),
    queryFn: () => apiRequest<any>(`/bookings/${encodeURIComponent(params.id)}`),
  });

  useEffect(() => {
    const code = String(booking.data?.kodeBooking ?? "");
    if (!code) return;
    QRCodeLib.toDataURL(code, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(""));
  }, [booking.data?.kodeBooking]);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate({ to: "/login", search: { redirectTo: `/booking-berhasil/${params.id}` } as any });
    }
  }, [navigate, params.id]);
  if (!isLoggedIn()) return null;

  if (booking.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">
          Memuat booking...
        </div>
      </div>
    );
  }

  if (booking.isError) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-destructive">
          {booking.error instanceof Error ? booking.error.message : "Gagal memuat booking"}
        </div>
      </div>
    );
  }

  const data = booking.data;
  const roomType = data?.roomTypeId;
  const invoiceUrl = `${(import.meta.env.VITE_API_BASE_URL as string) ?? "http://localhost:4000/api"}/invoices/${data?._id}`;
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-12 w-12 text-accent" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Booking Berhasil!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Konfirmasi telah dikirim ke email Anda. Tunjukkan QR code di bawah saat check-in.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Booking Code
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tracking-widest">
              {data?.kodeBooking ?? "-"}
            </div>
          </div>

          <div className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-secondary">
              {qr ? (
                <img src={qr} alt="QR Booking" className="h-40 w-40" />
              ) : (
                <QrCode className="h-32 w-32 text-primary" />
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-secondary/50 p-5 text-left">
            <div className="flex items-center gap-3">
              {roomType?.gambarThumbnail ? (
                <img
                  src={resolveMediaUrl(roomType.gambarThumbnail) || heroImg}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-secondary" />
              )}
              <div>
                <div className="text-sm font-bold">{roomType?.namaTipe ?? "-"}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{" "}
                  {String(data?.checkIn ?? "").slice(0, 10)} → {String(data?.checkOut ?? "").slice(0, 10)}
                </div>
              </div>
              <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                {data?.bookingStatus === "confirmed"
                  ? "Dikonfirmasi"
                  : data?.bookingStatus === "waiting_confirmation"
                    ? "Menunggu Konfirmasi"
                    : data?.bookingStatus === "pending_payment"
                      ? "Menunggu Pembayaran"
                      : "Menunggu"}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold"
            >
              <Download className="h-4 w-4" /> Download Invoice
            </a>
            <Link
              to="/booking-saya"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground"
            >
              Lihat Booking Saya
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
