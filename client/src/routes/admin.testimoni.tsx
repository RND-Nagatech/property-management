import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { useMemo } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { useAdminTestimonials, useToggleTestimonial } from "@/hooks/useTestimonials";

export const Route = createFileRoute("/admin/testimoni")({
  head: () => ({ meta: [{ title: "Testimoni" }] }),
  component: TestimoniAdmin,
});

function TestimoniAdmin() {
  const testimonials = useAdminTestimonials();
  const toggle = useToggleTestimonial();

  const rows = useMemo(() => testimonials.data ?? [], [testimonials.data]);

  async function onToggle(id: string) {
    try {
      await toggle.mutateAsync(id);
      toast.success("Status testimoni diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update testimoni");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Testimoni" desc="Kelola testimoni customer (aktif/nonaktif)" />

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        {testimonials.isLoading && (
          <div className="text-sm text-muted-foreground">Memuat testimoni...</div>
        )}
        {testimonials.isError && (
          <div className="text-sm text-destructive">
            {testimonials.error instanceof Error ? testimonials.error.message : "Gagal memuat testimoni"}
          </div>
        )}
        {!testimonials.isLoading && !testimonials.isError && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada testimoni dari customer.</div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="pb-3 font-semibold">Tanggal</th>
              <th className="pb-3 font-semibold">Tamu</th>
              <th className="pb-3 font-semibold">Rating</th>
              <th className="pb-3 font-semibold">Komentar</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => (
              <tr key={t._id} className="hover:bg-secondary/40">
                <td className="py-3.5 text-muted-foreground">{String(t.createdAt ?? "").slice(0, 10) || "-"}</td>
                <td className="py-3.5 font-medium">{t.guestName}</td>
                <td className="py-3.5 font-semibold">{t.rating}/5</td>
                <td className="py-3.5 text-muted-foreground">{t.comment}</td>
                <td className="py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      t.isActive ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {t.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="py-3.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggle(t._id)}
                      className={`rounded-lg border border-border p-1.5 ${
                        t.isActive ? "text-destructive" : "text-accent"
                      }`}
                      title={t.isActive ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {t.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
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

