import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Plus, Zap, Droplet, Wifi, Sparkles, Wrench, Shirt, Users } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { Modal, Input } from "./admin.tipe-kamar";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreateExpense, useExpenses } from "@/hooks/useExpenses";

export const Route = createFileRoute("/admin/biaya")({
  head: () => ({ meta: [{ title: "Biaya Operasional" }] }),
  component: Biaya,
});

const iconByCat: Record<string, React.ComponentType<{ className?: string }>> = {
  Listrik: Zap,
  Air: Droplet,
  Internet: Wifi,
  Kebersihan: Sparkles,
  Perbaikan: Wrench,
  Laundry: Shirt,
  "Gaji Staff": Users,
};

function Biaya() {
  const expenses = useExpenses();
  const createExpense = useCreateExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: "Listrik",
    deskripsi: "",
    jumlah: "",
    metode: "",
  });

  const cats = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const e of expenses.data ?? []) {
      grouped.set(e.kategori, (grouped.get(e.kategori) ?? 0) + e.jumlah);
    }
    return Array.from(grouped.entries()).map(([l, v]) => ({ l, v }));
  }, [expenses.data]);

  const total = cats.reduce((a, b) => a + b.v, 0);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.tanggal || !form.kategori || !form.deskripsi || !form.jumlah) {
      toast.error("Tanggal, kategori, deskripsi, dan jumlah wajib diisi");
      return;
    }
    try {
      await createExpense.mutateAsync({
        tanggal: new Date(`${form.tanggal}T00:00:00.000Z`).toISOString(),
        kategori: form.kategori,
        deskripsi: form.deskripsi,
        jumlah: Number(form.jumlah),
        metode: form.metode,
      });
      toast.success("Pengeluaran ditambahkan");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah pengeluaran");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Biaya Operasional" desc="Mei 2026">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Tambah Pengeluaran
        </button>
      </PageHeader>

      <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-[var(--shadow-soft)]">
        <div className="text-sm opacity-80">Total Pengeluaran Bulan Ini</div>
        <div className="mt-2 text-3xl font-bold">{formatRupiah(total)}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {expenses.isLoading && (
          <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Memuat pengeluaran...
          </div>
        )}
        {expenses.isError && (
          <div className="rounded-2xl bg-card p-5 text-sm text-destructive shadow-[var(--shadow-card)]">
            {expenses.error instanceof Error ? expenses.error.message : "Gagal memuat pengeluaran"}
          </div>
        )}
        {!expenses.isLoading && !expenses.isError && cats.length === 0 && (
          <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Belum ada data pengeluaran.
          </div>
        )}
        {cats.map((c) => (
          <div key={c.l} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  {(() => {
                    const I = iconByCat[c.l];
                    return I ? <I className="h-5 w-5" /> : <Wrench className="h-5 w-5" />;
                  })()}
                </div>
                <div className="text-sm font-semibold">{c.l}</div>
              </div>
              <button className="text-xs font-semibold text-accent">Detail</button>
            </div>
            <div className="mt-4 text-xl font-bold">{formatRupiah(c.v)}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-accent" style={{ width: `${(c.v / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Modal title="Tambah Pengeluaran" onClose={() => setOpen(false)}>
          <form onSubmit={onSave} className="space-y-4">
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(v) => setForm({ ...form, tanggal: v })}
            />
            <Input
              label="Kategori"
              value={form.kategori}
              onChange={(v) => setForm({ ...form, kategori: v })}
              placeholder="Listrik"
            />
            <Input
              label="Deskripsi"
              value={form.deskripsi}
              onChange={(v) => setForm({ ...form, deskripsi: v })}
              placeholder="Contoh: pembayaran PLN"
            />
            <Input
              label="Jumlah (Rp)"
              type="number"
              value={form.jumlah}
              onChange={(v) => setForm({ ...form, jumlah: v })}
              placeholder="100000"
            />
            <Input
              label="Metode (opsional)"
              value={form.metode}
              onChange={(v) => setForm({ ...form, metode: v })}
              placeholder="Transfer / Cash"
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
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
