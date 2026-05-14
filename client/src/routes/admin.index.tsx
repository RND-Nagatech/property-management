import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  LogIn,
  LogOut,
  BedDouble,
  DollarSign,
  Wrench,
} from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { useDashboard } from "@/hooks/useDashboard";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Stayly Admin" }] }),
  component: Dashboard,
});

function formatTodayId(date = new Date()) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function Dashboard() {
  const adminLoggedIn = useAdminAuth();
  const dash = useDashboard(adminLoggedIn);

  const totals = dash.data?.totals;
  const trend = dash.data?.pendapatanTrend14 ?? [];
  const stats = totals
    ? [
        {
          label: "Total Booking",
          value: String(totals.totalBooking),
          change: "",
          up: true,
          icon: Calendar,
        },
        {
          label: "Check-in Hari Ini",
          value: String(totals.checkInHariIni),
          change: "",
          up: true,
          icon: LogIn,
        },
        {
          label: "Check-out Hari Ini",
          value: String(totals.checkOutHariIni),
          change: "",
          up: true,
          icon: LogOut,
        },
        {
          label: "Kamar Tersedia",
          value: String(totals.kamarTersedia),
          change: "",
          up: true,
          icon: BedDouble,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Selamat datang kembali 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan operasional Stayly Resort hari ini
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Hari ini, </span>
          <span className="font-semibold">{formatTodayId()}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dash.isLoading && (
          <div className="col-span-full rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Memuat dashboard...
          </div>
        )}
        {dash.isError && (
          <div className="col-span-full rounded-2xl bg-card p-6 text-sm text-destructive shadow-[var(--shadow-card)]">
            {dash.error instanceof Error ? dash.error.message : "Gagal memuat dashboard"}
          </div>
        )}
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <s.icon className="h-5 w-5" />
              </div>
              {s.change && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${s.up ? "text-accent" : "text-destructive"}`}
                >
                  {s.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {s.change}
                </span>
              )}
            </div>
            <div className="mt-4 text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
        {!dash.isLoading && !dash.isError && stats.length === 0 && (
          <div className="col-span-full rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Belum ada data untuk dashboard.
          </div>
        )}
      </div>

      {/* Revenue + activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Pendapatan</h3>
              <p className="text-xs text-muted-foreground">Mei 2026</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-secondary p-1 text-xs">
              {["7H", "30H", "12B"].map((t, i) => (
                <button
                  key={t}
                  className={`rounded-md px-3 py-1 font-medium ${i === 1 ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-end gap-6">
            <div>
              <div className="text-3xl font-bold">
                {formatRupiah(totals?.pendapatanBulanan ?? 0)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Hari ini:{" "}
              <span className="font-semibold text-foreground">
                {formatRupiah(totals?.pendapatanHariIni ?? 0)}
              </span>
            </div>
          </div>
          {/* Mini chart */}
          <div className="mt-6 flex h-44 items-end gap-2">
            {trend.length > 0 ? (
              (() => {
                const max = Math.max(1, ...trend.map((t) => Number(t.total ?? 0)));
                return trend.map((t) => {
                  const h = Math.round((Number(t.total ?? 0) / max) * 100);
                  return (
                    <div
                      key={t.day}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-accent/30 to-accent"
                      style={{ height: `${Math.max(4, h)}%` }}
                      title={`${t.day} • ${formatRupiah(Number(t.total ?? 0))}`}
                    />
                  );
                });
              })()
            ) : (
              <div className="text-sm text-muted-foreground">Belum ada data pendapatan.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Aktivitas Terbaru</h3>
          <ul className="mt-4 space-y-4">
            {(() => {
              const items: Array<{ icon: any; title: string; sub: string; color: string }> = [];
              const latestBooking = (dash.data?.bookingTerbaru ?? [])[0];
              if (latestBooking) {
                items.push({
                  icon: Calendar,
                  title: `Booking baru ${latestBooking.kodeBooking}`,
                  sub: `${(latestBooking.roomTypeId as any)?.namaTipe ?? "-"} · ${String(latestBooking.checkIn).slice(0, 10)}`,
                  color: "text-accent",
                });
              }
              const latestMaintenance = (dash.data?.kerusakanAktif ?? [])[0];
              if (latestMaintenance) {
                items.push({
                  icon: Wrench,
                  title: `Kerusakan: ${latestMaintenance.judul}`,
                  sub: `${(latestMaintenance.roomId as any)?.nomorKamar ? `Kamar ${(latestMaintenance.roomId as any).nomorKamar}` : (latestMaintenance.roomTypeId as any)?.namaTipe ?? "-"}`,
                  color: "text-warning",
                });
              }
              if ((totals?.pembayaranPending ?? 0) > 0) {
                items.push({
                  icon: DollarSign,
                  title: "Pembayaran pending",
                  sub: `${totals?.pembayaranPending} pembayaran menunggu verifikasi`,
                  color: "text-accent",
                });
              }
              if (!dash.isLoading && !dash.isError && items.length === 0) {
                items.push({
                  icon: ArrowUpRight,
                  title: "Belum ada aktivitas",
                  sub: "Aktivitas akan muncul saat ada booking/pembayaran/kerusakan.",
                  color: "text-muted-foreground",
                });
              }
              return items;
            })().map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary ${a.color}`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.sub}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Booking Terbaru</h3>
          <button className="text-xs font-semibold text-accent">Lihat semua</button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3 font-semibold">Booking</th>
                <th className="pb-3 font-semibold">Tamu</th>
                <th className="pb-3 font-semibold">Kamar</th>
                <th className="pb-3 font-semibold">Tanggal</th>
                <th className="pb-3 font-semibold">Total</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(dash.data?.bookingTerbaru ?? []).map((b) => (
                <tr key={b._id} className="hover:bg-secondary/40">
                  <td className="py-4 font-mono text-xs font-semibold">{b.kodeBooking}</td>
                  <td className="py-4 font-medium">{(b.tamuId as any)?.nama ?? "-"}</td>
                  <td className="py-4 text-muted-foreground">{(b.roomTypeId as any)?.namaTipe ?? "-"}</td>
                  <td className="py-4 text-muted-foreground">{String(b.checkIn).slice(0, 10)}</td>
                  <td className="py-4 font-semibold">{formatRupiah(b.total ?? 0)}</td>
                  <td className="py-4">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!dash.isLoading &&
                !dash.isError &&
                (dash.data?.bookingTerbaru?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Belum ada booking terbaru.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
