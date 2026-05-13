import { createFileRoute } from "@tanstack/react-router";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Modal, Input } from "./admin.tipe-kamar";
import { useRooms, useCreateRoom, useDeleteRoom, useUpdateRoom } from "@/hooks/useRooms";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import type { Room, RoomStatus, RoomType } from "@/services/types";

export const Route = createFileRoute("/admin/kamar")({
  head: () => ({ meta: [{ title: "Master Kamar" }] }),
  component: KamarPage,
});

const status = {
  tersedia: "bg-success/15 text-success",
  dipesan: "bg-blue-100 text-blue-700",
  terisi: "bg-warning/20 text-warning-foreground",
  perbaikan: "bg-destructive/10 text-destructive",
} as const;

type Status = keyof typeof status;
const STATUSES: Status[] = ["tersedia", "dipesan", "terisi", "perbaikan"];

function KamarPage() {
  const rooms = useRooms();
  const roomTypes = useRoomTypes(false);
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState({
    nomorKamar: "",
    roomTypeId: "",
    lantai: "1",
    status: "tersedia" as Status,
    catatan: "",
    hargaOverride: "",
  });

  function openAdd() {
    setEditing(null);
    const firstTypeId =
      (roomTypes.data ?? []).find((t) => t.isActive)?._id ?? (roomTypes.data ?? [])[0]?._id ?? "";
    setForm({
      nomorKamar: "",
      roomTypeId: firstTypeId,
      lantai: "1",
      status: "tersedia",
      catatan: "",
      hargaOverride: "",
    });
    setOpen(true);
  }

  function openEdit(r: Room) {
    setEditing(r);
    const rtId = typeof r.roomTypeId === "string" ? r.roomTypeId : r.roomTypeId._id;
    setForm({
      nomorKamar: r.nomorKamar,
      roomTypeId: rtId,
      lantai: String(r.lantai),
      status: r.status as Status,
      catatan: r.catatan ?? "",
      hargaOverride: r.hargaOverride != null ? String(r.hargaOverride) : "",
    });
    setOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await deleteRoom.mutateAsync(id);
      toast.success("Kamar dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus kamar");
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.nomorKamar) {
      toast.error("Nomor kamar wajib");
      return;
    }
    if (!form.roomTypeId) {
      toast.error("Tipe kamar wajib dipilih");
      return;
    }

    const payload: Partial<Room> = {
      nomorKamar: form.nomorKamar,
      roomTypeId: form.roomTypeId,
      lantai: Number(form.lantai),
      status: form.status as RoomStatus,
      catatan: form.catatan,
      hargaOverride: form.hargaOverride ? Number(form.hargaOverride) : undefined,
    };

    try {
      if (editing) {
        await updateRoom.mutateAsync({ id: editing._id, payload });
      } else {
        await createRoom.mutateAsync(payload);
      }
      toast.success(editing ? "Kamar diperbarui" : "Kamar ditambahkan");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan kamar");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Master Kamar" desc="Daftar kamar fisik per lantai">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Tambah Kamar
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {rooms.isLoading && (
          <div className="col-span-full rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Memuat kamar...
          </div>
        )}
        {rooms.isError && (
          <div className="col-span-full rounded-2xl bg-card p-6 text-sm text-destructive shadow-[var(--shadow-card)]">
            {rooms.error instanceof Error ? rooms.error.message : "Gagal memuat kamar"}
          </div>
        )}
        {!rooms.isLoading && !rooms.isError && (rooms.data?.length ?? 0) === 0 && (
          <div className="col-span-full rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Belum ada kamar fisik. Klik "Tambah Kamar" untuk membuat data pertama.
          </div>
        )}
        {(rooms.data ?? []).map((k) => {
          const rt = k.roomTypeId as string | RoomType;
          const tipeLabel = typeof rt === "string" ? rt : rt.namaTipe;
          return (
            <div key={k._id} className="group rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Kamar</div>
                  <div className="text-xl font-bold">{k.nomorKamar}</div>
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(k)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(k._id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {tipeLabel} · Lt. {k.lantai}
              </div>
              <span
                className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${status[k.status as Status]}`}
              >
                {k.status}
              </span>
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title={editing ? "Edit Kamar" : "Tambah Kamar"} onClose={() => setOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nomor Kamar"
              value={form.nomorKamar}
              onChange={(v) => setForm({ ...form, nomorKamar: v })}
              placeholder="101"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Tipe Kamar"
                value={form.roomTypeId}
                onChange={(v) => setForm({ ...form, roomTypeId: v })}
                options={(roomTypes.data ?? [])
                  .filter((t) => t.isActive)
                  .map((t) => ({ label: t.namaTipe, value: t._id }))}
              />
              <Input
                label="Lantai"
                type="number"
                value={form.lantai}
                onChange={(v) => setForm({ ...form, lantai: v })}
              />
            </div>
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as Status })}
              options={STATUSES.map((s) => ({ label: s, value: s }))}
            />
            <Input
              label="Catatan"
              value={form.catatan}
              onChange={(v) => setForm({ ...form, catatan: v })}
              placeholder="Contoh: dekat lift"
            />
            <Input
              label="Harga Override (opsional)"
              type="number"
              value={form.hargaOverride}
              onChange={(v) => setForm({ ...form, hargaOverride: v })}
              placeholder="900000"
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { label: string; value: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm capitalize outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
