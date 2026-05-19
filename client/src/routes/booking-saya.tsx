import React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar, MobileNav } from "@/components/customer/Nav";
import { formatRupiah } from "@/lib/currency";
import { useSettings } from "@/hooks/useSettings";
import { useCountdown } from "@/hooks/useCountdown";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { Calendar, QrCode, FileText, ChevronRight, X } from "lucide-react";
import { isLoggedIn } from "@/services/auth";
import { resolveMediaUrl } from "@/lib/media";
import { toast } from "sonner";

export const Route = createFileRoute("/booking-saya")({
  head: () => ({ meta: [{ title: "Booking Saya" }] }),
  component: MyBookings,
});

function labelStatus(b: any) {
  const s = String(b?.bookingStatus ?? "");
  if (s === "pending_payment") return "Menunggu Pembayaran";
  if (s === "waiting_confirmation") return "Menunggu Konfirmasi";
  if (s === "confirmed") return "Dikonfirmasi";
  if (s === "checked_in") return "Check-in";
  if (s === "checked_out") return "Check-out";
  if (s === "cancelled") return "Dibatalkan";
  return String(b?.status ?? "-");
}

function statusClass(label: string) {
  if (label.includes("Menunggu")) return "bg-warning/15 text-warning";
  if (label === "Dikonfirmasi") return "bg-blue-100 text-blue-700";
  if (label === "Check-in") return "bg-accent/10 text-accent";
  if (label === "Check-out") return "bg-secondary text-muted-foreground";
  if (label === "Dibatalkan") return "bg-destructive/10 text-destructive";
  return "bg-secondary text-muted-foreground";
}

const tabs = ["Semua", "Aktif", "Selesai", "Dibatalkan"];

// normalizeBookingItems moved above BookingCard

function BookingCard({
  b,
  expireMinutes,
  cancelPending,
  onCancel,
}: {
  b: any;
  expireMinutes: number;
  cancelPending: boolean;
  onCancel: (id: string) => void;
}) {
  const items = normalizeBookingItems(b);
  const first = items[0] ?? { name: "-", quantity: 1, thumbnail: "", slug: "" };
  const st = labelStatus(b);
  const bs = String(b.bookingStatus ?? "");
  const invoiceUrl = `${(import.meta.env.VITE_API_BASE_URL as string) ?? "http://localhost:4000/api"}/invoices/${b._id}`;
  const canCancel = bs === "pending_payment" || bs === "waiting_confirmation" || bs === "confirmed";
  const paymentStatus = String(b.paymentStatus ?? "");
  const canAccessProof = paymentStatus === "paid";

  const countdownTarget =
    b.createdAt && expireMinutes > 0
      ? new Date(b.createdAt).getTime() + expireMinutes * 60 * 1000
      : null;
  const [countdown, countdownSec] = useCountdown(bs === "pending_payment" ? countdownTarget : null);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] max-w-full">
      <div className="flex gap-4 max-w-full">
        {first.thumbnail ? (
          <img
            src={resolveMediaUrl(first.thumbnail) || first.thumbnail}
            alt=""
            className="h-20 w-24 shrink-0 rounded-xl object-cover sm:h-24 sm:w-28"
          />
        ) : (
          <div className="h-20 w-24 shrink-0 rounded-xl bg-secondary sm:h-24 sm:w-28" />
        )}
        <div className="flex-1 min-w-0 max-w-full">
          <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 max-w-full">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{b.kodeBooking}</div>
              <div className="mt-0.5 truncate text-base font-bold">
                {items.length <= 1
                  ? `${first.name} x ${first.quantity}`
                  : `${first.name} x ${first.quantity} + ${items.length - 1} tipe`}
              </div>
              {items.length > 1 && (
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {items
                    .slice(1)
                    .map((it: any) => `${it.name} x ${it.quantity}`)
                    .join(", ")}
                </div>
              )}
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {String(b.checkIn).slice(0, 10)} → {String(b.checkOut).slice(0, 10)}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(st)}`}
            >
              {st}
              {bs === "pending_payment" && countdownSec > 0 && (
                <span className="ml-2 font-mono text-xs text-warning">{countdown}</span>
              )}
              {bs === "pending_payment" && countdownSec === 0 && (
                <span className="ml-2 font-mono text-xs text-destructive">Expired</span>
              )}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-base font-bold">{formatRupiah(b.total ?? 0)}</div>
            <div className="flex flex-wrap gap-1.5 min-w-0 max-w-full">
              {bs === "pending_payment" && (
                <Link
                  to="/pembayaran/$id"
                  params={{ id: b._id }}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground max-w-full"
                  style={{ minWidth: 0 }}
                >
                  <span className="truncate">Lanjut Bayar</span> <ChevronRight className="h-3 w-3" />
                </Link>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={cancelPending}
                  onClick={() => {
                    const paid = paymentStatus === "paid";
                    toast("Batalkan booking ini?", {
                      description: paid
                        ? "Pembayaran sudah diverifikasi. Jika pesanan dibatalkan, dana tidak dapat dikembalikan."
                        : "Booking yang dibatalkan tidak bisa dipulihkan.",
                      action: {
                        label: "Batalkan",
                        onClick: () => onCancel(b._id),
                      },
                      cancel: { label: "Tutup" } as any,
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold max-w-full"
                  title="Batalkan booking"
                >
                  <X className="h-3 w-3" /> Batal
                </button>
              )}
              {bs === "checked_out" && (
                <Link
                  to="/testimoni/$id"
                  params={{ id: b._id }}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground max-w-full"
                >
                  Beri Testimoni <ChevronRight className="h-3 w-3" />
                </Link>
              )}
              {canAccessProof ? (
                <Link
                  to="/booking-berhasil/$id"
                  params={{ id: b._id }}
                  className="rounded-lg border border-border p-2 max-w-full"
                  title="Lihat QR Booking"
                >
                  <QrCode className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    toast.error(
                      paymentStatus === "waiting_confirmation"
                        ? "Pembayaran masih dalam proses verifikasi."
                        : "Selesaikan pembayaran terlebih dahulu."
                    )
                  }
                  className="rounded-lg border border-border p-2 opacity-60"
                  title="Belum bisa diakses"
                >
                  <QrCode className="h-4 w-4" />
                </button>
              )}
              <a
                href={canAccessProof ? invoiceUrl : undefined}
                target={canAccessProof ? "_blank" : undefined}
                rel={canAccessProof ? "noreferrer" : undefined}
                onClick={(e) => {
                  if (canAccessProof) return;
                  e.preventDefault();
                  toast.error(
                    paymentStatus === "waiting_confirmation"
                      ? "Pembayaran masih dalam proses verifikasi."
                      : "Selesaikan pembayaran terlebih dahulu."
                  );
                }}
                className={`rounded-lg border border-border p-2 inline-flex max-w-full ${canAccessProof ? "" : "opacity-60"}`}
                title={canAccessProof ? "Download Invoice" : "Belum bisa diakses"}
              >
                <FileText className="h-4 w-4" />
              </a>
              {first.slug && (
                <Link
                  to="/kamar/$id"
                  params={{ id: first.slug }}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground max-w-full"
                >
                  <span className="truncate">Detail</span> <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyBookings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = React.useState(1); // 0: Semua, 1: Aktif, 2: Selesai, 3: Dibatalkan
  const bookings = useQuery({
    queryKey: ["bookings", "my"],
    enabled: isLoggedIn(),
    queryFn: () => apiRequest<any[]>("/bookings/my"),
  });

  const cancelBooking = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const filteredBookings = React.useMemo(() => {
    const data = bookings.data ?? [];
    if (activeTab === 1) {
      return data.filter((b) =>
        ["pending_payment", "waiting_confirmation", "confirmed", "checked_in"].includes(
          String(b.bookingStatus ?? "")
        )
      );
    }
    if (activeTab === 2) return data.filter((b) => String(b.bookingStatus ?? "") === "checked_out");
    if (activeTab === 3) return data.filter((b) => String(b.bookingStatus ?? "") === "cancelled");
    return data;
  }, [activeTab, bookings.data]);

  React.useEffect(() => {
    if (!isLoggedIn()) navigate({ to: "/login", search: { redirectTo: "/booking-saya" } as any });
  }, [navigate]);
  if (!isLoggedIn()) return null;

  const settings = useSettings();
  const expireMinutes = React.useMemo(() => {
    const s = settings.data?.find((x) => x.key === "bookingExpireMinutes");
    return Number(s?.value ?? 30);
  }, [settings.data]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <TopBar />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold md:text-3xl">Booking Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua booking dan riwayat menginap Anda
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((t, i) => (
            <button
              key={t}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${activeTab === i ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {bookings.isLoading && (
            <div className="text-center text-muted-foreground py-10">Memuat booking...</div>
          )}
          {bookings.isError && (
            <div className="text-center text-destructive py-10">
              {bookings.error instanceof Error ? bookings.error.message : "Gagal memuat booking"}
            </div>
          )}
          {!bookings.isLoading && !bookings.isError && filteredBookings.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              Tidak ada booking pada kategori ini.
            </div>
          )}
          {filteredBookings.map((b) => (
            <BookingCard
              key={b._id}
              b={b}
              expireMinutes={expireMinutes}
              cancelPending={cancelBooking.isPending}
              onCancel={(id) => cancelBooking.mutate(id)}
            />
          ))}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

function normalizeBookingItems(b: any) {
  const items = Array.isArray(b?.bookingItems) ? b.bookingItems : [];
  if (items.length) {
    return items.map((it: any) => {
      const rt = it?.roomTypeId && typeof it.roomTypeId === "object" ? it.roomTypeId : null;
      const name = String(it?.roomTypeName ?? rt?.namaTipe ?? "-");
      const quantity = Math.max(1, Number(it?.quantity ?? 1));
      const thumbnail = rt?.gambarThumbnail ? String(rt.gambarThumbnail) : "";
      const slug = rt?.slug ? String(rt.slug) : "";
      return { name, quantity, thumbnail, slug };
    });
  }
  const rt = b?.roomTypeId && typeof b.roomTypeId === "object" ? b.roomTypeId : null;
  return [
    {
      name: String(rt?.namaTipe ?? "-"),
      quantity: 1,
      thumbnail: rt?.gambarThumbnail ? String(rt.gambarThumbnail) : "",
      slug: rt?.slug ? String(rt.slug) : "",
    },
  ];
}
