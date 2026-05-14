import { createFileRoute } from "@tanstack/react-router";
import { Edit2, Filter, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "./admin.tipe-kamar";
import { Modal, Input } from "./admin.tipe-kamar";
import { formatRupiah } from "@/lib/currency";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useGuests } from "@/hooks/useGuests";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { formatDateId } from "@/lib/dates";
import {
  useBookings,
  useAdminCancelBooking,
  useCreateBooking,
  useDeleteBooking,
  useUpdateBooking,
  type Booking,
  type BookingStatus,
} from "@/hooks/useBookings";

export const Route = createFileRoute("/admin/booking")({
  head: () => ({ meta: [{ title: "Booking — Admin" }] }),
  component: BookingPage,
});

const tabs: Array<{ label: string; status?: BookingStatus }> = [
  { label: "Semua" },
  { label: "Menunggu", status: "Menunggu" },
  { label: "Dikonfirmasi", status: "Dikonfirmasi" },
  { label: "Check-in", status: "Check-in" },
  { label: "Check-out", status: "Check-out" },
  { label: "Dibatalkan", status: "Dibatalkan" },
];

const statusColor: Record<BookingStatus, string> = {
  Menunggu: "bg-warning/15 text-warning",
  Dikonfirmasi: "bg-blue-100 text-blue-700",
  "Check-in": "bg-accent/10 text-accent",
  "Check-out": "bg-secondary text-muted-foreground",
  Dibatalkan: "bg-destructive/10 text-destructive",
};

function BookingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const status = tabs[activeTab]?.status;
  const bookings = useBookings({ status });
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const cancelBooking = useAdminCancelBooking();
  const guests = useGuests("");
  const roomTypes = useRoomTypes(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    tamuId: "",
    roomTypeId: "",
    checkIn: new Date().toISOString().slice(0, 10),
    checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    status: "Menunggu" as BookingStatus,
    total: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());

  function toYmdLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const guestOptions = useMemo(
    () => (guests.data ?? []).map((g) => ({ value: g._id, label: `${g.nama} (${g.email})` })),
    [guests.data],
  );
  const roomTypeOptions = useMemo(
    () => (roomTypes.data ?? []).map((rt) => ({ value: rt._id, label: rt.namaTipe })),
    [roomTypes.data],
  );

  function openAdd() {
    setEditing(null);
    setForm({
      tamuId: guestOptions[0]?.value ?? "",
      roomTypeId: roomTypeOptions[0]?.value ?? "",
      checkIn: new Date().toISOString().slice(0, 10),
      checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      status: "Menunggu",
      total: "",
    });
    setOpen(true);
  }

  function openEdit(b: Booking) {
    setEditing(b);
    setForm({
      tamuId: (b.tamuId as any)?._id ?? "",
      roomTypeId: (b.roomTypeId as any)?._id ?? "",
      checkIn: String(b.checkIn).slice(0, 10),
      checkOut: String(b.checkOut).slice(0, 10),
      status: b.status,
      total: String(b.total ?? ""),
    });
    setOpen(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.tamuId || !form.roomTypeId || !form.checkIn || !form.checkOut) {
      toast.error("Tamu, tipe kamar, dan tanggal wajib diisi");
      return;
    }
    try {
      const payload = {
        tamuId: form.tamuId,
        roomTypeId: form.roomTypeId,
        // Kirim sebagai YYYY-MM-DD agar backend parsing konsisten (tanpa shift timezone).
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        status: form.status,
        total: form.total ? Number(form.total) : 0,
      };
      if (editing) {
        await updateBooking.mutateAsync({ id: editing._id, payload });
        toast.success("Booking diperbarui");
      } else {
        await createBooking.mutateAsync(payload);
        toast.success("Booking ditambahkan");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan booking");
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteBooking.mutateAsync(id);
      toast.success("Booking dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus booking");
    }
  }

  async function onCancel(id: string) {
    try {
      await cancelBooking.mutateAsync(id);
      toast.success("Booking dibatalkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan booking");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Booking" desc="Kelola semua reservasi">
        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filter
        </button>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Booking Walk-in
        </button>
      </PageHeader>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActiveTab(i)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {bookings.isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Memuat booking...</div>
        )}
        {bookings.isError && (
          <div className="mt-4 text-sm text-destructive">
            {bookings.error instanceof Error ? bookings.error.message : "Gagal memuat booking"}
          </div>
        )}
        {!bookings.isLoading && !bookings.isError && (bookings.data?.length ?? 0) === 0 && (
          <div className="mt-4 text-sm text-muted-foreground">Belum ada booking.</div>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3 font-semibold">Booking ID</th>
                <th className="pb-3 font-semibold">Tamu</th>
                <th className="pb-3 font-semibold">Tipe Kamar</th>
                <th className="pb-3 font-semibold">Tanggal</th>
                <th className="pb-3 font-semibold">Total</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(bookings.data ?? []).map((b) => (
                <tr key={b._id} className="hover:bg-secondary/40">
                  <td className="py-3.5 font-mono text-xs font-bold">{b.kodeBooking}</td>
                  <td className="py-3.5 font-medium">{(b.tamuId as any)?.nama ?? "-"}</td>
                  <td className="py-3.5 text-muted-foreground">{(b.roomTypeId as any)?.namaTipe ?? "-"}</td>
                  <td className="py-3.5 text-muted-foreground">
                    {String(b.checkIn).slice(0, 10)} → {String(b.checkOut).slice(0, 10)}
                  </td>
                  <td className="py-3.5 font-semibold">{formatRupiah(b.total ?? 0)}</td>
                  <td className="py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor[b.status]}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(b)}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {b.status !== "Dibatalkan" && b.status !== "Check-out" && (
                        <button
                          onClick={() => onCancel(b._id)}
                          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
                          title="Batalkan booking"
                        >
                          Batal
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(b._id)}
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
        <Modal title={editing ? "Edit Booking" : "Tambah Booking"} onClose={() => setOpen(false)}>
          <form onSubmit={onSave} className="space-y-4">
            {editing ? (
              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm">
                <div className="text-xs font-semibold text-muted-foreground">No Booking</div>
                <div className="mt-0.5 font-mono font-bold">{editing.kodeBooking}</div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-muted-foreground">
                No booking akan dibuat otomatis oleh sistem saat booking disimpan.
              </div>
            )}
            <Select
              label="Tamu"
              value={form.tamuId}
              onChange={(v) => setForm({ ...form, tamuId: v })}
              options={guestOptions}
            />
            <Select
              label="Tipe Kamar"
              value={form.roomTypeId}
              onChange={(v) => setForm({ ...form, roomTypeId: v })}
              options={roomTypeOptions}
            />
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-end justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Tanggal Menginap</div>
                  <div className="mt-0.5 text-sm font-semibold">
                    {form.checkIn ? formatDateId(form.checkIn) : "Pilih tanggal"} →{" "}
                    {form.checkOut ? formatDateId(form.checkOut) : "Pilih tanggal"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"
                >
                  Pilih Tanggal
                </button>
              </div>

              {showDatePicker && (
                <div className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="rounded-lg border border-border px-2 py-1 text-xs font-semibold"
                      onClick={() => setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    >
                      Prev
                    </button>
                    <div className="text-xs font-semibold text-muted-foreground">
                      {calMonth.toLocaleString("id-ID", { month: "long", year: "numeric" })}
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-2 py-1 text-xs font-semibold"
                      onClick={() => setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    >
                      Next
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-1 text-[10px]">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                      <div key={d} className="pb-1 text-center font-bold text-muted-foreground">
                        {d}
                      </div>
                    ))}
                    {(() => {
                      const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
                      const startDow = first.getDay();
                      const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                      const cells: Array<number | null> = [];
                      for (let i = 0; i < startDow; i++) cells.push(null);
                      for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                      while (cells.length < 42) cells.push(null);

                      const todayYmd = toYmdLocal(new Date());
                      const start = form.checkIn;
                      const end = form.checkOut;

                      return cells.map((day, idx) => {
                        if (!day) return <div key={idx} className="aspect-square rounded-md" />;
                        const ymd = toYmdLocal(new Date(calMonth.getFullYear(), calMonth.getMonth(), day));
                        const isPast = ymd < todayYmd;
                        const disabled = isPast;
                        const isSelected = Boolean(start && end) && ymd >= start && ymd <= end;
                        const isStart = ymd === start;
                        const isEnd = ymd === end;
                        const base = "bg-secondary/40 text-muted-foreground";
                        const selectedCls = isSelected ? "bg-primary text-primary-foreground" : base;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              // klik pertama = check-in; klik kedua = check-out; klik lagi = mulai ulang.
                              if (!start || (start && end)) {
                                setForm((f) => ({ ...f, checkIn: ymd, checkOut: "" }));
                                return;
                              }
                              if (ymd <= start) {
                                setForm((f) => ({ ...f, checkIn: ymd, checkOut: "" }));
                                return;
                              }
                              setForm((f) => ({ ...f, checkOut: ymd }));
                            }}
                            className={`aspect-square rounded-md border border-border px-0.5 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${selectedCls} ${
                              isStart || isEnd ? "ring-2 ring-primary/30" : ""
                            }`}
                          >
                            {day}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-border py-2 text-sm font-semibold"
                      onClick={() => setForm((f) => ({ ...f, checkIn: "", checkOut: "" }))}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-accent-foreground"
                      onClick={() => {
                        if (!form.checkIn || !form.checkOut) {
                          toast.error("Pilih check-in dan check-out terlebih dahulu");
                          return;
                        }
                        setShowDatePicker(false);
                      }}
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as BookingStatus })}
              options={tabs
                .filter((t) => t.status)
                .map((t) => ({ value: t.status as string, label: t.label }))}
            />
            <Input
              label="Total (Rp)"
              type="number"
              value={form.total}
              onChange={(v) => setForm({ ...form, total: v })}
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
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
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
