import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Image as ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSettings, useUpsertSetting } from "@/hooks/useSettings";
import QRCodeLib from "qrcode";
import { apiRequest } from "@/services/api";
import { useNavigate } from "@tanstack/react-router";
import { clearAdminToken } from "@/services/admin-auth";

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan" }] }),
  component: Pengaturan,
});

function Pengaturan() {
  const navigate = useNavigate();
  const settings = useSettings();
  const upsert = useUpsertSetting();

  const byKey = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return map;
  }, [settings.data]);

  const [form, setForm] = useState({
    propertyName: "",
    propertyLocation: "",
    heroHeadline: "",
    heroSubheadline: "",
    propertyFacilities: "",
    contactEmail: "",
    phone: "",
    website: "",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    address: "",
    invoiceTemplate: "",
    whatsappTemplate: "",
    invoiceNote: "",
    logoDataUrl: "",
  });

  const [waStatus, setWaStatus] = useState<{ status: string; qr?: string; me?: string; error?: string } | null>(null);
  const [waQrDataUrl, setWaQrDataUrl] = useState<string>("");
  const [waLoading, setWaLoading] = useState(false);

  async function refreshWaStatus() {
    try {
      const st = await apiRequest<{ status: string; qr?: string; me?: string; error?: string }>("/admin/whatsapp/status");
      setWaStatus(st);
      if (st?.qr) {
        const url = await QRCodeLib.toDataURL(st.qr, { margin: 1, width: 260 });
        setWaQrDataUrl(url);
      } else {
        setWaQrDataUrl("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal cek status WA";
      const status = (e as any)?.status;
      if (status === 401) {
        toast.error("Sesi admin berakhir. Silakan login ulang.");
        clearAdminToken();
        window.location.assign("/admin-login");
      }
      setWaStatus({ status: "error", error: msg });
      setWaQrDataUrl("");
    }
  }

  async function connectWa() {
    setWaLoading(true);
    try {
      const st = await apiRequest<{ status: string; qr?: string; me?: string; error?: string }>("/admin/whatsapp/connect", { method: "POST" });
      setWaStatus(st);
      if (st?.qr) {
        const url = await QRCodeLib.toDataURL(st.qr, { margin: 1, width: 260 });
        setWaQrDataUrl(url);
      } else {
        setWaQrDataUrl("");
      }
      toast.success("Silakan scan QR WhatsApp");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai koneksi WhatsApp");
    } finally {
      setWaLoading(false);
    }
  }

  async function disconnectWa() {
    setWaLoading(true);
    try {
      await apiRequest("/admin/whatsapp/disconnect", { method: "POST" });
      await refreshWaStatus();
      toast.success("WhatsApp terputus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memutus WhatsApp");
    } finally {
      setWaLoading(false);
    }
  }

  useEffect(() => {
    if (!settings.data) return;
    setForm((prev) => ({
      ...prev,
      propertyName: (byKey.get("propertyName") as string) ?? prev.propertyName,
      propertyLocation: (byKey.get("propertyLocation") as string) ?? prev.propertyLocation,
      heroHeadline: (byKey.get("heroHeadline") as string) ?? prev.heroHeadline,
      heroSubheadline: (byKey.get("heroSubheadline") as string) ?? prev.heroSubheadline,
      propertyFacilities:
        Array.isArray(byKey.get("propertyFacilities"))
          ? (byKey.get("propertyFacilities") as any[]).join(", ")
          : ((byKey.get("propertyFacilities") as string) ?? prev.propertyFacilities),
      contactEmail: (byKey.get("contactEmail") as string) ?? prev.contactEmail,
      phone: (byKey.get("phone") as string) ?? prev.phone,
      website: (byKey.get("website") as string) ?? prev.website,
      checkInTime: (byKey.get("checkInTime") as string) ?? prev.checkInTime,
      checkOutTime: (byKey.get("checkOutTime") as string) ?? prev.checkOutTime,
      address: (byKey.get("address") as string) ?? prev.address,
      invoiceTemplate: (byKey.get("invoiceTemplate") as string) ?? prev.invoiceTemplate,
      whatsappTemplate: (byKey.get("whatsappTemplate") as string) ?? prev.whatsappTemplate,
      invoiceNote: (byKey.get("invoiceNote") as string) ?? prev.invoiceNote,
      logoDataUrl: (byKey.get("logoDataUrl") as string) ?? prev.logoDataUrl,
    }));
  }, [byKey, settings.data]);

  useEffect(() => {
    refreshWaStatus();
    const t = window.setInterval(() => refreshWaStatus(), 2000);
    return () => window.clearInterval(t);
  }, []);

  async function onSave() {
    const facilities = form.propertyFacilities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await Promise.all([
        upsert.mutateAsync({ key: "propertyName", value: form.propertyName }),
        upsert.mutateAsync({ key: "propertyLocation", value: form.propertyLocation }),
        upsert.mutateAsync({ key: "heroHeadline", value: form.heroHeadline }),
        upsert.mutateAsync({ key: "heroSubheadline", value: form.heroSubheadline }),
        upsert.mutateAsync({ key: "propertyFacilities", value: facilities }),
        upsert.mutateAsync({ key: "contactEmail", value: form.contactEmail }),
        upsert.mutateAsync({ key: "phone", value: form.phone }),
        upsert.mutateAsync({ key: "website", value: form.website }),
        upsert.mutateAsync({ key: "checkInTime", value: form.checkInTime }),
        upsert.mutateAsync({ key: "checkOutTime", value: form.checkOutTime }),
        upsert.mutateAsync({ key: "address", value: form.address }),
        upsert.mutateAsync({ key: "invoiceTemplate", value: form.invoiceTemplate }),
        upsert.mutateAsync({ key: "whatsappTemplate", value: form.whatsappTemplate }),
        upsert.mutateAsync({ key: "invoiceNote", value: form.invoiceNote }),
        upsert.mutateAsync({ key: "logoDataUrl", value: form.logoDataUrl }),
      ]);
      toast.success("Pengaturan disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan");
    }
  }

  async function onLogoChange(file: File | null) {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("Ukuran logo maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setForm((p) => ({ ...p, logoDataUrl: value }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan Properti" desc="Atur informasi & template komunikasi" />
      {settings.isLoading && (
        <div className="text-sm text-muted-foreground">Memuat pengaturan...</div>
      )}
      {settings.isError && (
        <div className="text-sm text-destructive">
          {settings.error instanceof Error ? settings.error.message : "Gagal memuat pengaturan"}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] lg:col-span-2">
          <h3 className="text-base font-bold">Informasi Properti</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama Properti"
              value={form.propertyName}
              onChange={(e) => setForm({ ...form, propertyName: e.target.value })}
            />
            <Field
              label="Lokasi (contoh: Bali)"
              value={form.propertyLocation}
              onChange={(e) => setForm({ ...form, propertyLocation: e.target.value })}
            />
            <Field
              label="Email Kontak"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
            <Field
              label="No. Telepon"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Field
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <Field
              label="Headline Landing"
              value={form.heroHeadline}
              onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })}
              placeholder="Pengalaman menginap yang tak terlupakan."
            />
            <Field
              label="Subheadline Landing"
              value={form.heroSubheadline}
              onChange={(e) => setForm({ ...form, heroSubheadline: e.target.value })}
              placeholder="Pilih tanggal, pilih kamar, dan nikmati liburan Anda — konfirmasi instan."
            />
            <Field
              label="Jam Check-in"
              value={form.checkInTime}
              onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
            />
            <Field
              label="Jam Check-out"
              value={form.checkOutTime}
              onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium">Alamat</label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:border-accent outline-none"
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium">Fasilitas Properti (pisahkan dengan koma)</label>
            <textarea
              rows={3}
              value={form.propertyFacilities}
              onChange={(e) => setForm({ ...form, propertyFacilities: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:border-accent outline-none"
              placeholder="WiFi Cepat, Kolam Renang, Parkir, Keamanan 24/7"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Logo Properti</h3>
          <label className="mt-4 flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/40">
            {form.logoDataUrl ? (
              <img
                src={form.logoDataUrl}
                alt="Logo"
                className="h-full w-full rounded-2xl object-contain p-6"
              />
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <div className="mt-2 text-xs font-medium">Upload Logo</div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Template Invoice</h3>
          <textarea
            rows={6}
            className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-xs outline-none focus:border-accent"
            value={form.invoiceTemplate}
            onChange={(e) => setForm({ ...form, invoiceTemplate: e.target.value })}
          />
        </div>
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Template WhatsApp</h3>
          <textarea
            rows={6}
            className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-xs outline-none focus:border-accent"
            value={form.whatsappTemplate}
            onChange={(e) => setForm({ ...form, whatsappTemplate: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold">Koneksi WhatsApp</h3>
            <div className="mt-1 text-xs text-muted-foreground">
              Hubungkan WhatsApp (scan QR) untuk mengirim notifikasi pembayaran & invoice.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshWaStatus}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
              disabled={waLoading}
            >
              Refresh
            </button>
            {waStatus?.status === "connected" ? (
              <button
                type="button"
                onClick={disconnectWa}
                className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive"
                disabled={waLoading}
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={connectWa}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
                disabled={waLoading}
              >
                Connect
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr] items-start">
          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="text-xs font-semibold text-muted-foreground">Status</div>
            <div className="mt-1 text-sm font-bold">
              {waStatus?.status ? waStatus.status.toUpperCase() : "UNKNOWN"}
            </div>
            {waStatus?.error && <div className="mt-2 text-xs text-destructive">{waStatus.error}</div>}
            {waQrDataUrl ? (
              <img src={waQrDataUrl} alt="QR WhatsApp" className="mt-4 w-full rounded-xl bg-white p-3" />
            ) : (
              <div className="mt-4 text-xs text-muted-foreground">
                {waStatus?.status === "connected"
                  ? "WhatsApp sudah terhubung."
                  : "Klik Connect untuk menampilkan QR."}
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">Cara konek:</div>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>Buka WhatsApp di HP</li>
              <li>Menu titik tiga → Perangkat tertaut (Linked devices)</li>
              <li>Klik “Tautkan perangkat” lalu scan QR di sini</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-bold">Catatan Invoice</h3>
        <textarea
          rows={4}
          className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
          value={form.invoiceNote}
          onChange={(e) => setForm({ ...form, invoiceNote: e.target.value })}
          placeholder="Catatan tambahan yang akan tampil di invoice..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <button className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium">
          Batal
        </button>
        <button
          onClick={onSave}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
