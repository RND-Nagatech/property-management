import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Check, X, Eye } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { usePayments } from "@/hooks/usePayments";
import { useUpdatePayment } from "@/hooks/usePayments";

export const Route = createFileRoute("/admin/pembayaran")({
  head: () => ({ meta: [{ title: "Pembayaran" }] }),
  component: Pembayaran,
});
function labelStatus(status: string) {
  if (status === "paid" || status === "Terverifikasi") return "Terverifikasi";
  if (status === "failed" || status === "Ditolak") return "Ditolak";
  return "Menunggu";
}

const sc: Record<string, string> = {
  Terverifikasi: "bg-accent/10 text-accent",
  Menunggu: "bg-warning/15 text-warning",
  Ditolak: "bg-destructive/10 text-destructive",
};

function Pembayaran() {
  const payments = usePayments();
  const updatePayment = useUpdatePayment();

  async function setStatus(id: string, status: "Terverifikasi" | "Ditolak") {
    try {
      if (status === "Terverifikasi") {
        await updatePayment.mutateAsync({ id, action: "verify" });
      } else {
        await updatePayment.mutateAsync({ id, action: "reject", payload: { rejectionReason: "" } });
      }
      toast.success(status === "Terverifikasi" ? "Pembayaran terverifikasi" : "Pembayaran ditolak");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal update pembayaran");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pembayaran" desc="Verifikasi & kelola pembayaran tamu" />
      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        {payments.isLoading && (
          <div className="text-sm text-muted-foreground">Memuat pembayaran...</div>
        )}
        {payments.isError && (
          <div className="text-sm text-destructive">
            {payments.error instanceof Error ? payments.error.message : "Gagal memuat pembayaran"}
          </div>
        )}
        {!payments.isLoading && !payments.isError && (payments.data?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada pembayaran.</div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="pb-3 font-semibold">Invoice</th>
              <th className="pb-3 font-semibold">Tamu</th>
              <th className="pb-3 font-semibold">Metode</th>
              <th className="pb-3 font-semibold">Jumlah</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(payments.data ?? []).map((d) => (
              <tr key={d._id} className="hover:bg-secondary/40">
                <td className="py-3.5 font-mono text-xs font-bold">{d.invoice}</td>
                <td className="py-3.5 font-medium">{(d.tamuId as any)?.nama ?? "-"}</td>
                <td className="py-3.5 text-muted-foreground">{d.metode}</td>
                <td className="py-3.5 font-semibold">{formatRupiah(d.jumlah)}</td>
                <td className="py-3.5">
                  {(() => {
                    const lbl = labelStatus(String(d.status));
                    return (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc[lbl]}`}
                  >
                    {lbl}
                  </span>
                    );
                  })()}
                </td>
                <td className="py-3.5">
                  <div className="flex justify-end gap-1.5">
                    <button className="rounded-lg border border-border p-1.5">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {labelStatus(String(d.status)) === "Menunggu" && (
                      <>
                        <button
                          onClick={() => setStatus(d._id, "Terverifikasi")}
                          className="rounded-lg bg-accent p-1.5 text-accent-foreground"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setStatus(d._id, "Ditolak")}
                          className="rounded-lg bg-destructive/10 p-1.5 text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
