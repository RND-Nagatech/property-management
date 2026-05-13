import { createFileRoute } from "@tanstack/react-router";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Modal, Input } from "./admin.tipe-kamar";
import {
  useCreateGuest,
  useDeleteGuest,
  useGuests,
  useUpdateGuest,
  type Guest,
} from "@/hooks/useGuests";

export const Route = createFileRoute("/admin/tamu")({
  head: () => ({ meta: [{ title: "Master Tamu" }] }),
  component: TamuPage,
});

function TamuPage() {
  const [q, setQ] = useState("");
  const guests = useGuests(q);
  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const deleteGuest = useDeleteGuest();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState({ nama: "", email: "", hp: "" });

  function openAdd() {
    setEditing(null);
    setForm({ nama: "", email: "", hp: "" });
    setOpen(true);
  }

  function openEdit(g: Guest) {
    setEditing(g);
    setForm({ nama: g.nama, email: g.email, hp: g.hp });
    setOpen(true);
  }

  async function onDelete(id: string) {
    try {
      await deleteGuest.mutateAsync(id);
      toast.success("Tamu dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus tamu");
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.nama || !form.email || !form.hp) {
      toast.error("Nama, email, dan No. HP wajib diisi");
      return;
    }
    try {
      if (editing) {
        await updateGuest.mutateAsync({ id: editing._id, payload: form });
        toast.success("Tamu diperbarui");
      } else {
        await createGuest.mutateAsync(form);
        toast.success("Tamu ditambahkan");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan tamu");
    }
  }

  const rows = useMemo(() => guests.data ?? [], [guests.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Master Tamu" desc="Daftar tamu terdaftar">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Tambah Tamu
        </button>
      </PageHeader>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Cari nama atau email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        {guests.isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Memuat data tamu...</div>
        )}
        {guests.isError && (
          <div className="mt-4 text-sm text-destructive">
            {guests.error instanceof Error ? guests.error.message : "Gagal memuat data tamu"}
          </div>
        )}
        {!guests.isLoading && !guests.isError && rows.length === 0 && (
          <div className="mt-4 text-sm text-muted-foreground">Belum ada data tamu.</div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3 font-semibold">Nama</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">No. HP</th>
                <th className="pb-3 font-semibold">Total Booking</th>
                <th className="pb-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => (
                <tr key={t._id} className="hover:bg-secondary/40">
                  <td className="py-3.5 flex items-center gap-3 font-semibold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {t.nama[0]}
                    </div>
                    {t.nama}
                  </td>
                  <td className="py-3.5 text-muted-foreground">{t.email}</td>
                  <td className="py-3.5 text-muted-foreground">{t.hp}</td>
                  <td className="py-3.5">
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                      {t.totalBooking ?? 0}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(t)}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(t._id)}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal title={editing ? "Edit Tamu" : "Tambah Tamu"} onClose={() => setOpen(false)}>
          <form onSubmit={onSave} className="space-y-4">
            <Input label="Nama" value={form.nama} onChange={(v) => setForm({ ...form, nama: v })} />
            <Input
              label="Email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="nama@email.com"
            />
            <Input
              label="No. HP"
              value={form.hp}
              onChange={(v) => setForm({ ...form, hp: v })}
              placeholder="08xxxxxxxxxx"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                {editing ? "Simpan" : "Tambah"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
