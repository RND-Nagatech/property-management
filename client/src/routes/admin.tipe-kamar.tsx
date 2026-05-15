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
import { CurrencyInput } from "@/components/ui/CurrencyInput";

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
  depositEnabled: boolean;
  depositAllowedTypes: ("CASH" | "KTP" | "SIM" | "PASSPORT")[];
  depositCashAmount: string;
  depositNote: string;
  jamCheckIn: string;
  jamCheckOut: string;
  gambarThumbnail: string;
  galeriGambar: string[];
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
  depositEnabled: false,
  depositAllowedTypes: [],
  depositCashAmount: "",
  depositNote: "",
  jamCheckIn: "14:00",
  jamCheckOut: "12:00",
  gambarThumbnail: "",
  galeriGambar: [],
};

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function normalizeSlugLocal(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function TipeKamarPage() {
  const roomTypes = useRoomTypes(false);
  const createRoomType = useCreateRoomType();
  const updateRoomType = useUpdateRoomType();
  const deleteRoomType = useDeleteRoomType();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setOpen(true);
  }

  function openEdit(r: RoomType) {
    setEditing(r);
    const policyEnabled =
      Boolean(r.depositPolicy?.enabled) ||
      Number(r.depositDefault ?? 0) > 0 ||
      r.deposit?.type === "DOCUMENT";
    const policyAllowedTypes: ("CASH" | "KTP" | "SIM" | "PASSPORT")[] = Array.isArray(
      r.depositPolicy?.allowedTypes
    )
      ? (r.depositPolicy!.allowedTypes as any)
      : [];
    const legacyAllowedFromDeposit: ("CASH" | "KTP" | "SIM" | "PASSPORT")[] = [];
    if (Number(r.depositDefault ?? 0) > 0) legacyAllowedFromDeposit.push("CASH");
    if (r.deposit?.type === "DOCUMENT" && r.deposit.documentType) {
      legacyAllowedFromDeposit.push(r.deposit.documentType as any);
    }
    const allowedTypes = policyAllowedTypes.length > 0 ? policyAllowedTypes : legacyAllowedFromDeposit;
    const cashAmount =
      String(r.depositPolicy?.cashAmount ?? "") ||
      (Number(r.depositDefault ?? 0) > 0 ? String(r.depositDefault) : "");
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
      depositEnabled: policyEnabled,
      depositAllowedTypes: allowedTypes,
      depositCashAmount: cashAmount,
      depositNote: String(r.depositPolicy?.note ?? ""),
      jamCheckIn: r.jamCheckIn ?? "14:00",
      jamCheckOut: r.jamCheckOut ?? "12:00",
      gambarThumbnail: r.gambarThumbnail ?? "",
      galeriGambar: r.galeriGambar ?? [],
    });
    setSlugTouched(true);
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
    if (form.depositEnabled) {
      if ((form.depositAllowedTypes?.length ?? 0) === 0) {
        toast.error("Pilih minimal 1 jenis deposit");
        return;
      }
      if (form.depositAllowedTypes.includes("CASH") && (Number(form.depositCashAmount || "0") || 0) <= 0) {
        toast.error("Nominal deposit wajib diisi untuk deposit uang tunai");
        return;
      }
    }

    const baseSlug = normalizeSlugLocal(form.slug || form.namaTipe);
    let nextSlug = baseSlug;
    const used = new Set(
      (roomTypes.data ?? [])
        .filter((t) => (editing ? t._id !== editing._id : true))
        .map((t) => t.slug)
    );
    let n = 2;
    while (nextSlug && used.has(nextSlug)) {
      nextSlug = `${baseSlug}-${n++}`;
    }

    const depositPolicyEnabled = Boolean(form.depositEnabled);
    const depositPolicyAllowedTypes = Array.from(new Set(form.depositAllowedTypes ?? [])).filter(
      Boolean
    ) as ("CASH" | "KTP" | "SIM" | "PASSPORT")[];
    const depositPolicyCashAmount = Number(form.depositCashAmount || "0") || 0;
    const depositPolicy: RoomType["depositPolicy"] = {
      enabled: depositPolicyEnabled,
      allowedTypes: depositPolicyAllowedTypes,
      cashAmount: depositPolicyCashAmount,
      note: form.depositNote || "",
    };

    // Backward-compatible fields:
    // - Keep depositDefault numeric for legacy display/reporting
    // - Keep deposit object for older UI
    const enableCash = depositPolicyEnabled && depositPolicyAllowedTypes.includes("CASH");
    const legacyDepositDefault = enableCash ? depositPolicyCashAmount : 0;
    const firstDoc = depositPolicyAllowedTypes.find((t) => t !== "CASH") as any;
    const legacyDeposit: RoomType["deposit"] =
      depositPolicyEnabled && !enableCash && firstDoc
        ? { type: "DOCUMENT", amount: 0, documentType: firstDoc }
        : { type: "MONEY", amount: legacyDepositDefault, documentType: null };

    const payload: Partial<RoomType> = {
      namaTipe: form.namaTipe,
      slug: nextSlug,
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
      depositPolicy: depositPolicy as any,
      // Backward-compatible: keep depositDefault/deposit for older pages (deposit is not charged on booking).
      depositDefault: legacyDepositDefault,
      deposit: legacyDeposit as any,
      jamCheckIn: form.jamCheckIn,
      jamCheckOut: form.jamCheckOut,
      gambarThumbnail: form.gambarThumbnail,
      galeriGambar: form.galeriGambar,
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
              onChange={(v) => {
                setForm((p) => ({
                  ...p,
                  namaTipe: v,
                  slug: slugTouched ? p.slug : normalizeSlugLocal(v),
                }));
              }}
              placeholder="Deluxe Room"
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(v) => {
                setSlugTouched(true);
                setForm({ ...form, slug: v });
              }}
              placeholder="deluxe-room"
            />
            <div className="grid grid-cols-2 gap-3">
              <CurrencyInput
                label="Harga / malam"
                valueDigits={String(form.hargaDefault ?? "").replace(/[^\d]/g, "")}
                onChangeDigits={(digits) => setForm({ ...form, hargaDefault: digits })}
                placeholder="Rp 850.000"
              />
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Deposit (kebijakan)</div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.depositEnabled}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        depositEnabled: e.target.checked,
                        depositAllowedTypes: e.target.checked ? (p.depositAllowedTypes.length ? p.depositAllowedTypes : ["CASH"]) : [],
                      }))
                    }
                    className="h-4 w-4 accent-[oklch(0.74_0.10_78)]"
                  />
                  Aktifkan deposit
                </label>
                {form.depositEnabled && (
                  <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                    <div className="text-xs font-semibold text-muted-foreground">Jenis deposit yang diterima</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(["CASH", "KTP", "SIM", "PASSPORT"] as const).map((t) => (
                        <label key={t} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.depositAllowedTypes.includes(t)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm((p) => {
                                const next = checked
                                  ? Array.from(new Set([...p.depositAllowedTypes, t]))
                                  : p.depositAllowedTypes.filter((x) => x !== t);
                                return { ...p, depositAllowedTypes: next as any };
                              });
                            }}
                            className="h-4 w-4 accent-[oklch(0.74_0.10_78)]"
                          />
                          {t === "CASH" ? "Uang tunai" : t === "PASSPORT" ? "Paspor" : t}
                        </label>
                      ))}
                    </div>
                    {form.depositAllowedTypes.includes("CASH") && (
                      <CurrencyInput
                        label="Nominal deposit (Rp)"
                        valueDigits={String(form.depositCashAmount ?? "").replace(/[^\d]/g, "")}
                        onChangeDigits={(digits) => setForm((p) => ({ ...p, depositCashAmount: digits }))}
                        placeholder="Rp 300.000"
                      />
                    )}
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">Catatan</span>
                      <textarea
                        rows={2}
                        value={form.depositNote}
                        onChange={(e) => setForm((p) => ({ ...p, depositNote: e.target.value }))}
                        placeholder="Contoh: deposit dikembalikan saat check-out."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {/* Preview harga: {formatRupiah(Number(form.hargaDefault || "0") || 0)} */}
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
            <div className="space-y-3">
              <div>
                <div className="mb-1 block text-xs font-semibold text-muted-foreground">Thumbnail</div>
                <div className="grid gap-3 sm:grid-cols-[140px_1fr] items-start">
                  <div className="overflow-hidden rounded-xl border border-border bg-secondary/40">
                    {form.gambarThumbnail ? (
                      <img
                        src={form.gambarThumbnail}
                        alt="Thumbnail"
                        className="h-[100px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[100px] items-center justify-center text-xs text-muted-foreground">
                        Tidak ada gambar
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setUploading(true);
                          const dataUrl = await readFileAsDataUrl(file);
                          setForm((p) => ({ ...p, gambarThumbnail: dataUrl }));
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Gagal upload thumbnail");
                        } finally {
                          setUploading(false);
                          e.currentTarget.value = "";
                        }
                      }}
                      className="block w-full text-sm"
                    />
                    <Input
                      label="Atau isi URL Thumbnail"
                      value={form.gambarThumbnail}
                      onChange={(v) => setForm({ ...form, gambarThumbnail: v })}
                      placeholder="/assets/room-deluxe.jpg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 block text-xs font-semibold text-muted-foreground">Galeri</div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length === 0) return;
                    try {
                      setUploading(true);
                      const urls = await Promise.all(files.map((f) => readFileAsDataUrl(f)));
                      setForm((p) => ({ ...p, galeriGambar: [...p.galeriGambar, ...urls] }));
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Gagal upload galeri");
                    } finally {
                      setUploading(false);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="block w-full text-sm"
                />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {form.galeriGambar.slice(0, 9).map((src, idx) => (
                    <div key={`${idx}-${src.slice(0, 20)}`} className="relative overflow-hidden rounded-xl border border-border">
                      <img src={src} alt="" className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setForm((p) => ({
                            ...p,
                            galeriGambar: p.galeriGambar.filter((_s, i) => i !== idx),
                          }));
                        }}
                        className="absolute right-1 top-1 rounded-lg bg-black/55 p-1 text-white"
                        title="Hapus"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Atau isi URL Galeri (1 baris = 1 URL)
                    </span>
                    <textarea
                      rows={3}
                      value={form.galeriGambar.join("\n")}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          galeriGambar: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="/assets/room-deluxe.jpg\n/assets/room-suite.jpg"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                    />
                  </label>
                </div>
              </div>
            </div>
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
                disabled={uploading}
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
