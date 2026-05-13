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

function Deposit() {
  const deposits = useDeposits();
  const list = deposits.data ?? [];
  const totalDitahan = list.filter((d) => d.status === "Ditahan").reduce((a, b) => a + b.jumlah, 0);
  const totalDikembalikan = list
    .filter((d) => d.status === "Dikembalikan")
    .reduce((a, b) => a + b.jumlah, 0);
  const totalDipakai = list.filter((d) => d.status === "Dipakai").reduce((a, b) => a + b.jumlah, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Deposit" desc="Pengelolaan deposit tamu" />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { l: "Total Ditahan", v: formatRupiah(totalDitahan), c: "text-warning" },
          { l: "Total Dikembalikan", v: formatRupiah(totalDikembalikan), c: "text-accent" },
          { l: "Total Dipakai", v: formatRupiah(totalDipakai), c: "text-destructive" },
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
              <th className="pb-3 font-semibold">Jumlah</th>
              <th className="pb-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((d) => (
              <tr key={d._id}>
                <td className="py-3.5 font-mono text-xs font-bold">{d._id.slice(-6)}</td>
                <td className="py-3.5 font-medium">{d.tamuId?.nama ?? "-"}</td>
                <td className="py-3.5 text-muted-foreground">{d.bookingId?.kodeBooking ?? "-"}</td>
                <td className="py-3.5 font-semibold">{formatRupiah(d.jumlah)}</td>
                <td className="py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc[d.status]}`}
                  >
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
