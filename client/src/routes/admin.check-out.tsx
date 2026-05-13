import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { formatRupiah } from "@/lib/currency";
import { useState } from "react";
import { toast } from "sonner";
import { useBookingByCode, useCheckOutBooking } from "@/hooks/useBookings";
import { ArrowRight } from "lucide-react";
import { useCreateDeposit, useDepositByBooking, useUpdateDeposit } from "@/hooks/useDeposits";

export const Route = createFileRoute("/admin/check-out")({
  head: () => ({ meta: [{ title: "Check-out" }] }),
  component: CheckOut,
});

function CheckOut() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState("");
  const booking = useBookingByCode(submitted);
  const checkOut = useCheckOutBooking();
  const deposit = useDepositByBooking(booking.data?._id);
  const createDeposit = useCreateDeposit();
  const updateDeposit = useUpdateDeposit();

  const [potongan, setPotongan] = useState("0");
  const [catatan, setCatatan] = useState("");

  async function onCheck() {
    if (!code.trim()) {
      toast.error("Booking code wajib diisi");
      return;
    }
    setSubmitted(code.trim());
  }

  async function onConfirm() {
    if (!booking.data) return;
    try {
      const depositDefault = booking.data.roomTypeId?.depositDefault ?? 0;
      const held = deposit.data?.jumlah ?? depositDefault;
      const cut = Number(potongan || "0");
      const refund = Math.max(0, held - (Number.isFinite(cut) ? cut : 0));

      if (!deposit.data) {
        await createDeposit.mutateAsync({
          bookingId: booking.data._id,
          tamuId: booking.data.tamuId?._id ?? "",
          jumlah: held,
          potongan: cut,
          refundJumlah: refund,
          status: cut > 0 ? "Dipakai" : "Dikembalikan",
          catatan,
        });
      } else {
        await updateDeposit.mutateAsync({
          id: deposit.data._id,
          payload: {
            potongan: cut,
            refundJumlah: refund,
            status: cut > 0 ? "Dipakai" : "Dikembalikan",
            catatan,
          },
        });
      }

      await checkOut.mutateAsync(booking.data._id);
      toast.success("Check-out berhasil");
      setSubmitted("");
      setCode("");
      setPotongan("0");
      setCatatan("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal check-out");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Check-out" desc="Selesaikan masa tinggal & deposit" />
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6">
          <label className="text-sm font-medium">Booking Code</label>
          <div className="mt-2 flex gap-2">
            <input
              placeholder="STY-2026-XXX-0000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm uppercase outline-none focus:border-accent"
            />
            <button
              onClick={onCheck}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Cek <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            {booking.isLoading && (
              <div className="text-sm text-muted-foreground">Memuat booking...</div>
            )}
            {booking.isError && (
              <div className="text-sm text-destructive">
                {booking.error instanceof Error ? booking.error.message : "Gagal memuat booking"}
              </div>
            )}
            {!booking.isLoading && !booking.isError && booking.data && (
              <>
                <div className="text-xs text-muted-foreground">
                  {booking.data.kodeBooking} · {booking.data.tamuId?.nama ?? "-"}
                </div>
                <div className="text-lg font-bold">
                  {booking.data.roomTypeId?.namaTipe ?? "-"}
                  {booking.data.roomId?._id && typeof booking.data.roomId === "object"
                    ? ` — Kamar ${booking.data.roomId.nomorKamar}`
                    : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Check-in: {String(booking.data.checkIn).slice(0, 10)} · Check-out:{" "}
                  {String(booking.data.checkOut).slice(0, 10)}
                </div>
              </>
            )}
            {!booking.isLoading && !booking.isError && !booking.data && submitted && (
              <div className="text-sm text-muted-foreground">Booking tidak ditemukan.</div>
            )}

            <div className="mt-5 space-y-3 text-sm">
              <Row label="Subtotal kamar (3 malam)" value={formatRupiah(2550000)} />
              <Row label="Pajak & layanan" value={formatRupiah(255000)} />
              <Row label="Mini bar" value={formatRupiah(85000)} />
              <Row
                label="Deposit ditahan"
                value={formatRupiah(
                  booking.data?.roomTypeId?.depositDefault ?? deposit.data?.jumlah ?? 0,
                )}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border p-5">
            <h4 className="text-sm font-bold">Pengembalian Deposit</h4>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-medium">Potongan deposit (jika ada)</label>
                <input
                  value={potongan}
                  onChange={(e) => setPotongan(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Catatan</label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-bold">Refund Deposit</span>
              <span className="text-lg font-bold text-accent">
                {formatRupiah(
                  Math.max(
                    0,
                    (deposit.data?.jumlah ?? booking.data?.roomTypeId?.depositDefault ?? 0) -
                      Number(potongan || "0"),
                  ),
                )}
              </span>
            </div>
            <button
              onClick={onConfirm}
              disabled={
                !booking.data ||
                checkOut.isPending ||
                createDeposit.isPending ||
                updateDeposit.isPending
              }
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
