import { createFileRoute } from "@tanstack/react-router";
import { formatRupiah } from "@/lib/currency";
import { Plus, Edit2, Trash2, Image as ImageIcon, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  useCreateRoomType,
  useDeleteRoomType,
  useRoomTypes,
  useUpdateRoomType,
} from "@/hooks/useRoomTypes";
import type { RoomType } from "@/services/types";

export const Route = createFileRoute("/admin/tipe-kamar")({
  head: () => ({ meta: [{ title: "Master Tipe Kamar" }] }),
  component: TipeKamarPage,
});

type FormState = {
  namaTipe: string;
  slug: string;
  hargaDefault: string;
  kapasitas: string;
  ukuranKamar: string;
  tipeKasur: string;
  includeSarapan: boolean;
  deskripsi: string;
  fasilitasUtama: string;
  fasilitasKamar: string;
  fasilitasKamarMandi: string;
  depositDefault: string;
  jamCheckIn: string;
  jamCheckOut: string;
  gambarThumbnail: string;
  galeriGambar: string;
};

const emptyForm: FormState = {
  namaTipe: "",
  slug: "",
  hargaDefault: "",
  kapasitas: "2",
  ukuranKamar: "",
  tipeKasur: "1 King Bed",
  includeSarapan: true,
  deskripsi: "",
  fasilitasUtama: "AC, WiFi Gratis, TV LED",
  fasilitasKamar: "",
  fasilitasKamarMandi: "",
  depositDefault: "300000",
  jamCheckIn: "14:00",
  jamCheckOut: "12:00",
  gambarThumbnail: "",
  galeriGambar: "",
};

function TipeKamarPage() {
  const roomTypes = useRoomTypes(false);
  const createRoomType = useCreateRoomType();
  const updateRoomType = useUpdateRoomType();
  const deleteRoomType = useDeleteRoomType();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(r: RoomType) {
    setEditing(r);
    setForm({
      namaTipe: r.namaTipe,
      slug: r.slug,
      hargaDefault: String(r.hargaDefault),
      kapasitas: String(r.kapasitas),
      ukuranKamar: String(r.ukuranKamar),
      tipeKasur: r.tipeKasur ?? "",
      includeSarapan: r.includeSarapan,
      deskripsi: r.deskripsi ?? "",
      fasilitasUtama: (r.fasilitasUtama ?? []).join(", "),
      fasilitasKamar: (r.fasilitasKamar ?? []).join(", "),
      fasilitasKamarMandi: (r.fasilitasKamarMandi ?? []).join(", "),
      depositDefault: String(r.depositDefault ?? 0),
      jamCheckIn: r.jamCheckIn ?? "14:00",
      jamCheckOut: r.jamCheckOut ?? "12:00",
      gambarThumbnail: r.gambarThumbnail ?? "",
      galeriGambar: (r.galeriGambar ?? []).join(", "),
    });
    setOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await deleteRoomType.mutateAsync(id);
      toast.success("Tipe kamar dinonaktifkan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menonaktifkan tipe kamar");
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.namaTipe || !form.hargaDefault) {
      toast.error("Nama tipe dan harga wajib diisi");
      return;
    }

    const payload: Partial<RoomType> = {
      namaTipe: form.namaTipe,
      slug: form.slug,
      hargaDefault: Number(form.hargaDefault),
      kapasitas: Number(form.kapasitas),
      ukuranKamar: Number(form.ukuranKamar) || 20,
      tipeKasur: form.tipeKasur,
      includeSarapan: form.includeSarapan,
      deskripsi: form.deskripsi,
      fasilitasUtama: form.fasilitasUtama
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      fasilitasKamar: form.fasilitasKamar
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      fasilitasKamarMandi: form.fasilitasKamarMandi
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      depositDefault: Number(form.depositDefault) || 0,
      jamCheckIn: form.jamCheckIn,
      jamCheckOut: form.jamCheckOut,
      gambarThumbnail: form.gambarThumbnail,
      galeriGambar: form.galeriGambar
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (editing) {
        await updateRoomType.mutateAsync({ id: editing._id, payload });
      } else {
        await createRoomType.mutateAsync(payload);
      }
      toast.success(editing ? "Tipe kamar diperbarui" : "Tipe kamar ditambahkan");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan tipe kamar");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Master Tipe Kamar" desc="Kelola tipe kamar, harga, dan fasilitas">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Tambah Tipe Kamar
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roomTypes.isLoading && (
          <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Memuat tipe kamar...
          </div>
        )}
        {roomTypes.isError && (
          <div className="rounded-2xl bg-card p-6 text-sm text-destructive shadow-[var(--shadow-card)]">
            {roomTypes.error instanceof Error ? roomTypes.error.message : "Gagal memuat tipe kamar"}
          </div>
        )}
        {!roomTypes.isLoading && !roomTypes.isError && (roomTypes.data?.length ?? 0) === 0 && (
          <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Belum ada tipe kamar. Klik "Tambah Tipe Kamar" untuk membuat data pertama.
          </div>
        )}
        {(roomTypes.data ?? []).map((r) => (
          <div
            key={r._id}
            className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]"
          >
            <div className="relative aspect-[16/10]">
              {r.gambarThumbnail ? (
                <img src={r.gambarThumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
                  Tidak ada gambar
                </div>
              )}
              <div className="absolute right-2 top-2 flex gap-1">
                <button className="rounded-lg bg-white/90 p-2 text-primary hover:bg-white">
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => openEdit(r)}
                  className="rounded-lg bg-white/90 p-2 text-primary hover:bg-white"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(r._id)}
                  className="rounded-lg bg-white/90 p-2 text-destructive hover:bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold">{r.namaTipe}</h3>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.kapasitas} tamu · {r.ukuranKamar}m² · {r.tipeKasur}
                  </div>
                </div>
                {r.includeSarapan && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    Sarapan
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(r.fasilitasUtama ?? []).slice(0, 4).map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <div className="text-base font-bold">{formatRupiah(r.hargaDefault)}</div>
                  <div className="text-[10px] text-muted-foreground">per malam</div>
                </div>
                <span className="text-xs font-medium text-accent-foreground/80">
                  {r.kamarTersedia ?? 0} kamar tersedia
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Modal
          title={editing ? "Edit Tipe Kamar" : "Tambah Tipe Kamar"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nama Tipe Kamar"
              value={form.namaTipe}
              onChange={(v) => setForm({ ...form, namaTipe: v })}
              placeholder="Deluxe Room"
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(v) => setForm({ ...form, slug: v })}
              placeholder="deluxe-room"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Harga / malam (Rp)"
                type="number"
                value={form.hargaDefault}
                onChange={(v) => setForm({ ...form, hargaDefault: v })}
                placeholder="850000"
              />
              <Input
                label="Deposit Default (Rp)"
                type="number"
                value={form.depositDefault}
                onChange={(v) => setForm({ ...form, depositDefault: v })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Kapasitas"
                type="number"
                value={form.kapasitas}
                onChange={(v) => setForm({ ...form, kapasitas: v })}
              />
              <Input
                label="Luas (m²)"
                type="number"
                value={form.ukuranKamar}
                onChange={(v) => setForm({ ...form, ukuranKamar: v })}
              />
              <Input
                label="Tempat Tidur"
                value={form.tipeKasur}
                onChange={(v) => setForm({ ...form, tipeKasur: v })}
              />
            </div>
            <Input
              label="Deskripsi"
              value={form.deskripsi}
              onChange={(v) => setForm({ ...form, deskripsi: v })}
              placeholder="Kamar nyaman dengan..."
            />
            <Input
              label="Fasilitas Utama (pisah koma)"
              value={form.fasilitasUtama}
              onChange={(v) => setForm({ ...form, fasilitasUtama: v })}
            />
            <Input
              label="Fasilitas Kamar (pisah koma)"
              value={form.fasilitasKamar}
              onChange={(v) => setForm({ ...form, fasilitasKamar: v })}
            />
            <Input
              label="Fasilitas Kamar Mandi (pisah koma)"
              value={form.fasilitasKamarMandi}
              onChange={(v) => setForm({ ...form, fasilitasKamarMandi: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Jam Check-in"
                value={form.jamCheckIn}
                onChange={(v) => setForm({ ...form, jamCheckIn: v })}
                placeholder="14:00"
              />
              <Input
                label="Jam Check-out"
                value={form.jamCheckOut}
                onChange={(v) => setForm({ ...form, jamCheckOut: v })}
                placeholder="12:00"
              />
            </div>
            <Input
              label="Thumbnail URL"
              value={form.gambarThumbnail}
              onChange={(v) => setForm({ ...form, gambarThumbnail: v })}
              placeholder="/assets/room-deluxe.jpg"
            />
            <Input
              label="Galeri URL (pisah koma)"
              value={form.galeriGambar}
              onChange={(v) => setForm({ ...form, galeriGambar: v })}
              placeholder="/assets/room-deluxe.jpg, /assets/room-suite.jpg"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.includeSarapan}
                onChange={(e) => setForm({ ...form, includeSarapan: e.target.checked })}
                className="h-4 w-4 accent-[oklch(0.74_0.10_78)]"
              />
              Termasuk sarapan
            </label>
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

export function PageHeader({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-t-3xl bg-card shadow-[var(--shadow-elevated)] sm:rounded-3xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
