// Format metode pembayaran agar lebih user-friendly
function formatMetodePembayaran(metode?: string) {
  if (!metode) return "-";
  if (metode.toLowerCase() === "qris") return "QRIS";
  return metode
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Input } from "./admin.tipe-kamar";
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
  // Filter tanggal default hari ini
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  const [mode, setMode] = React.useState<"DETAIL" | "REKAP">("DETAIL");
  // Laporan keuangan dengan filter tanggal
  const report = useFinanceReport({ from, to });
  const settings = useSettings();
  const propertyName = React.useMemo(() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return String(map.get("propertyName") ?? "").trim() || "Properti";
  }, [settings.data]);

  const cashRows = React.useMemo(() => {
    const saldoAwal = 0;
    const payments = report.data?.payments ?? [];
    const expenses = report.data?.expenses ?? [];
    const rows: Array<{ date: string; kategori: string; deskripsi: string; inAmount: number; outAmount: number }> = [
      { date: from, kategori: "Saldo Awal", deskripsi: "Saldo awal periode", inAmount: saldoAwal, outAmount: 0 },
    ];

    for (const p of payments) {
      rows.push({
        date: String(p.createdAt ?? "").slice(0, 10),
        kategori: "Booking",
        deskripsi: `Pembayaran booking ${p.kodeBooking ?? "-"} · ${p.invoice ?? "-"}`,
        inAmount: Number(p.jumlah ?? 0) || 0,
        outAmount: 0,
      });
    }
    for (const e of expenses) {
      const tipe = (e.tipeTransaksi ?? "OUT") as any;
      const amount = Number(e.jumlah ?? 0) || 0;
      rows.push({
        date: String(e.tanggal ?? "").slice(0, 10),
        kategori: String(e.kategori ?? "Kas Operasional"),
        deskripsi: String(e.deskripsi ?? "-"),
        inAmount: tipe === "IN" ? amount : 0,
        outAmount: tipe === "OUT" ? amount : 0,
      });
    }

    rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const totalIn = rows.reduce((acc, r) => acc + (Number(r.inAmount ?? 0) || 0), 0);
    const totalOut = rows.reduce((acc, r) => acc + (Number(r.outAmount ?? 0) || 0), 0);
    const saldoAkhir = saldoAwal + totalIn - totalOut;

    const rekapMap = new Map<string, { kategori: string; inAmount: number; outAmount: number }>();
    for (const r of rows) {
      const key = r.kategori || "-";
      const cur = rekapMap.get(key) ?? { kategori: key, inAmount: 0, outAmount: 0 };
      cur.inAmount += Number(r.inAmount ?? 0) || 0;
      cur.outAmount += Number(r.outAmount ?? 0) || 0;
      rekapMap.set(key, cur);
    }
    const rekap = Array.from(rekapMap.values()).sort((a, b) => a.kategori.localeCompare(b.kategori));

    return { rows, rekap, saldoAwal, totalIn, totalOut, saldoAkhir };
  }, [from, report.data?.payments, report.data?.expenses]);

  function exportPdf() {
    const title = mode === "DETAIL" ? "LAPORAN KEUANGAN CASH DETAIL" : "LAPORAN KEUANGAN CASH REKAP";
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

  ${
    mode === "DETAIL"
      ? `
  <table>
    <thead>
      <tr>
        <th style="width:40px">No</th>
        <th style="width:96px">Tanggal</th>
        <th style="width:160px">Kategori</th>
        <th>Deskripsi</th>
        <th class="right" style="width:120px">Uang Masuk</th>
        <th class="right" style="width:120px">Uang Keluar</th>
      </tr>
    </thead>
    <tbody>
      ${
        cashRows.rows
          .map(
            (r, idx) =>
              `<tr>
                <td>${idx + 1}</td>
                <td>${r.date}</td>
                <td>${r.kategori}</td>
                <td>${r.deskripsi}</td>
                <td class="right">${r.inAmount ? formatRupiah(r.inAmount) : ""}</td>
                <td class="right">${r.outAmount ? formatRupiah(r.outAmount) : ""}</td>
              </tr>`
          )
          .join("") || `<tr><td colspan="6">Tidak ada transaksi.</td></tr>`
      }
    </tbody>
  </table>
  `
      : `
  <table>
    <thead>
      <tr>
        <th>Kategori</th>
        <th class="right" style="width:160px">Uang Masuk</th>
        <th class="right" style="width:160px">Uang Keluar</th>
      </tr>
    </thead>
    <tbody>
      ${
        cashRows.rekap
          .map(
            (r) =>
              `<tr>
                <td>${r.kategori}</td>
                <td class="right">${r.inAmount ? formatRupiah(r.inAmount) : ""}</td>
                <td class="right">${r.outAmount ? formatRupiah(r.outAmount) : ""}</td>
              </tr>`
          )
          .join("") || `<tr><td colspan="3">Tidak ada transaksi.</td></tr>`
      }
    </tbody>
  </table>
  `
  }

  <table style="margin-top:16px">
    <tbody>
      <tr><th>Saldo Awal</th><td class="right">${formatRupiah(cashRows.saldoAwal)}</td></tr>
      <tr><th>Total Uang Masuk</th><td class="right">${formatRupiah(cashRows.totalIn)}</td></tr>
      <tr><th>Total Uang Keluar</th><td class="right">${formatRupiah(cashRows.totalOut)}</td></tr>
      <tr><th>Saldo Akhir</th><td class="right">${formatRupiah(cashRows.saldoAkhir)}</td></tr>
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
  // Deteksi data kosong
  const isEmpty =
    !report.isLoading &&
    !report.isError &&
    [
      report.data?.pendapatanBulanan,
      report.data?.kasMasukBulanan,
      report.data?.kasKeluarBulanan,
      report.data?.biayaBulanan,
      report.data?.payments?.length,
      report.data?.expenses?.length,
      report.data?.byRoomType?.length,
    ].every((v) => !v || v === 0);

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

      {/* Filter tanggal */}
      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] mb-2">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Dari tanggal"
            type="date"
            value={from}
            onChange={setFrom}
          />
          <Input
            label="Sampai tanggal"
            type="date"
            value={to}
            onChange={setTo}
          />
          <div>
            <label className="text-sm font-medium">Tipe Laporan</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="DETAIL">Detail</option>
              <option value="REKAP">Rekap</option>
            </select>
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="rounded-2xl bg-card p-5 text-center text-destructive font-semibold">
          Data laporan tidak tersedia
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { l: "Pendapatan", v: report.data?.pendapatanBulanan ?? 0, c: "text-accent" },
          { l: "Kas Masuk", v: report.data?.kasMasukBulanan ?? 0, c: "text-accent" },
          { l: "Kas Keluar", v: report.data?.kasKeluarBulanan ?? report.data?.biayaBulanan ?? 0, c: "text-warning" },
          { l: "Saldo Kas", v: report.data?.saldoKasBulanan ?? 0, c: "text-foreground" },
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

        {/* Card Ringkasan Bulanan di-hide sesuai permintaan */}

      {/* Bagian Okupansi & Pendapatan per Tipe di-hide sesuai permintaan */}

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        <h3 className="text-base font-bold mb-4">
          {mode === "DETAIL" ? "Laporan Keuangan (Detail)" : "Laporan Keuangan (Rekap)"}
        </h3>
        {report.isLoading && <div className="text-sm text-muted-foreground">Memuat...</div>}
        {report.isError && (
          <div className="text-sm text-destructive">
            {report.error instanceof Error ? report.error.message : "Gagal memuat laporan"}
          </div>
        )}
        {!report.isLoading && !report.isError && (
          <>
            {mode === "DETAIL" ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-3 font-semibold">No</th>
                    <th className="pb-3 font-semibold">Tanggal</th>
                    <th className="pb-3 font-semibold">Kategori</th>
                    <th className="pb-3 font-semibold">Deskripsi</th>
                    <th className="pb-3 font-semibold text-right">Uang Masuk</th>
                    <th className="pb-3 font-semibold text-right">Uang Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cashRows.rows.map((r, idx) => (
                    <tr key={`${r.date}-${r.kategori}-${idx}`}>
                      <td className="py-3.5 text-muted-foreground">{idx + 1}</td>
                      <td className="py-3.5 text-muted-foreground">{r.date}</td>
                      <td className="py-3.5 font-medium">{r.kategori}</td>
                      <td className="py-3.5">{r.deskripsi}</td>
                      <td className="py-3.5 text-right font-semibold">
                        {r.inAmount ? formatRupiah(r.inAmount) : "-"}
                      </td>
                      <td className="py-3.5 text-right font-semibold">
                        {r.outAmount ? formatRupiah(r.outAmount) : "-"}
                      </td>
                    </tr>
                  ))}
                  {cashRows.rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        Tidak ada transaksi pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-3 font-semibold">Kategori</th>
                    <th className="pb-3 font-semibold text-right">Uang Masuk</th>
                    <th className="pb-3 font-semibold text-right">Uang Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cashRows.rekap.map((r) => (
                    <tr key={r.kategori}>
                      <td className="py-3.5 font-medium">{r.kategori}</td>
                      <td className="py-3.5 text-right font-semibold">
                        {r.inAmount ? formatRupiah(r.inAmount) : "-"}
                      </td>
                      <td className="py-3.5 text-right font-semibold">
                        {r.outAmount ? formatRupiah(r.outAmount) : "-"}
                      </td>
                    </tr>
                  ))}
                  {cashRows.rekap.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        Tidak ada transaksi pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            <div className="mt-4 grid gap-2 rounded-xl border border-border p-4 text-sm md:grid-cols-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo Awal</span>
                <span className="font-semibold">{formatRupiah(cashRows.saldoAwal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo Akhir</span>
                <span className="font-semibold">{formatRupiah(cashRows.saldoAkhir)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Uang Masuk</span>
                <span className="font-semibold">{formatRupiah(cashRows.totalIn)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Uang Keluar</span>
                <span className="font-semibold">{formatRupiah(cashRows.totalOut)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
