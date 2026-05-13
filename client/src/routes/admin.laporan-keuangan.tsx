import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Download, ArrowUpRight } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { useFinanceReport } from "@/hooks/useReports";

export const Route = createFileRoute("/admin/laporan-keuangan")({
  head: () => ({ meta: [{ title: "Laporan Keuangan" }] }),
  component: Laporan,
});

function Laporan() {
  const report = useFinanceReport();
  const maxBooking = Math.max(
    1,
    ...(report.data?.byRoomType ?? []).map((r) => r.totalBooking ?? 0),
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Keuangan" desc="Pendapatan, biaya, dan laba">
        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium">
          <Download className="h-4 w-4" />
          Export PDF
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { l: "Pendapatan", v: report.data?.pendapatanBulanan ?? 0, c: "text-accent" },
          { l: "Biaya Operasional", v: report.data?.biayaBulanan ?? 0, c: "text-warning" },
          { l: "Laba Bersih", v: report.data?.labaBulanan ?? 0, c: "text-foreground" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className={`mt-2 text-2xl font-bold ${s.c}`}>{formatRupiah(s.v)}</div>
            {!report.isLoading && !report.isError && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                <ArrowUpRight className="h-3 w-3" />
                Data real
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-bold">Ringkasan Bulanan</h3>
        {report.isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Memuat laporan...</div>
        )}
        {report.isError && (
          <div className="mt-4 text-sm text-destructive">
            {report.error instanceof Error ? report.error.message : "Gagal memuat laporan"}
          </div>
        )}
        <div className="mt-5 flex h-56 items-end gap-3">
          {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map(
            (m, i) => {
              const h = [60, 70, 55, 80, 95, 88, 72, 85, 78, 92, 100, 88][i];
              return (
                <div key={m} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-accent/30 to-accent"
                    style={{ height: `${h}%` }}
                  />
                  <div className="text-[10px] font-medium text-muted-foreground">{m}</div>
                </div>
              );
            },
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        <h3 className="text-base font-bold mb-4">Okupansi & Pendapatan per Tipe</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="pb-3 font-semibold">Tipe Kamar</th>
              <th className="pb-3 font-semibold">Booking</th>
              <th className="pb-3 font-semibold">Okupansi</th>
              <th className="pb-3 font-semibold">Pendapatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(report.data?.byRoomType ?? []).map((r) => (
              <tr key={r.roomTypeId}>
                <td className="py-3.5 font-semibold">{r.namaTipe ?? "-"}</td>
                <td className="py-3.5">{r.totalBooking}</td>
                <td className="py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, (r.totalBooking / maxBooking) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {Math.round((r.totalBooking / maxBooking) * 100)}%
                    </span>
                  </div>
                </td>
                <td className="py-3.5 font-semibold">{formatRupiah(r.pendapatan ?? 0)}</td>
              </tr>
            ))}
            {!report.isLoading &&
              !report.isError &&
              (report.data?.byRoomType?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada data tipe kamar.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
