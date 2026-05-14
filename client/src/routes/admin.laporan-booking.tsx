import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Download } from "lucide-react";
import { useBookingReport } from "@/hooks/useReports";
import { useSettings } from "@/hooks/useSettings";
import * as React from "react";
import { formatRupiah } from "@/lib/currency";

export const Route = createFileRoute("/admin/laporan-booking")({
  head: () => ({ meta: [{ title: "Laporan Booking" }] }),
  component: Lap,
});

function Lap() {
  const report = useBookingReport();
  const settings = useSettings();
  const propertyName = React.useMemo(() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return String(map.get("propertyName") ?? "").trim() || "Properti";
  }, [settings.data]);

  function exportPdf() {
    const title = "Laporan Booking";
    const rows = report.data?.bookings ?? [];
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>${title}</title>
<style>
body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; padding:24px; color:#111}
h1{margin:0; font-size:18px}
h2{margin:8px 0 0; font-size:14px; font-weight:600; color:#444}
.meta{margin-top:6px; font-size:12px; color:#666}
table{width:100%; border-collapse:collapse; margin-top:14px}
th,td{border:1px solid #e5e7eb; padding:8px; font-size:12px; text-align:left; vertical-align:top}
th{background:#f9fafb}
.right{text-align:right}
@media print { .no-print{display:none} body{padding:0} }
</style></head>
<body>
<h1>${propertyName}</h1>
<h2>${title}</h2>
<div class="meta">Dicetak: ${new Date().toLocaleString("id-ID")}</div>
<table>
<thead><tr><th>Tanggal</th><th>No Booking</th><th>Tamu</th><th>Tipe Kamar</th><th>Check-in</th><th>Check-out</th><th>Status</th><th class="right">Total</th></tr></thead>
<tbody>
${rows
  .map(
    (b) =>
      `<tr><td>${String(b.createdAt ?? "").slice(0, 10)}</td><td>${b.kodeBooking ?? "-"}</td><td>${b.guestName ?? "-"}</td><td>${b.roomTypeName ?? "-"}</td><td>${String(b.checkIn ?? "").slice(0, 10)}</td><td>${String(b.checkOut ?? "").slice(0, 10)}</td><td>${b.bookingStatus ?? "-"}</td><td class="right">${formatRupiah(b.total ?? 0)}</td></tr>`
  )
  .join("") || `<tr><td colspan="8">Tidak ada data booking.</td></tr>`}
</tbody></table>
<div class="no-print" style="margin-top:18px; font-size:12px; color:#666">Gunakan dialog print browser untuk simpan sebagai PDF.</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      URL.revokeObjectURL(url);
      return;
    }
    w.addEventListener(
      "load",
      () => {
        try {
          w.focus();
          w.print();
        } finally {
          URL.revokeObjectURL(url);
        }
      },
      { once: true },
    );
  }
  const stats = [
    { l: "Total Booking", v: String(report.data?.totalBooking ?? 0) },
    { l: "Sukses", v: String(report.data?.sukses ?? 0) },
    { l: "Dibatalkan", v: String(report.data?.dibatalkan ?? 0) },
    { l: "Avg. Length", v: `${(report.data?.avgLengthNights ?? 0).toFixed(1)} mlm` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Booking" desc="Statistik & tren reservasi">
        <button
          onClick={exportPdf}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="mt-2 text-2xl font-bold">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-bold">Tren Booking 30 Hari</h3>
        {report.isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Memuat laporan...</div>
        )}
        {report.isError && (
          <div className="mt-4 text-sm text-destructive">
            {report.error instanceof Error ? report.error.message : "Gagal memuat laporan"}
          </div>
        )}
        <div className="mt-5 flex h-48 items-end gap-1.5">
          {(
            report.data?.trend30 ??
            Array.from({ length: 30 }).map((_, i) => ({ day: String(i), total: 0 }))
          ).map((d, i, arr) => {
            const max = Math.max(1, ...arr.map((x) => x.total));
            const h = (d.total / max) * 100;
            return (
              <div
                key={d.day}
                className="flex-1 rounded-t-md bg-gradient-to-t from-primary/30 to-primary"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        <h3 className="text-base font-bold mb-4">Detail Booking</h3>
        {report.isLoading && <div className="text-sm text-muted-foreground">Memuat...</div>}
        {report.isError && (
          <div className="text-sm text-destructive">
            {report.error instanceof Error ? report.error.message : "Gagal memuat laporan"}
          </div>
        )}
        {!report.isLoading && !report.isError && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3 font-semibold">Tanggal</th>
                <th className="pb-3 font-semibold">No Booking</th>
                <th className="pb-3 font-semibold">Tamu</th>
                <th className="pb-3 font-semibold">Tipe</th>
                <th className="pb-3 font-semibold">Check-in</th>
                <th className="pb-3 font-semibold">Check-out</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(report.data?.bookings ?? []).map((b) => (
                <tr key={b._id}>
                  <td className="py-3.5 text-muted-foreground">{String(b.createdAt ?? "").slice(0, 10)}</td>
                  <td className="py-3.5 font-medium">{b.kodeBooking ?? "-"}</td>
                  <td className="py-3.5">{b.guestName ?? "-"}</td>
                  <td className="py-3.5">{b.roomTypeName ?? "-"}</td>
                  <td className="py-3.5 text-muted-foreground">{String(b.checkIn ?? "").slice(0, 10)}</td>
                  <td className="py-3.5 text-muted-foreground">{String(b.checkOut ?? "").slice(0, 10)}</td>
                  <td className="py-3.5">{b.bookingStatus ?? "-"}</td>
                  <td className="py-3.5 text-right font-semibold">{formatRupiah(b.total ?? 0)}</td>
                </tr>
              ))}
              {(report.data?.bookings ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada booking pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
