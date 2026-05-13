import React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar, MobileNav } from "@/components/customer/Nav";
import { formatRupiah } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { Calendar, QrCode, FileText, ChevronRight } from "lucide-react";
import { isLoggedIn } from "@/services/auth";

export const Route = createFileRoute("/booking-saya")({
  head: () => ({ meta: [{ title: "Booking Saya — Stayly" }] }),
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

function MyBookings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState(0); // 0: Semua, 1: Aktif, 2: Selesai, 3: Dibatalkan
  const bookings = useQuery({
    queryKey: ["bookings", "my"],
    enabled: isLoggedIn(),
    queryFn: () => apiRequest<any[]>("/bookings/my"),
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
          {filteredBookings.map((b) => {
            const roomType = b.roomTypeId;
            const st = labelStatus(b);
            return (
              <div key={b._id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex gap-4">
                  {roomType.gambarThumbnail ? (
                    <img
                      src={roomType.gambarThumbnail}
                      alt=""
                      className="h-20 w-24 shrink-0 rounded-xl object-cover sm:h-24 sm:w-28"
                    />
                  ) : (
                    <div className="h-20 w-24 shrink-0 rounded-xl bg-secondary sm:h-24 sm:w-28" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{b.kodeBooking}</div>
                        <div className="mt-0.5 truncate text-base font-bold">
                          {roomType.namaTipe}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {String(b.checkIn).slice(0, 10)} → {String(b.checkOut).slice(0, 10)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(st)}`}
                      >
                        {st}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div className="text-base font-bold">{formatRupiah(b.total ?? 0)}</div>
                      <div className="flex gap-1.5">
                        <Link
                          to="/booking-berhasil/$id"
                          params={{ id: b._id }}
                          className="rounded-lg border border-border p-2"
                        >
                          <QrCode className="h-4 w-4" />
                        </Link>
                        <button className="rounded-lg border border-border p-2">
                          <FileText className="h-4 w-4" />
                        </button>
                        <Link
                          to="/kamar/$id"
                          params={{ id: roomType.slug }}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                        >
                          Detail <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
