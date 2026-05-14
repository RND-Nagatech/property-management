import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Modal, Input } from "./admin.tipe-kamar";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useSettings, useUpsertSetting } from "@/hooks/useSettings";

type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  note?: string;
  isActive: boolean;
};

export const Route = createFileRoute("/admin/rekening")({
  head: () => ({ meta: [{ title: "Rekening" }] }),
  component: RekeningPage,
});

function normalizeAccounts(value: unknown): BankAccount[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((a: any) => ({
      bankName: String(a?.bankName ?? "").trim(),
      accountName: String(a?.accountName ?? "").trim(),
      accountNumber: String(a?.accountNumber ?? "").trim(),
      note: String(a?.note ?? "").trim(),
      isActive: Boolean(a?.isActive ?? true),
    }))
    .filter((a) => a.bankName && a.accountName && a.accountNumber);
}

function RekeningPage() {
  const settings = useSettings();
  const upsert = useUpsertSetting();

  const byKey = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return map;
  }, [settings.data]);

  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<BankAccount>({
    bankName: "",
    accountName: "",
    accountNumber: "",
    note: "",
    isActive: true,
  });

  const list = useMemo(() => normalizeAccounts(byKey.get("bankAccounts")), [byKey]);

  function openAdd() {
    setEditingIndex(null);
    setForm({ bankName: "", accountName: "", accountNumber: "", note: "", isActive: true });
    setOpen(true);
  }

  function openEdit(idx: number) {
    const item = list[idx];
    if (!item) return;
    setEditingIndex(idx);
    setForm({ ...item });
    setOpen(true);
  }

  async function saveAll(next: BankAccount[]) {
    await upsert.mutateAsync({ key: "bankAccounts", value: next });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.bankName || !form.accountName || !form.accountNumber) {
      toast.error("Nama bank, nama pemilik, dan nomor rekening wajib diisi");
      return;
    }
    try {
      const next = [...list];
      if (editingIndex == null) next.unshift(form);
      else next.splice(editingIndex, 1, form);
      await saveAll(next);
      toast.success("Rekening disimpan");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan rekening");
    }
  }

  async function onDelete(idx: number) {
    try {
      const next = list.filter((_, i) => i !== idx);
      await saveAll(next);
      toast.success("Rekening dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus rekening");
    }
  }

  async function toggleActive(idx: number) {
    try {
      const next = list.map((x, i) => (i === idx ? { ...x, isActive: !x.isActive } : x));
      await saveAll(next);
      toast.success("Status rekening diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update status rekening");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Rekening" desc="Master rekening untuk pembayaran transfer">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Tambah Rekening
        </button>
      </PageHeader>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        {settings.isLoading && <div className="text-sm text-muted-foreground">Memuat...</div>}
        {settings.isError && (
          <div className="text-sm text-destructive">
            {settings.error instanceof Error ? settings.error.message : "Gagal memuat pengaturan"}
          </div>
        )}
        {!settings.isLoading && !settings.isError && list.length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada rekening.</div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="pb-3 font-semibold">Bank</th>
              <th className="pb-3 font-semibold">Nama</th>
              <th className="pb-3 font-semibold">No Rekening</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((a, idx) => (
              <tr key={`${a.bankName}-${a.accountNumber}-${idx}`} className="hover:bg-secondary/40">
                <td className="py-3.5 font-semibold">{a.bankName}</td>
                <td className="py-3.5">{a.accountName}</td>
                <td className="py-3.5 font-mono text-xs font-bold">{a.accountNumber}</td>
                <td className="py-3.5">
                  <button
                    type="button"
                    onClick={() => toggleActive(idx)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      a.isActive ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                    }`}
                    title="Klik untuk toggle"
                  >
                    {a.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="py-3.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(idx)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(idx)}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
                      title="Hapus"
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

      {open && (
        <Modal title={editingIndex == null ? "Tambah Rekening" : "Edit Rekening"} onClose={() => setOpen(false)}>
          <form onSubmit={onSave} className="space-y-4">
            <Input label="Nama Bank" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} />
            <Input
              label="Nama Pemilik"
              value={form.accountName}
              onChange={(v) => setForm({ ...form, accountName: v })}
            />
            <Input
              label="Nomor Rekening"
              value={form.accountNumber}
              onChange={(v) => setForm({ ...form, accountNumber: v })}
            />
            <Input label="Catatan (opsional)" value={form.note ?? ""} onChange={(v) => setForm({ ...form, note: v })} />
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
                disabled={upsert.isPending}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                {upsert.isPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

