import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { useMemo } from "react";
import { toast } from "sonner";
import { Check, X, Plus, Pencil, Trash2 } from "lucide-react";
import { useAdminTestimonials, useToggleTestimonial } from "@/hooks/useTestimonials";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import * as React from "react";

export const Route = createFileRoute("/admin/testimoni")({
  head: () => ({ meta: [{ title: "Testimoni" }] }),
  component: TestimoniAdmin,
});

function TestimoniAdmin() {
  const testimonials = useAdminTestimonials();
  const toggle = useToggleTestimonial();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editingId, setEditingId] = React.useState<string>("");
  const [bookingCode, setBookingCode] = React.useState("");
  const [rating, setRating] = React.useState<number>(5);
  const [comment, setComment] = React.useState("");
  const [isActive, setIsActive] = React.useState(false);

  const rows = useMemo(() => testimonials.data ?? [], [testimonials.data]);

  const createTestimonial = useMutation({
    mutationFn: (payload: { bookingCode: string; rating: number; comment: string; isActive: boolean }) =>
      apiRequest("/admin/testimonials", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      qc.invalidateQueries({ queryKey: ["testimonials", "public"] });
    },
  });

  const updateTestimonial = useMutation({
    mutationFn: (payload: { id: string; rating: number; comment: string; isActive: boolean }) =>
      apiRequest(`/admin/testimonials/${encodeURIComponent(payload.id)}`, {
        method: "PUT",
        body: JSON.stringify({ rating: payload.rating, comment: payload.comment, isActive: payload.isActive }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      qc.invalidateQueries({ queryKey: ["testimonials", "public"] });
    },
  });

  const deleteTestimonial = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/testimonials/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      qc.invalidateQueries({ queryKey: ["testimonials", "public"] });
    },
  });

  async function onToggle(id: string) {
    try {
      await toggle.mutateAsync(id);
      toast.success("Status testimoni diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update testimoni");
    }
  }

  function openCreate() {
    setMode("create");
    setEditingId("");
    setBookingCode("");
    setRating(5);
    setComment("");
    setIsActive(false);
    setOpen(true);
  }

  function openEdit(t: any) {
    setMode("edit");
    setEditingId(String(t._id ?? ""));
    setBookingCode("");
    setRating(Number(t.rating ?? 5) || 5);
    setComment(String(t.comment ?? ""));
    setIsActive(Boolean(t.isActive));
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === "create") {
        await createTestimonial.mutateAsync({ bookingCode, rating, comment, isActive });
        toast.success("Testimoni berhasil ditambahkan");
      } else {
        await updateTestimonial.mutateAsync({ id: editingId, rating, comment, isActive });
        toast.success("Testimoni berhasil diperbarui");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan testimoni");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Testimoni" desc="Kelola testimoni customer (aktif/nonaktif)">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          <Plus className="h-4 w-4" /> Tambah
        </button>
      </PageHeader>

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
                      onClick={() => openEdit(t)}
                      className="rounded-lg border border-border p-1.5"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast("Hapus testimoni ini?", {
                          action: {
                            label: "Hapus",
                            onClick: () => deleteTestimonial.mutate(t._id),
                          },
                          cancel: { label: "Batal" } as any,
                        });
                      }}
                      className="rounded-lg border border-border p-1.5 text-destructive"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold">{mode === "create" ? "Tambah Testimoni" : "Edit Testimoni"}</div>
                <div className="text-xs text-muted-foreground">
                  {mode === "create"
                    ? "Masukkan No Booking yang sudah check-out."
                    : "Ubah rating/komentar dan status aktif."}
                </div>
              </div>
              <button type="button" className="rounded-lg border border-border p-2" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              {mode === "create" && (
                <div>
                  <div className="text-xs font-semibold mb-1">No Booking</div>
                  <input
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value)}
                    placeholder="Contoh: BK-260514-001"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold mb-1">Rating</div>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="flex items-end gap-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Aktif
                  </label>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1">Komentar</div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[110px]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={createTestimonial.isPending || updateTestimonial.isPending}
                className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
              >
                Simpan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
