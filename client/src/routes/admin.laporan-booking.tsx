import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Download } from "lucide-react";
import { useBookingReport } from "@/hooks/useReports";

export const Route = createFileRoute("/admin/laporan-booking")({
  head: () => ({ meta: [{ title: "Laporan Booking" }] }),
  component: Lap,
});

function Lap() {
  const report = useBookingReport();
  const stats = [
    { l: "Total Booking", v: String(report.data?.totalBooking ?? 0) },
    { l: "Sukses", v: String(report.data?.sukses ?? 0) },
    { l: "Dibatalkan", v: String(report.data?.dibatalkan ?? 0) },
    { l: "Avg. Length", v: `${(report.data?.avgLengthNights ?? 0).toFixed(1)} mlm` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Booking" desc="Statistik & tren reservasi">
        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium">
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
    </div>
  );
}
