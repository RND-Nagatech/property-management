import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { formatRupiah } from "@/lib/currency";
import { useDeposits } from "@/hooks/useDeposits";

export const Route = createFileRoute("/admin/deposit")({
  head: () => ({ meta: [{ title: "Deposit" }] }),
  component: Deposit,
});

const sc: Record<string, string> = {
  Ditahan: "bg-warning/15 text-warning",
  Dikembalikan: "bg-accent/10 text-accent",
  Dipakai: "bg-destructive/10 text-destructive",
};

function guestName(d: any) {
  return (
    d?.guestSnapshot?.namaLengkap ||
    (d?.bookingId && typeof d.bookingId === "object" ? d.bookingId?.guestSnapshot?.namaLengkap : "") ||
    (d?.customerId && typeof d.customerId === "object" ? d.customerId?.namaLengkap : "") ||
    (d?.tamuId && typeof d.tamuId === "object" ? d.tamuId?.nama : "") ||
    "-"
  );
}

function normalizeDepositType(d: any): "NONE" | "CASH" | "KTP" | "SIM" | "PASSPORT" {
  const t = String(d?.type ?? "").toUpperCase();
  if (t === "CASH" || t === "KTP" || t === "SIM" || t === "PASSPORT" || t === "NONE") return t as any;
  const legacyAmount = Number(d?.jumlah ?? 0) || 0;
  if (legacyAmount > 0) return "CASH";
  return "NONE";
}

function displayStatus(d: any) {
  const type = normalizeDepositType(d);
  const rs = String(d?.returnStatus ?? "").toUpperCase();
  const legacy = String(d?.status ?? "Ditahan");
  if (type === "NONE") return { label: "Tidak ada", className: "bg-secondary text-muted-foreground" };
  if (rs === "RETURNED") return { label: "Dikembalikan", className: sc.Dikembalikan };
  if (rs === "PARTIALLY_DEDUCTED") return { label: "Dikembalikan (dipotong)", className: sc.Dipakai };
  if (rs === "NOT_RETURNED") return { label: "Tidak dikembalikan", className: sc.Dipakai };
  if (legacy === "Dikembalikan") return { label: "Dikembalikan", className: sc.Dikembalikan };
  if (legacy === "Dipakai") return { label: "Dipakai", className: sc.Dipakai };
  return { label: "Ditahan", className: sc.Ditahan };
}

function cashSummary(d: any) {
  const type = normalizeDepositType(d);
  if (type !== "CASH") return "";
  const amount = Number(d?.amount ?? d?.jumlah ?? 0) || 0;
  const returned = Number(d?.returnedAmount ?? d?.refundJumlah ?? 0) || 0;
  const deducted = Number(d?.deductedAmount ?? d?.potongan ?? 0) || 0;
  if (returned > 0 || deducted > 0) {
    const parts = [];
    if (returned > 0) parts.push(`kembali ${formatRupiah(returned)}`);
    if (deducted > 0) parts.push(`potong ${formatRupiah(deducted)}`);
    return parts.join(" · ");
  }
  return amount ? `ditahan ${formatRupiah(amount)}` : "";
}

function Deposit() {
  const deposits = useDeposits();
  const list = deposits.data ?? [];
  const totals = list.reduce(
    (acc, d: any) => {
      const st = displayStatus(d).label;
      const amount = Number(d?.amount ?? d?.jumlah ?? 0) || 0;
      if (st === "Ditahan") acc.ditahan += amount;
      else if (st.startsWith("Dikembalikan")) acc.dikembalikan += amount;
      else if (st === "Dipakai" || st === "Tidak dikembalikan") acc.dipakai += amount;
      return acc;
    },
    { ditahan: 0, dikembalikan: 0, dipakai: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Deposit" desc="Pengelolaan deposit tamu" />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { l: "Total Ditahan", v: formatRupiah(totals.ditahan), c: "text-warning" },
          { l: "Total Dikembalikan", v: formatRupiah(totals.dikembalikan), c: "text-accent" },
          { l: "Total Dipakai", v: formatRupiah(totals.dipakai), c: "text-destructive" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className={`mt-2 text-2xl font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        {deposits.isLoading && (
          <div className="text-sm text-muted-foreground">Memuat deposit...</div>
        )}
        {deposits.isError && (
          <div className="text-sm text-destructive">
            {deposits.error instanceof Error ? deposits.error.message : "Gagal memuat deposit"}
          </div>
        )}
        {!deposits.isLoading && !deposits.isError && list.length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada deposit.</div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="pb-3 font-semibold">ID</th>
              <th className="pb-3 font-semibold">Tamu</th>
              <th className="pb-3 font-semibold">Booking</th>
              <th className="pb-3 font-semibold">Jenis</th>
              <th className="pb-3 font-semibold">Nominal</th>
              <th className="pb-3 font-semibold">Ringkasan</th>
              <th className="pb-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((d) => (
              <tr key={d._id}>
                <td className="py-3.5 font-mono text-xs font-bold">{d._id.slice(-6)}</td>
                <td className="py-3.5 font-medium">{guestName(d)}</td>
                <td className="py-3.5 text-muted-foreground">{(d.bookingId as any)?.kodeBooking ?? "-"}</td>
                <td className="py-3.5 text-muted-foreground">
                  {(() => {
                    const t = normalizeDepositType(d);
                    if (t === "CASH") return "Uang tunai";
                    if (t === "PASSPORT") return "Paspor";
                    if (t === "NONE") return "-";
                    if (t === "KTP" || t === "SIM" || t === "PASSPORT") {
                      return (
                        <span>
                          {t}
                          {d.identityName || d.identityNumber ? (
                            <>
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {d.identityName && <span>Nama: {d.identityName}<br /></span>}
                                {d.identityNumber && <span>NIK: {d.identityNumber}</span>}
                              </span>
                            </>
                          ) : null}
                        </span>
                      );
                    }
                    return t;
                  })()}
                </td>
                <td className="py-3.5 font-semibold">{formatRupiah(Number((d as any).amount ?? d.jumlah ?? 0) || 0)}</td>
                <td className="py-3.5 text-xs text-muted-foreground">{cashSummary(d) || "-"}</td>
                <td className="py-3.5">
                  {(() => {
                    const st = displayStatus(d);
                    return (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.className}`}>
                        {st.label}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
