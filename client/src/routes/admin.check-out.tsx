import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { formatRupiah } from "@/lib/currency";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCheckOutBooking, useCheckoutSearch } from "@/hooks/useBookings";
import { ArrowRight } from "lucide-react";
import { diffNights } from "@/lib/dates";
import { useCreateDeposit, useDepositByBooking, useUpdateDeposit } from "@/hooks/useDeposits";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { labelEnum } from "@/lib/labels";

export const Route = createFileRoute("/admin/check-out")({
  head: () => ({ meta: [{ title: "Check-out" }] }),
  component: CheckOut,
});

function CheckOut() {
  const [bookingCode, setBookingCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitted, setSubmitted] = useState<{
    bookingCode?: string;
    roomNumber?: string;
    guestName?: string;
    guestPhone?: string;
  } | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const search = useCheckoutSearch(submitted ?? {});
  const checkOut = useCheckOutBooking();
  const deposit = useDepositByBooking(selected?._id);
  const createDeposit = useCreateDeposit();
  const updateDeposit = useUpdateDeposit();

  const [returnStatus, setReturnStatus] = useState<
    "PENDING" | "RETURNED" | "PARTIALLY_DEDUCTED" | "NOT_RETURNED"
  >("RETURNED");
  const [deductedAmount, setDeductedAmount] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [charges, setCharges] = useState<Array<{ kategori: string; nominalDigits: string; keterangan: string }>>([
    { kategori: "", nominalDigits: "", keterangan: "" },
  ]);

  const results = search.data ?? [];
  const chargeTotal = charges.reduce((acc, c) => {
    const n = Number(String(c.nominalDigits ?? "").replace(/[^\d]/g, "") || "0") || 0;
    return acc + n;
  }, 0);
  const cashDepositSummary = (() => {
    const dep: any = deposit.data;
    const depType = (dep?.type as any) || (Number(dep?.jumlah ?? 0) > 0 ? "CASH" : "NONE");
    const baseAmount = Number(dep?.amount ?? dep?.jumlah ?? 0) || 0;
    if (!selected?._id || depType !== "CASH" || baseAmount <= 0) return null;

    const maxDeductable = Math.min(baseAmount, chargeTotal);
    const inputDeduct = Number(deductedAmount || "0") || 0;

    if (returnStatus === "RETURNED") {
      return {
        depositAmount: baseAmount,
        depositDeducted: 0,
        depositReturned: baseAmount,
        remainingChargeToPay: chargeTotal,
      };
    }
    if (returnStatus === "NOT_RETURNED") {
      const depositDeducted = maxDeductable;
      return {
        depositAmount: baseAmount,
        depositDeducted,
        depositReturned: Math.max(0, baseAmount - depositDeducted),
        remainingChargeToPay: Math.max(0, chargeTotal - depositDeducted),
      };
    }
    // PARTIALLY_DEDUCTED
    const depositDeducted = Math.min(maxDeductable, Math.max(0, inputDeduct));
    return {
      depositAmount: baseAmount,
      depositDeducted,
      depositReturned: Math.max(0, baseAmount - depositDeducted),
      remainingChargeToPay: Math.max(0, chargeTotal - depositDeducted),
    };
  })();

  function normalizeBookingItems(b: any) {
    const items = Array.isArray(b?.bookingItems) ? b.bookingItems : [];
    if (items.length) return items;
    return [
      {
        roomTypeId: b?.roomTypeId,
        roomTypeName: (b?.roomTypeId as any)?.namaTipe,
        quantity: 1,
        assignedRoomIds: b?.roomId ? [b.roomId] : [],
      },
    ];
  }

  function occupiedRooms(b: any) {
    const items = normalizeBookingItems(b);
    const rooms: Array<{ nomorKamar: string; typeName: string }> = [];
    for (const it of items) {
      const rt = it?.roomTypeId && typeof it.roomTypeId === "object" ? it.roomTypeId : null;
      const typeName = String(it?.roomTypeName ?? rt?.namaTipe ?? "-");
      const assigned = Array.isArray(it?.assignedRoomIds) ? it.assignedRoomIds : [];
      for (const r of assigned) {
        const nomorKamar = typeof r === "object" ? String(r?.nomorKamar ?? "-") : String(r ?? "-");
        rooms.push({ nomorKamar, typeName });
      }
    }
    return rooms;
  }

  function roomSummary(b: any) {
    const rooms = occupiedRooms(b);
    if (!rooms.length) {
      return (b?.roomId as any)?.nomorKamar ?? "-";
    }
    const uniq = Array.from(new Set(rooms.map((r) => r.nomorKamar))).filter(Boolean);
    const shown = uniq.slice(0, 3).join(", ");
    const more = uniq.length > 3 ? ` +${uniq.length - 3}` : "";
    return `${shown}${more}`;
  }

  useEffect(() => {
    if (!submitted) return;
    if (results.length === 1) {
      setSelected(results[0]);
    } else if (results.length === 0) {
      setSelected(null);
    }
  }, [results, submitted]);

  useEffect(() => {
    const d: any = deposit.data;
    if (!selected?._id) return;
    if (!d) {
      setReturnStatus("RETURNED");
      setDeductedAmount("");
      setReturnNote("");
      return;
    }
    const rs = (d.returnStatus as any) || (d.status === "Dikembalikan" ? "RETURNED" : d.status === "Dipakai" ? "PARTIALLY_DEDUCTED" : "PENDING");
    setReturnStatus(rs);
    setDeductedAmount(String(d.deductedAmount ?? d.potongan ?? ""));
    setReturnNote(String(d.returnNote ?? d.catatan ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id, deposit.data?._id]);

  async function onCheck() {
    const payload = {
      bookingCode: bookingCode.trim() || undefined,
      roomNumber: roomNumber.trim() || undefined,
      guestName: guestName.trim() || undefined,
      guestPhone: guestPhone.trim() || undefined,
    };
    if (!payload.bookingCode && !payload.roomNumber && !payload.guestName && !payload.guestPhone) {
      toast.error("Isi minimal salah satu kolom pencarian");
      return;
    }
    setSelected(null);
    setSubmitted(payload);
  }

  async function onConfirm() {
    if (!selected) return;
    try {
      const tamuId =
        (selected.tamuId && typeof selected.tamuId === "object" ? selected.tamuId._id : selected.tamuId) ||
        (selected.customerId && typeof selected.customerId === "object"
          ? selected.customerId._id
          : selected.customerId) ||
        "";

      // Settle deposit at checkout (cash can be returned/deducted; documents can be marked returned).
      const dep: any = deposit.data;
      const depType = (dep?.type as any) || (Number(dep?.jumlah ?? 0) > 0 ? "CASH" : "NONE");
      const baseAmount = Number(dep?.amount ?? dep?.jumlah ?? 0) || 0;
      const deductedNum = Number(deductedAmount || "0") || 0;
      const finalReturnStatus =
        depType === "CASH"
          ? returnStatus
          : returnStatus === "NOT_RETURNED"
            ? "NOT_RETURNED"
            : "RETURNED";
      let returnedAmount = 0;
      let deductedFinal = 0;

      const chargePayload = charges
        .map((c) => ({
          kategori: String(c.kategori ?? "").trim(),
          nominal: Number(String(c.nominalDigits ?? "").replace(/[^\d]/g, "") || "0") || 0,
          keterangan: String(c.keterangan ?? "").trim(),
        }))
        .filter((c) => c.kategori && c.nominal > 0);

      const chargeTotal = chargePayload.reduce((acc, c) => acc + (Number(c.nominal ?? 0) || 0), 0);

      if (depType === "CASH") {
        const maxDeductable = Math.min(baseAmount, chargeTotal);

        if (finalReturnStatus === "RETURNED") {
          returnedAmount = baseAmount;
          deductedFinal = 0;
        } else if (finalReturnStatus === "NOT_RETURNED") {
          if (chargeTotal <= 0) {
            toast.error("Tidak ada charge untuk dipotong dari deposit");
            return;
          }
          // Deposit boleh dipakai sampai habis, tapi tidak boleh melebihi total charge.
          deductedFinal = maxDeductable;
          returnedAmount = Math.max(0, baseAmount - deductedFinal);
          if (returnedAmount > 0) {
            toast.error("Total charge lebih kecil dari deposit. Pilih 'Potong sebagian' agar sisa deposit bisa dikembalikan.");
            return;
          }
        } else if (finalReturnStatus === "PARTIALLY_DEDUCTED") {
          if (chargeTotal <= 0) {
            toast.error("Tidak ada charge untuk dipotong dari deposit");
            return;
          }
          if (deductedNum <= 0 || deductedNum > baseAmount) {
            toast.error("Potongan harus di antara 1 dan maksimal nominal deposit");
            return;
          }
          if (deductedNum > chargeTotal) {
            toast.error("Potongan tidak boleh melebihi total charge");
            return;
          }
          deductedFinal = deductedNum;
          returnedAmount = Math.max(0, baseAmount - deductedFinal);
        }
      }

      if (depType !== "NONE") {
        const legacyStatus =
          finalReturnStatus === "RETURNED"
            ? "Dikembalikan"
            : finalReturnStatus === "PENDING"
              ? "Ditahan"
            : "Dipakai";
        const depositPayload: any = {
          bookingId: selected._id,
          tamuId,
          jumlah: depType === "CASH" ? baseAmount : 0,
          status: legacyStatus,
          potongan: depType === "CASH" ? deductedFinal : 0,
          refundJumlah: depType === "CASH" ? returnedAmount : 0,
          catatan: returnNote || "",
          type: depType,
          amount: depType === "CASH" ? baseAmount : 0,
          returnStatus: finalReturnStatus,
          returnedAmount,
          deductedAmount: deductedFinal,
          returnNote: returnNote || "",
          returnedAt: new Date().toISOString(),
        };
        if (dep?._id) {
          await updateDeposit.mutateAsync({ id: dep._id, payload: depositPayload });
        } else {
          await createDeposit.mutateAsync(depositPayload);
        }
      }

      await checkOut.mutateAsync({
        id: selected._id,
        payload: {
          bookingId: selected._id,
          tamuId,
          charges: chargePayload,
          depositSettlement: {
            type: depType,
            deductedAmount: deductedFinal,
            returnedAmount,
            returnStatus: finalReturnStatus,
          },
        },
      });
      toast.success("Check-out berhasil");
      setSubmitted(null);
      setBookingCode("");
      setRoomNumber("");
      setGuestName("");
      setGuestPhone("");
      setSelected(null);
      setCharges([{ kategori: "", nominalDigits: "", keterangan: "" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal check-out");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Check-out" desc="Selesaikan masa tinggal & deposit" />
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nomor Booking</label>
            <input
              placeholder="STY-2026-XXX-0000"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm uppercase outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nomor Kamar</label>
            <input
              placeholder="101"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nama Tamu</label>
            <input
              placeholder="Nama tamu"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium">No. HP</label>
            <input
              placeholder="08xxxxxxxxxx"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="md:col-span-2">
            <button
              onClick={onCheck}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Cari Booking <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            {search.isLoading && (
              <div className="text-sm text-muted-foreground">Memuat booking...</div>
            )}
            {search.isError && (
              <div className="text-sm text-destructive">
                {search.error instanceof Error ? search.error.message : "Gagal memuat booking"}
              </div>
            )}
            {!search.isLoading && !search.isError && results.length > 1 && !selected && (
              <div className="space-y-2">
                {results.map((b) => (
                  <div key={b._id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {b.kodeBooking} · {roomSummary(b)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(b.guestSnapshot?.namaLengkap ??
                          (b.customerId as any)?.namaLengkap ??
                          (b.tamuId as any)?.nama) ||
                          "-"}
                      </div>
                    </div>
                    <button
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                      onClick={() => setSelected(b)}
                    >
                      Pilih
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!search.isLoading && !search.isError && selected && (
              <>
                <div className="text-xs text-muted-foreground">
                  {selected.kodeBooking} · {(selected.tamuId as any)?.nama ?? "-"}
                </div>
                <div className="text-lg font-bold">{labelEnum(selected.bookingStatus ?? selected.status)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Check-in: {String(selected.checkIn).slice(0, 10)} · Check-out: {" "}
                  {String(selected.checkOut).slice(0, 10)}
                </div>

                <div className="mt-4 rounded-xl border border-border p-3 text-sm">
                  <div className="text-sm font-bold">Kamar yang Ditempati</div>
                  {(() => {
                    const rooms = occupiedRooms(selected);
                    const hasItems = Array.isArray((selected as any).bookingItems) && (selected as any).bookingItems.length;
                    if (rooms.length) {
                      return (
                        <div className="mt-2 space-y-2">
                          {rooms.map((r, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="font-semibold">{r.nomorKamar}</div>
                              <div className="text-xs text-muted-foreground">Type: {r.typeName}</div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    if (hasItems) {
                      return (
                        <div className="mt-2 text-xs text-warning">
                          Unit kamar belum tercatat. Pastikan booking sudah check-in.
                        </div>
                      );
                    }
                    return <div className="mt-2 text-xs text-muted-foreground">Unit kamar tidak tersedia.</div>;
                  })()}
                </div>
              </>
            )}
            {!search.isLoading && !search.isError && results.length === 0 && submitted && (
              <div className="text-sm text-muted-foreground">Booking aktif tidak ditemukan.</div>
            )}

            <div className="mt-5 space-y-3 text-sm">
              <Row
                label={`Subtotal kamar (${selected ? diffNights(String(selected.checkIn).slice(0, 10), String(selected.checkOut).slice(0, 10)) : 0} malam)`}
                value={formatRupiah(
                  selected
                    ? (diffNights(String(selected.checkIn).slice(0, 10), String(selected.checkOut).slice(0, 10)) *
                        Number((selected.roomTypeId as any)?.hargaDefault ?? 0))
                    : 0,
                )}
              />
              <Row
                label="Total"
                value={formatRupiah(selected?.total ?? 0)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border p-5">
            <div className="text-sm font-bold">Deposit</div>
            <div className="mt-3 rounded-xl border border-border p-3 text-sm">
              {!selected ? (
                <div className="text-muted-foreground">Pilih booking untuk melihat deposit.</div>
              ) : deposit.isLoading ? (
                <div className="text-muted-foreground">Memuat deposit...</div>
              ) : deposit.isError ? (
                <div className="text-destructive">
                  {deposit.error instanceof Error ? deposit.error.message : "Gagal memuat deposit"}
                </div>
              ) : deposit.data ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jenis</span>
                    <span className="font-semibold">{(deposit.data as any).type || "CASH"}</span>
                  </div>
                  {(deposit.data as any).type && (deposit.data as any).type !== "CASH" && (deposit.data as any).type !== "NONE" && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(deposit.data as any).identityName && (
                        <div>Nama: {(deposit.data as any).identityName}</div>
                      )}
                      {(deposit.data as any).identityNumber && (
                        <div>NIK: {(deposit.data as any).identityNumber}</div>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Nominal</span>
                    <span className="font-semibold">
                      {formatRupiah(Number((deposit.data as any).amount ?? (deposit.data as any).jumlah ?? 0) || 0)}
                    </span>
                  </div>

                  {(deposit.data as any).type === "CASH" && (
                    <div className="mt-3 space-y-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Status pengembalian
                        </span>
                        <select
                          value={returnStatus}
                          onChange={(e) => setReturnStatus(e.target.value as any)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                        >
                          <option value="RETURNED">Dikembalikan penuh</option>
                          <option value="PARTIALLY_DEDUCTED">Dipakai sebagian (potongan)</option>
                          <option value="NOT_RETURNED">Tidak dikembalikan</option>
                        </select>
                      </label>
                      {returnStatus === "PARTIALLY_DEDUCTED" && (
                        <CurrencyInput
                          label="Potongan"
                          valueDigits={String(deductedAmount ?? "").replace(/[^\d]/g, "")}
                          onChangeDigits={(digits) => setDeductedAmount(digits)}
                          placeholder="Rp 50.000"
                        />
                      )}
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Catatan
                        </span>
                        <textarea
                          rows={2}
                          value={returnNote}
                          onChange={(e) => setReturnNote(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                          placeholder="Catatan potongan/pengembalian (opsional)"
                        />
                      </label>
                    </div>
                  )}

                  {(deposit.data as any).type && (deposit.data as any).type !== "CASH" && (deposit.data as any).type !== "NONE" && (
                    <div className="mt-3 space-y-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Status pengembalian dokumen
                        </span>
                        <select
                          value={returnStatus === "NOT_RETURNED" ? "NOT_RETURNED" : "RETURNED"}
                          onChange={(e) => setReturnStatus(e.target.value as any)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                        >
                          <option value="RETURNED">Sudah dikembalikan</option>
                          <option value="NOT_RETURNED">Belum dikembalikan</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Catatan
                        </span>
                        <textarea
                          rows={2}
                          value={returnNote}
                          onChange={(e) => setReturnNote(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                          placeholder="Catatan deposit (opsional)"
                        />
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Tidak ada deposit tercatat.</div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold">Charge Tambahan</div>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    setCharges((prev) => [...prev, { kategori: "", nominalDigits: "", keterangan: "" }])
                  }
                >
                  Tambah
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {charges.map((c, idx) => (
                  <div key={idx} className="grid gap-2 md:grid-cols-[1.2fr_0.8fr_1fr_auto]">
                    <input
                      value={c.kategori}
                      onChange={(e) =>
                        setCharges((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, kategori: e.target.value } : x))
                        )
                      }
                      placeholder="Kategori (Kerusakan, Late checkout, dll)"
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
                    />
                    <CurrencyInput
                      label="Nominal"
                      valueDigits={c.nominalDigits}
                      onChangeDigits={(digits) =>
                        setCharges((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, nominalDigits: digits } : x))
                        )
                      }
                      placeholder="Rp 50.000"
                    />
                    <input
                      value={c.keterangan}
                      onChange={(e) =>
                        setCharges((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, keterangan: e.target.value } : x))
                        )
                      }
                      placeholder="Keterangan (opsional)"
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      className="rounded-xl border border-border px-3 py-3 text-xs font-semibold hover:text-destructive"
                      onClick={() =>
                        setCharges((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
                      }
                      title="Hapus"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm font-semibold">
                Total charge: {formatRupiah(chargeTotal)}
              </div>
              {cashDepositSummary && (
                <div className="mt-3 rounded-xl border border-border p-3 text-sm">
                  <div className="text-sm font-bold">Ringkasan Potong Deposit</div>
                  <div className="mt-2 space-y-1">
                    <Row label="Deposit" value={formatRupiah(cashDepositSummary.depositAmount)} />
                    <Row label="Dipakai untuk charge" value={formatRupiah(cashDepositSummary.depositDeducted)} />
                    <Row label="Dikembalikan" value={formatRupiah(cashDepositSummary.depositReturned)} />
                    <Row label="Sisa bayar tamu" value={formatRupiah(cashDepositSummary.remainingChargeToPay)} />
                  </div>
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                Jika charge dipotong dari deposit cash, isi nominal potongan di bagian Deposit (Potongan).
              </div>
            </div>

            <button
              onClick={onConfirm}
              disabled={!selected || checkOut.isPending}
              className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Selesaikan Check-out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
