import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Plus, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { Modal, Input } from "./admin.tipe-kamar";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreateExpense, useDeleteExpense, useExpenses } from "@/hooks/useExpenses";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

export const Route = createFileRoute("/admin/biaya")({
  head: () => ({ meta: [{ title: "Biaya Operasional" }] }),
  component: Biaya,
});

function tipeLabel(t?: string) {
  return String(t ?? "").toUpperCase() === "IN" ? "Uang Masuk" : "Uang Keluar";
}

function Biaya() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tipeFilter, setTipeFilter] = useState<"" | "IN" | "OUT">("");
  const expenses = useExpenses({
    from: from || undefined,
    to: to || undefined,
    tipe: tipeFilter ? (tipeFilter as any) : undefined,
  });
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    tipeTransaksi: "OUT" as "IN" | "OUT",
    kategori: "Listrik",
    deskripsi: "",
    jumlah: "",
    metode: "",
  });

  const totals = useMemo(() => {
    const list = expenses.data ?? [];
    let masuk = 0;
    let keluar = 0;
    for (const e of list as any[]) {
      const t = String(e.tipeTransaksi ?? "OUT").toUpperCase();
      if (t === "IN") masuk += Number(e.jumlah ?? 0) || 0;
      else keluar += Number(e.jumlah ?? 0) || 0;
    }
    return { masuk, keluar, saldo: masuk - keluar };
  }, [expenses.data]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.tanggal || !form.kategori || !form.deskripsi || !form.jumlah) {
      toast.error("Tanggal, kategori, deskripsi, dan jumlah wajib diisi");
      return;
    }
    try {
      await createExpense.mutateAsync({
        tanggal: new Date(`${form.tanggal}T00:00:00.000Z`).toISOString(),
        tipeTransaksi: form.tipeTransaksi,
        kategori: form.kategori,
        deskripsi: form.deskripsi,
        jumlah: Number(form.jumlah),
        metode: form.metode,
      });
      toast.success("Transaksi kas ditambahkan");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah transaksi");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Kas Operasional" desc="Pencatatan uang masuk/keluar">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Tambah Transaksi
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { l: "Total Uang Masuk", v: totals.masuk, c: "text-accent" },
          { l: "Total Uang Keluar", v: totals.keluar, c: "text-warning" },
          { l: "Saldo (Selisih)", v: totals.saldo, c: "text-foreground" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className={`mt-2 text-2xl font-bold ${s.c}`}>{formatRupiah(s.v)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Dari tanggal"
            type="date"
            value={from}
            onChange={(v) => setFrom(v)}
          />
          <Input
            label="Sampai tanggal"
            type="date"
            value={to}
            onChange={(v) => setTo(v)}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Tipe Transaksi
            </span>
            <select
              value={tipeFilter}
              onChange={(e) => setTipeFilter(e.target.value as any)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="">Semua</option>
              <option value="IN">Uang Masuk</option>
              <option value="OUT">Uang Keluar</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        {expenses.isLoading && (
          <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Memuat transaksi...
          </div>
        )}
        {expenses.isError && (
          <div className="rounded-2xl bg-card p-5 text-sm text-destructive shadow-[var(--shadow-card)]">
            {expenses.error instanceof Error ? expenses.error.message : "Gagal memuat transaksi"}
          </div>
        )}
        {!expenses.isLoading && !expenses.isError && (expenses.data?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada transaksi.</div>
        )}
        {!expenses.isLoading && !expenses.isError && (expenses.data?.length ?? 0) > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3 font-semibold">Tanggal</th>
                <th className="pb-3 font-semibold">Tipe</th>
                <th className="pb-3 font-semibold">Kategori</th>
                <th className="pb-3 font-semibold">Keterangan</th>
                <th className="pb-3 font-semibold">Metode</th>
                <th className="pb-3 font-semibold text-right">Nominal</th>
                <th className="pb-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(expenses.data ?? []).map((e: any) => (
                <tr key={e._id} className="hover:bg-secondary/40">
                  <td className="py-3.5 text-muted-foreground">{String(e.tanggal).slice(0, 10)}</td>
                  <td className="py-3.5 font-medium">{tipeLabel(e.tipeTransaksi)}</td>
                  <td className="py-3.5">{e.kategori}</td>
                  <td className="py-3.5 text-muted-foreground">{e.deskripsi}</td>
                  <td className="py-3.5 text-muted-foreground">{e.metode || "-"}</td>
                  <td className="py-3.5 text-right font-semibold">{formatRupiah(e.jumlah)}</td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteExpense.mutateAsync(e._id);
                          toast.success("Transaksi dihapus");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Gagal menghapus transaksi");
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <Modal title="Tambah Transaksi Kas" onClose={() => setOpen(false)}>
          <form onSubmit={onSave} className="space-y-4">
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(v) => setForm({ ...form, tanggal: v })}
            />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Tipe Transaksi
              </span>
              <select
                value={form.tipeTransaksi}
                onChange={(e) => setForm({ ...form, tipeTransaksi: e.target.value as any })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
              >
                <option value="IN">Uang Masuk</option>
                <option value="OUT">Uang Keluar</option>
              </select>
            </label>
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
            <CurrencyInput
              label="Nominal"
              valueDigits={String(form.jumlah ?? "").replace(/[^\d]/g, "")}
              onChangeDigits={(digits) => setForm({ ...form, jumlah: digits })}
              placeholder="Rp 100.000"
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
