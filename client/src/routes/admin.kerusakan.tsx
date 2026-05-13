import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Plus, Upload, Wrench } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Modal, Input } from "./admin.tipe-kamar";
import {
  useCreateMaintenance,
  useMaintenances,
  useUpdateMaintenance,
  type MaintenanceStatus,
} from "@/hooks/useMaintenances";

export const Route = createFileRoute("/admin/kerusakan")({
  head: () => ({ meta: [{ title: "Kerusakan" }] }),
  component: Kerusakan,
});

const sc: Record<string, string> = {
  Baru: "bg-destructive/10 text-destructive",
  Diproses: "bg-warning/15 text-warning",
  Selesai: "bg-accent/10 text-accent",
};

function Kerusakan() {
  const maintenances = useMaintenances();
  const createMaintenance = useCreateMaintenance();
  const updateMaintenance = useUpdateMaintenance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    judul: string;
    deskripsi: string;
    status: MaintenanceStatus;
    biayaEstimasi: string;
  }>({ judul: "", deskripsi: "", status: "Baru", biayaEstimasi: "" });

  function openAdd() {
    setForm({ judul: "", deskripsi: "", status: "Baru", biayaEstimasi: "" });
    setOpen(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.judul) {
      toast.error("Judul wajib diisi");
      return;
    }
    try {
      await createMaintenance.mutateAsync({
        judul: form.judul,
        deskripsi: form.deskripsi,
        status: form.status,
        biayaEstimasi: form.biayaEstimasi ? Number(form.biayaEstimasi) : 0,
      });
      toast.success("Laporan kerusakan ditambahkan");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan laporan");
    }
  }

  async function markDone(id: string) {
    try {
      await updateMaintenance.mutateAsync({ id, payload: { status: "Selesai" } });
      toast.success("Status diubah menjadi Selesai");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Kerusakan" desc="Tracking maintenance properti">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Lapor Kerusakan
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {maintenances.isLoading && (
          <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Memuat laporan...
          </div>
        )}
        {maintenances.isError && (
          <div className="rounded-2xl bg-card p-5 text-sm text-destructive shadow-[var(--shadow-card)]">
            {maintenances.error instanceof Error
              ? maintenances.error.message
              : "Gagal memuat laporan"}
          </div>
        )}
        {!maintenances.isLoading &&
          !maintenances.isError &&
          (maintenances.data?.length ?? 0) === 0 && (
            <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
              Belum ada laporan kerusakan.
            </div>
          )}
        {(maintenances.data ?? []).map((k) => (
          <div key={k._id} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    {k._id.slice(-6)}{" "}
                    {k.roomId && typeof k.roomId === "object"
                      ? `· Kamar ${k.roomId.nomorKamar}`
                      : ""}
                  </div>
                  <div className="text-sm font-bold">{k.judul}</div>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc[k.status]}`}
              >
                {k.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{k.deskripsi || "—"}</span>
              <span>
                {k.biayaEstimasi ? `Estimasi: ${k.biayaEstimasi.toLocaleString("id-ID")}` : ""}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground">
                <Upload className="h-3.5 w-3.5" />
                Upload Foto
              </button>
              {k.status !== "Selesai" && (
                <button
                  onClick={() => markDone(k._id)}
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
                >
                  Tandai Selesai
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Modal title="Lapor Kerusakan" onClose={() => setOpen(false)}>
          <form onSubmit={onSave} className="space-y-4">
            <Input
              label="Judul"
              value={form.judul}
              onChange={(v) => setForm({ ...form, judul: v })}
              placeholder="AC tidak dingin"
            />
            <Input
              label="Deskripsi"
              value={form.deskripsi}
              onChange={(v) => setForm({ ...form, deskripsi: v })}
              placeholder="Detail kerusakan..."
            />
            <Input
              label="Biaya Estimasi (Rp)"
              type="number"
              value={form.biayaEstimasi}
              onChange={(v) => setForm({ ...form, biayaEstimasi: v })}
              placeholder="0"
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
