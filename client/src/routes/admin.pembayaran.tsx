import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Check, X, Eye } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { usePayments } from "@/hooks/usePayments";
import { useUpdatePayment } from "@/hooks/usePayments";
import { Modal } from "./admin.tipe-kamar";
import { useMemo, useState } from "react";

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
  const [preview, setPreview] = useState<null | { invoice: string; proof?: string }>(null);

  const rows = useMemo(() => payments.data ?? [], [payments.data]);

  function guestLabel(p: any) {
    const booking = p?.bookingId && typeof p.bookingId === "object" ? p.bookingId : null;
    const fromSnapshot = booking?.guestSnapshot?.namaLengkap;
    const fromCustomer = booking?.customerId?.namaLengkap;
    const fromGuest = p?.tamuId && typeof p.tamuId === "object" ? p.tamuId?.nama : "";
    return fromSnapshot || fromCustomer || fromGuest || "-";
  }

  function openProof(p: any) {
    const proof = String(p?.proofImage ?? "").trim();
    setPreview({ invoice: String(p?.invoice ?? "-"), proof: proof || "" });
  }

  function isImage(src: string) {
    const s = src.toLowerCase();
    return (
      s.startsWith("data:image/") ||
      s.endsWith(".png") ||
      s.endsWith(".jpg") ||
      s.endsWith(".jpeg") ||
      s.endsWith(".webp") ||
      s.endsWith(".gif")
    );
  }

  function isPdf(src: string) {
    const s = src.toLowerCase();
    return s.startsWith("data:application/pdf") || s.endsWith(".pdf");
  }

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
            {rows.map((d) => (
              <tr key={d._id} className="hover:bg-secondary/40">
                <td className="py-3.5 font-mono text-xs font-bold">{d.invoice}</td>
                <td className="py-3.5 font-medium">{guestLabel(d)}</td>
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
                    <button
                      type="button"
                      onClick={() => openProof(d)}
                      className="rounded-lg border border-border p-1.5"
                      title="Lihat bukti"
                    >
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

      {preview && (
        <Modal title={`Bukti Pembayaran • ${preview.invoice}`} onClose={() => setPreview(null)}>
          {!preview.proof ? (
            <div className="text-sm text-muted-foreground">Belum ada bukti pembayaran.</div>
          ) : isImage(preview.proof) ? (
            <img
              src={preview.proof}
              alt="Bukti pembayaran"
              className="max-h-[70vh] w-full rounded-xl border border-border object-contain"
            />
          ) : isPdf(preview.proof) ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Preview PDF mungkin tidak tersedia di semua browser. Jika tidak tampil, klik link di bawah.
              </div>
              <iframe
                src={preview.proof}
                className="h-[70vh] w-full rounded-xl border border-border bg-background"
                title="Bukti PDF"
              />
              <a
                href={preview.proof}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                Buka di tab baru
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Format bukti tidak didukung untuk preview. Silakan buka link.
              </div>
              <a
                href={preview.proof}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                Buka Bukti
              </a>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
