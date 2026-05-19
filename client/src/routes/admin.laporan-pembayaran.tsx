import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Input } from "./admin.tipe-kamar";
import { Download } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { usePaymentReport } from "@/hooks/useReports";
import { useSettings } from "@/hooks/useSettings";
import * as React from "react";
import { labelEnum } from "@/lib/labels";

function formatMetodePembayaran(metode?: string) {
  if (!metode) return "-";
  if (metode.toLowerCase() === "qris") return "QRIS";
  return metode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Route = createFileRoute("/admin/laporan-pembayaran")({
  head: () => ({ meta: [{ title: "Laporan Pembayaran" }] }),
  component: LaporanPembayaran,
});

function LaporanPembayaran() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  const report = usePaymentReport({ from, to });
  const settings = useSettings();
  const propertyName = React.useMemo(() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return String(map.get("propertyName") ?? "").trim() || "Properti";
  }, [settings.data]);

  function exportPdf() {
    const rows = report.data?.payments ?? [];
    const title = "LAPORAN PEMBAYARAN";
    const printedAt = new Date();

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; padding:24px; color:#111}
    h1{margin:0; font-size:16px}
    h2{margin:6px 0 0; font-size:14px; font-weight:700}
    .meta{margin-top:6px; font-size:12px; color:#666}
    table{width:100%; border-collapse:collapse; margin-top:14px}
    th,td{border:1px solid #e5e7eb; padding:8px; font-size:12px; text-align:left; vertical-align:top}
    th{background:#f9fafb}
    .right{text-align:right}
    .footer{margin-top:16px; display:flex; justify-content:space-between; font-size:11px; color:#666}
    @media print { .no-print{display:none} body{padding:0} }
  </style>
</head>
<body>
  <h1>${propertyName}</h1>
  <h2>${title}</h2>
  <div class="meta">Periode: ${from} s/d ${to}</div>

  <table>
    <thead>
      <tr>
        <th>Tanggal</th>
        <th>No Booking</th>
        <th>Invoice</th>
        <th>Customer/Tamu</th>
        <th>Metode</th>
        <th class="right">Jumlah</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows
          .map((p) => {
            const name = String(p.customerName ?? "-");
            const kode = String(p.kodeBooking ?? "-");
            return `<tr>
              <td>${String(p.createdAt ?? "").slice(0, 10)}</td>
              <td>${kode}</td>
              <td>${p.invoice ?? "-"}</td>
              <td>${name}</td>
              <td>${formatMetodePembayaran(p.metode)}</td>
              <td class="right">${formatRupiah(p.jumlah ?? 0)}</td>
              <td>${labelEnum(p.status ?? "-")}</td>
            </tr>`;
          })
          .join("") || `<tr><td colspan="7">Tidak ada data pembayaran.</td></tr>`
      }
    </tbody>
  </table>

  <div class="footer">
    <div>Printed By: Admin</div>
    <div>${printedAt.toLocaleString("id-ID")}</div>
  </div>

  <div class="no-print" style="margin-top:14px; font-size:12px; color:#666">Gunakan dialog print browser untuk simpan sebagai PDF.</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      URL.revokeObjectURL(url);
      return;
    }
    w.addEventListener("load", () => {
      w.focus();
      w.print();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Pembayaran" desc="Daftar pembayaran terverifikasi/lunas">
        <button
          onClick={exportPdf}
          disabled={report.isLoading || report.isError}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export PDF
        </button>
      </PageHeader>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Dari tanggal" type="date" value={from} onChange={setFrom} />
          <Input label="Sampai tanggal" type="date" value={to} onChange={setTo} />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        <h3 className="text-base font-bold mb-4">Detail Pembayaran</h3>
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
                <th className="pb-3 font-semibold">Customer/Tamu</th>
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
                  <td className="py-3.5">{p.customerName ?? "-"}</td>
                  <td className="py-3.5">{formatMetodePembayaran(p.metode)}</td>
                  <td className="py-3.5 text-right font-semibold">{formatRupiah(p.jumlah ?? 0)}</td>
                  <td className="py-3.5">{labelEnum(p.status ?? "-")}</td>
                </tr>
              ))}
              {(report.data?.payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada pembayaran terverifikasi pada periode ini.
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

