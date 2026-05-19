import { createFileRoute } from "@tanstack/react-router";
import { Edit2, Filter, Plus, Trash2, Upload } from "lucide-react";
import { PageHeader } from "./admin.tipe-kamar";
import { Modal, Input } from "./admin.tipe-kamar";
import { formatRupiah } from "@/lib/currency";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useGuests } from "@/hooks/useGuests";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { formatDateId } from "@/lib/dates";
import { diffNights } from "@/lib/dates";
import { useAvailability } from "@/hooks/useAvailability";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { labelEnum } from "@/lib/labels";
import {
  useBookings,
  useAdminCancelBooking,
  useDeleteBooking,
  useUpdateBooking,
  type Booking,
  type BookingStatus,
} from "@/hooks/useBookings";

export const Route = createFileRoute("/admin/booking")({
  head: () => ({ meta: [{ title: "Booking — Admin" }] }),
  component: BookingPage,
});

const tabs: Array<{ label: string; status?: BookingStatus; kind?: "active" }> = [
  { label: "Semua" },
  { label: "Aktif", kind: "active" },
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

function paymentLabel(psRaw: unknown) {
  return labelEnum(psRaw);
}

function paymentClass(label: string) {
  if (label === "Terverifikasi") return "bg-accent/10 text-accent";
  if (label === "Menunggu Verifikasi") return "bg-warning/15 text-warning";
  if (label === "Gagal") return "bg-destructive/10 text-destructive";
  if (label === "Belum Bayar") return "bg-secondary text-muted-foreground";
  return "bg-secondary text-muted-foreground";
}

function formatBookingItemsLabel(b: any) {
  const items = Array.isArray(b?.bookingItems) ? b.bookingItems : [];
  if (items.length) {
    const parts = items.map((it: any) => {
      const rt = it?.roomTypeId && typeof it.roomTypeId === "object" ? it.roomTypeId : null;
      const name = String(it?.roomTypeName ?? rt?.namaTipe ?? "-");
      const q = Math.max(1, Number(it?.quantity ?? 1));
      return `${name} x ${q}`;
    });
    const first = parts[0] ?? "-";
    if (parts.length <= 1) return first;
    return `${first} + ${parts.length - 1} tipe`;
  }
  return (b.roomTypeId as any)?.namaTipe ?? "-";
}

function BookingPage() {
  const [activeTab, setActiveTab] = useState(1); // default: Aktif
  const tab = tabs[activeTab];
  const status = tab?.status;
  const bookings = useBookings(status ? { status } : undefined);
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const cancelBooking = useAdminCancelBooking();
  const qc = useQueryClient();
  const [guestQuery, setGuestQuery] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const guests = useGuests(guestQuery.trim());
  const roomTypes = useRoomTypes(false);

  const createAdminBooking = useMutation({
    mutationFn: (payload: any) =>
      apiRequest<any>("/admin/bookings", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });

  const [proofImage, setProofImage] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    tamuId: "",
    roomTypeId: "",
    checkIn: "",
    checkOut: "",
    status: "Menunggu" as BookingStatus,
    total: "",
    paymentMethod: "cash" as "cash" | "transfer_bank",
    cashAmount: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [totalTouched, setTotalTouched] = useState(false);
  const [hoverDate, setHoverDate] = useState<string>("");

  function toYmdLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const guestOptions = useMemo(
    () =>
      (guests.data ?? []).map((g) => ({
        value: g._id,
        label: `${g.nama} · ${g.hp} · ${g.email}`,
      })),
    [guests.data],
  );
  const roomTypeOptions = useMemo(
    () => (roomTypes.data ?? []).map((rt) => ({ value: rt._id, label: rt.namaTipe })),
    [roomTypes.data],
  );

  function openAdd() {
    setEditing(null);
    setGuestQuery("");
    setGuestOpen(false);
    setTotalTouched(false);
    setProofImage("");
    setForm({
      tamuId: "",
      roomTypeId: roomTypeOptions[0]?.value ?? "",
      checkIn: "",
      checkOut: "",
      status: "Menunggu",
      total: "",
      paymentMethod: "cash",
      cashAmount: "",
    });
    setOpen(true);
  }

  function openEdit(b: Booking) {
    setEditing(b);
    setGuestQuery("");
    setTotalTouched(true);
    setProofImage("");
    setForm({
      tamuId: (b.tamuId as any)?._id ?? "",
      roomTypeId: (b.roomTypeId as any)?._id ?? "",
      checkIn: String(b.checkIn).slice(0, 10),
      checkOut: String(b.checkOut).slice(0, 10),
      status: b.status,
      total: String(b.total ?? ""),
      paymentMethod: "transfer_bank",
      cashAmount: "",
    });
    setOpen(true);
  }

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    return Math.max(0, diffNights(form.checkIn, form.checkOut));
  }, [form.checkIn, form.checkOut]);

  const selectedRoomType = useMemo(() => {
    const rt = (roomTypes.data ?? []).find((x) => x._id === form.roomTypeId);
    return rt ?? null;
  }, [roomTypes.data, form.roomTypeId]);

  const computedTotal = useMemo(() => {
    const price = Number((selectedRoomType as any)?.hargaDefault ?? 0) || 0;
    const n = Math.max(1, nights || 0);
    if (!price) return 0;
    return price * n;
  }, [selectedRoomType, nights]);

  // Keep total & cashAmount default synced (unless admin edits manual total).
  // Transfer flow not changed; cash defaults to computed total.
  useEffect(() => {
    if (!open || editing) return;
    if (!form.roomTypeId || !form.checkIn || !form.checkOut) return;
    if (!totalTouched) {
      const nextTotal = String(computedTotal || 0);
      setForm((f) => {
        const nextCash =
          f.paymentMethod === "cash" ? String(computedTotal || 0) : f.cashAmount;
        if (f.total === nextTotal && f.cashAmount === nextCash) return f;
        return { ...f, total: nextTotal, cashAmount: nextCash };
      });
      return;
    }
    if (form.paymentMethod === "cash" && !form.cashAmount) {
      setForm((f) => ({ ...f, cashAmount: String(Number(f.total || "0") || 0) }));
    }
  }, [
    open,
    editing,
    form.roomTypeId,
    form.checkIn,
    form.checkOut,
    form.paymentMethod,
    form.cashAmount,
    form.total,
    computedTotal,
    totalTouched,
  ]);

  const monthFrom = useMemo(() => {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    return toYmdLocal(d);
  }, [calMonth]);
  const monthTo = useMemo(() => {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    return toYmdLocal(d);
  }, [calMonth]);
  const availability = useAvailability({
    from: monthFrom,
    to: monthTo,
    roomTypeId: form.roomTypeId || undefined,
  });
  const availabilityMap = useMemo(() => {
    const m: Record<string, { status: string; total: number; booked: number; available: number }> = {};
    const data = availability.data && !Array.isArray(availability.data) ? availability.data : null;
    for (const d of data?.days ?? []) {
      m[d.date] = { status: d.status, total: d.total, booked: d.booked, available: d.available };
    }
    return m;
  }, [availability.data]);

  const availabilityLabel = useMemo(() => {
    const ymd = hoverDate || form.checkIn || "";
    if (!ymd) return "";
    const day = availabilityMap[ymd];
    if (!day) return `${formatDateId(ymd)}: Memuat ketersediaan...`;
    if (day.status === "FULL_BOOKED") return `${formatDateId(ymd)}: Penuh`;
    if (day.status === "PARTIAL_BOOKED") return `${formatDateId(ymd)}: Terbatas (Sisa ${day.available} kamar)`;
    if (day.status === "AVAILABLE") return `${formatDateId(ymd)}: Tersedia (${day.available} kamar)`;
    return `${formatDateId(ymd)}: -`;
  }, [availabilityMap, form.checkIn, hoverDate]);

  useEffect(() => {
    if (!open || editing) return;
    if (form.paymentMethod === "cash" || form.paymentMethod === "transfer_bank") {
      setForm((f) => ({ ...f, status: "Dikonfirmasi" }));
    }
  }, [open, editing, form.paymentMethod]);

  function addDaysYmd(ymd: string, days: number) {
    const [y, m, d] = ymd.split("-").map((n) => Number(n));
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    dt.setDate(dt.getDate() + days);
    return toYmdLocal(dt);
  }

  function rangeHasFullBooked(start: string, end: string) {
    if (!start || !end) return "";
    let d = start;
    while (d < end) {
      if (availabilityMap[d]?.status === "FULL_BOOKED") return d;
      d = addDaysYmd(d, 1);
    }
    return "";
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.tamuId || !form.roomTypeId || !form.checkIn || !form.checkOut) {
      toast.error("Tamu, tipe kamar, dan tanggal wajib diisi");
      return;
    }
    const bad = rangeHasFullBooked(form.checkIn, form.checkOut);
    if (bad) {
      toast.error(`Tanggal ${bad} FULL BOOKED, pilih tanggal lain.`);
      return;
    }
    if (form.paymentMethod === "cash") {
      const amount = Number(form.cashAmount || form.total || "0") || 0;
      if (amount <= 0) {
        toast.error("Nominal pembayaran cash wajib diisi");
        return;
      }
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
        payment:
          form.paymentMethod === "cash"
            ? {
                metode: "cash",
                jumlah: Number(form.cashAmount || form.total || "0") || 0,
              }
            : form.paymentMethod === "transfer_bank"
              ? {
                  metode: "transfer_bank",
                  jumlah: Number(form.total || "0") || 0,
                  ...(proofImage ? { proofImage } : {}),
                }
              : undefined,
      };
      if (editing) {
        await updateBooking.mutateAsync({ id: editing._id, payload });
        toast.success("Booking diperbarui");
      } else {
        await createAdminBooking.mutateAsync(payload);
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

  const visibleBookings = useMemo(() => {
    const data = bookings.data ?? [];
    if (tab?.kind !== "active") return data;
    return data.filter((b) => {
      const legacy = String((b as any).status ?? "");
      const bs = String((b as any).bookingStatus ?? "");
      if (legacy === "Check-out" || legacy === "Dibatalkan") return false;
      if (bs === "checked_out" || bs === "cancelled") return false;
      return true;
    });
  }, [bookings.data, tab?.kind]);

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
        {!bookings.isLoading && !bookings.isError && visibleBookings.length === 0 && (
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
	                <th className="pb-3 font-semibold">Payment</th>
	                <th className="pb-3 font-semibold">Status</th>
	                <th className="pb-3 font-semibold text-right">Aksi</th>
	              </tr>
	            </thead>
	            <tbody className="divide-y divide-border">
		              {visibleBookings.map((b) => (
		                <tr key={b._id} className="hover:bg-secondary/40">
                  <td className="py-3.5 font-mono text-xs font-bold">{b.kodeBooking}</td>
                  <td className="py-3.5 font-medium">{(b.tamuId as any)?.nama ?? "-"}</td>
	                  <td className="py-3.5 text-muted-foreground">{formatBookingItemsLabel(b)}</td>
	                  <td className="py-3.5 text-muted-foreground">
	                    {String(b.checkIn).slice(0, 10)} → {String(b.checkOut).slice(0, 10)}
	                  </td>
	                  <td className="py-3.5 font-semibold">{formatRupiah(b.total ?? 0)}</td>
	                  <td className="py-3.5">
	                    {(() => {
	                      const lbl = paymentLabel((b as any).paymentStatus);
	                      return (
	                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentClass(lbl)}`}>
	                          {lbl}
	                        </span>
	                      );
	                    })()}
	                  </td>
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
            <GuestCombobox
              label="Tamu"
              value={form.tamuId}
              open={guestOpen}
              query={guestQuery}
              options={guestOptions}
              loading={guests.isLoading}
              error={guests.isError ? (guests.error instanceof Error ? guests.error.message : "Gagal memuat tamu") : ""}
              onOpenChange={(v) => setGuestOpen(v)}
              onQueryChange={(q) => setGuestQuery(q)}
              onChange={(v) => setForm({ ...form, tamuId: v })}
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
                        const isFullBooked = availabilityMap[ymd]?.status === "FULL_BOOKED";
                        const disabled = isPast || isFullBooked;
                        const isSelected = Boolean(start && end) && ymd >= start && ymd <= end;
                        const isStart = ymd === start;
                        const isEnd = ymd === end;
                        const st = availabilityMap[ymd]?.status;
                        const base =
                          st === "FULL_BOOKED"
                            ? "bg-destructive/10 text-destructive"
                            : st === "PARTIAL_BOOKED"
                              ? "bg-warning/15 text-warning"
                              : st === "AVAILABLE"
                                ? "bg-success/15 text-success"
                                : "bg-secondary/40 text-muted-foreground";
                        const selectedCls = isSelected ? "bg-primary text-primary-foreground" : base;

	                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={disabled}
                            onMouseEnter={() => setHoverDate(ymd)}
                            onMouseLeave={() => setHoverDate("")}
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
	                              const bad = rangeHasFullBooked(start, ymd);
	                              if (bad) {
	                                toast.error(`Range melewati tanggal FULL BOOKED (${bad}).`);
	                                return;
	                              }
	                              setForm((f) => ({ ...f, checkOut: ymd }));
                            }}
	                            className={`aspect-square rounded-md border border-border px-0.5 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${selectedCls} ${
	                              isStart || isEnd ? "ring-2 ring-primary/30" : ""
	                            }`}
                            title={
                              isFullBooked
                                ? "Penuh"
                                : availabilityMap[ymd]
                                  ? `${availabilityMap[ymd].booked} dipesan, ${availabilityMap[ymd].available} tersedia`
                                  : ""
                            }
                          >
                            {day}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {form.roomTypeId && availability.isFetching && (
                    <div className="mt-2 text-xs text-muted-foreground">Memuat availability...</div>
                  )}

                  {availabilityLabel && (
                    <div className="mt-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                      {availabilityLabel}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded bg-success/30 ring-1 ring-success/40" />{" "}
                      Tersedia
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded bg-warning/30 ring-1 ring-warning/40" />{" "}
                      Terbatas
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded bg-destructive/25 ring-1 ring-destructive/30" />{" "}
                      Penuh
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded bg-primary ring-1 ring-primary/40" />{" "}
                      Dipilih
                    </span>
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
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs font-semibold text-muted-foreground">Pembayaran</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Metode
                  </span>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => {
                      const m = e.target.value as any;
                      setForm((f) => ({
                        ...f,
                        paymentMethod: m,
                        cashAmount:
                          m === "cash"
                            ? String(Number(f.total || "0") || computedTotal || 0)
                            : f.cashAmount,
                      }));
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                  >
                    <option value="cash">Cash</option>
                    <option value="transfer_bank">Transfer Bank</option>
                  </select>
                </label>
                {form.paymentMethod === "cash" ? (
                  <CurrencyInput
                    label="Nominal bayar"
                    valueDigits={String(form.cashAmount ?? "").replace(/[^\d]/g, "")}
                    onChangeDigits={(digits) => setForm((f) => ({ ...f, cashAmount: digits }))}
                    placeholder="Rp 0"
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-muted-foreground">
                    Transfer bank: upload bukti → masuk menu Pembayaran untuk diverifikasi.
                  </div>
                )}
              </div>

              {form.paymentMethod === "transfer_bank" && (
                <div className="mt-3 rounded-xl border border-border p-3">
                  <div className="text-xs font-semibold text-muted-foreground">Upload Bukti Pembayaran</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Transfer bank dari admin akan dicatat langsung lunas. Bukti ini hanya lampiran (opsional).
                  </div>
                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 p-6 hover:border-accent">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <div className="mt-2 text-sm font-medium">Klik untuk upload bukti transfer (opsional)</div>
                    <div className="text-xs text-muted-foreground">JPG/PNG</div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setProofImage(String(reader.result ?? ""));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {proofImage && (
                    <img
                      src={proofImage}
                      alt="Bukti transfer"
                      className="mt-3 max-h-56 w-full rounded-xl border border-border object-contain"
                    />
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    Bukti akan tersimpan pada data pembayaran saat booking disimpan.
                  </div>
                </div>
              )}
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Status</span>
              <select
                value={form.status}
                disabled={!editing && (form.paymentMethod === "cash" || form.paymentMethod === "transfer_bank")}
                onChange={(e) => setForm({ ...form, status: e.target.value as BookingStatus })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-70"
              >
                {tabs
                  .filter((t) => t.status)
                  .map((t) => (
                    <option key={t.status} value={t.status as string}>
                      {t.label}
                    </option>
                  ))}
              </select>
              {!editing && (form.paymentMethod === "cash" || form.paymentMethod === "transfer_bank") && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Booking admin otomatis langsung dikonfirmasi.
                </div>
              )}
            </label>
            <CurrencyInput
              label="Total"
              valueDigits={String(form.total ?? "").replace(/[^\d]/g, "")}
              onChangeDigits={(digits) => {
                setTotalTouched(true);
                setForm({ ...form, total: digits });
              }}
              placeholder="Rp 0"
            />
            {!totalTouched && computedTotal > 0 && (
              <div className="text-xs text-muted-foreground">
                Total otomatis: {formatRupiah(computedTotal)} ({Math.max(1, nights || 0)} malam ×{" "}
                {formatRupiah(Number((selectedRoomType as any)?.hargaDefault ?? 0) || 0)})
              </div>
            )}
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

function GuestCombobox({
  label,
  value,
  open,
  query,
  options,
  loading,
  error,
  onOpenChange,
  onQueryChange,
  onChange,
}: {
  label: string;
  value: string;
  open: boolean;
  query: string;
  options: readonly { label: string; value: string }[];
  loading: boolean;
  error: string;
  onOpenChange: (v: boolean) => void;
  onQueryChange: (q: string) => void;
  onChange: (v: string) => void;
}) {
  const selected = options.find((o) => o.value === value)?.label ?? "";
  return (
    <div className="relative">
      <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm outline-none focus:border-accent"
      >
        {selected || "— Pilih tamu —"}
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-border bg-background p-3 shadow-[var(--shadow-elevated)]">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari nama / no HP / email..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          {loading && <div className="mt-2 text-xs text-muted-foreground">Memuat tamu...</div>}
          {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
          <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-border">
            {options.length === 0 && !loading ? (
              <div className="p-3 text-xs text-muted-foreground">Tidak ada tamu.</div>
            ) : (
              options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    onOpenChange(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-secondary/40 ${
                    o.value === value ? "bg-secondary/40 font-semibold" : ""
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
