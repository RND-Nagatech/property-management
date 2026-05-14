import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Download, ArrowUpRight } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { useFinanceReport } from "@/hooks/useReports";
import { useSettings } from "@/hooks/useSettings";
import * as React from "react";

export const Route = createFileRoute("/admin/laporan-keuangan")({
  head: () => ({ meta: [{ title: "Laporan Keuangan" }] }),
  component: Laporan,
});

function Laporan() {
  const report = useFinanceReport();
  const settings = useSettings();
  const propertyName = React.useMemo(() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return String(map.get("propertyName") ?? "").trim() || "Properti";
  }, [settings.data]);

  function exportPdf() {
    const month = report.data?.month ?? "";
    const title = "Laporan Keuangan";
    const rowsPayments = report.data?.payments ?? [];
    const rowsExpenses = report.data?.expenses ?? [];

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
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
  </style>
</head>
<body>
  <h1>${propertyName}</h1>
  <h2>${title}${month ? ` — ${month}` : ""}</h2>
  <div class="meta">Dicetak: ${new Date().toLocaleString("id-ID")}</div>

  <h2 style="margin-top:18px">Ringkasan</h2>
  <table>
    <tbody>
      <tr><th>Pendapatan Bulanan</th><td class="right">${formatRupiah(report.data?.pendapatanBulanan ?? 0)}</td></tr>
      <tr><th>Biaya Bulanan</th><td class="right">${formatRupiah(report.data?.biayaBulanan ?? 0)}</td></tr>
      <tr><th>Laba Bersih</th><td class="right">${formatRupiah(report.data?.labaBulanan ?? 0)}</td></tr>
    </tbody>
  </table>

  <h2 style="margin-top:18px">Pembayaran (Terverifikasi/Paid)</h2>
  <table>
    <thead><tr><th>Tanggal</th><th>No Booking</th><th>Invoice</th><th>Metode</th><th class="right">Jumlah</th><th>Status</th></tr></thead>
    <tbody>
      ${rowsPayments
        .map(
          (p) =>
            `<tr><td>${String(p.createdAt ?? "").slice(0, 10)}</td><td>${p.kodeBooking ?? "-"}</td><td>${p.invoice ?? "-"}</td><td>${p.metode ?? "-"}</td><td class="right">${formatRupiah(p.jumlah ?? 0)}</td><td>${p.status ?? "-"}</td></tr>`
        )
        .join("") || `<tr><td colspan="6">Tidak ada data pembayaran.</td></tr>`}
    </tbody>
  </table>

  <h2 style="margin-top:18px">Biaya Operasional</h2>
  <table>
    <thead><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th class="right">Jumlah</th><th>Metode</th></tr></thead>
    <tbody>
      ${rowsExpenses
        .map(
          (e) =>
            `<tr><td>${String(e.tanggal ?? "").slice(0, 10)}</td><td>${e.kategori ?? "-"}</td><td>${e.deskripsi ?? "-"}</td><td class="right">${formatRupiah(e.jumlah ?? 0)}</td><td>${(e).metode ?? "-"}</td></tr>`
        )
        .join("") || `<tr><td colspan="5">Tidak ada data biaya operasional.</td></tr>`}
    </tbody>
  </table>

  <div class="no-print" style="margin-top:18px; font-size:12px; color:#666">Gunakan dialog print browser untuk simpan sebagai PDF.</div>
</body>
</html>`;

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

  const maxBooking = Math.max(
    1,
    ...(report.data?.byRoomType ?? []).map((r) => r.totalBooking ?? 0),
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Keuangan" desc="Pendapatan, biaya, dan laba">
        <button
          onClick={exportPdf}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium"
        >
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

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        <h3 className="text-base font-bold mb-4">Detail Pembayaran (Bulan ini)</h3>
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
                <th className="pb-3 font-semibold">Invoice</th>
                <th className="pb-3 font-semibold">Metode</th>
                <th className="pb-3 font-semibold text-right">Jumlah</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(report.data?.payments ?? []).map((p) => (
                <tr key={p._id}>
                  <td className="py-3.5 text-muted-foreground">{String(p.createdAt ?? "").slice(0, 10)}</td>
                  <td className="py-3.5 font-medium">{p.kodeBooking ?? "-"}</td>
                  <td className="py-3.5">{p.invoice ?? "-"}</td>
                  <td className="py-3.5">{p.metode ?? "-"}</td>
                  <td className="py-3.5 text-right font-semibold">{formatRupiah(p.jumlah ?? 0)}</td>
                  <td className="py-3.5">{p.status ?? "-"}</td>
                </tr>
              ))}
              {(report.data?.payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada pembayaran terverifikasi pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        <h3 className="text-base font-bold mb-4">Detail Biaya Operasional (Bulan ini)</h3>
        {!report.isLoading && !report.isError && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3 font-semibold">Tanggal</th>
                <th className="pb-3 font-semibold">Kategori</th>
                <th className="pb-3 font-semibold">Deskripsi</th>
                <th className="pb-3 font-semibold text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(report.data?.expenses ?? []).map((e) => (
                <tr key={e._id}>
                  <td className="py-3.5 text-muted-foreground">{String(e.tanggal ?? "").slice(0, 10)}</td>
                  <td className="py-3.5 font-medium">{e.kategori ?? "-"}</td>
                  <td className="py-3.5 text-muted-foreground">{e.deskripsi ?? "-"}</td>
                  <td className="py-3.5 text-right font-semibold">{formatRupiah(e.jumlah ?? 0)}</td>
                </tr>
              ))}
              {(report.data?.expenses ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada biaya operasional pada periode ini.
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
