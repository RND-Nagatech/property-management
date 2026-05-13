import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { Image as ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSettings, useUpsertSetting } from "@/hooks/useSettings";

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan" }] }),
  component: Pengaturan,
});

function Pengaturan() {
  const settings = useSettings();
  const upsert = useUpsertSetting();

  const byKey = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return map;
  }, [settings.data]);

  const [form, setForm] = useState({
    propertyName: "Stayly Resort & Villa",
    contactEmail: "hello@stayly.id",
    phone: "0361 234 5678",
    website: "stayly.id",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    address: "Jl. Pantai Berawa No. 88, Canggu, Bali",
    invoiceTemplate:
      "Terima kasih telah menginap di {{property}}.\nInvoice: {{invoice_no}}\nTotal: {{total}}",
    whatsappTemplate:
      "Halo {{guest_name}},\nBooking {{booking_code}} dikonfirmasi.\nCheck-in: {{checkin_date}}",
    invoiceNote: "",
    logoDataUrl: "",
  });

  useEffect(() => {
    if (!settings.data) return;
    setForm((prev) => ({
      ...prev,
      propertyName: (byKey.get("propertyName") as string) ?? prev.propertyName,
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

  async function onSave() {
    try {
      await Promise.all([
        upsert.mutateAsync({ key: "propertyName", value: form.propertyName }),
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
