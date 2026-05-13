import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ScanLine } from "lucide-react";
import { PageHeader } from "./admin.tipe-kamar";
import { useState } from "react";
import { toast } from "sonner";
import { useBookingByCode, useCheckInBooking, useUpdateBooking } from "@/hooks/useBookings";
import { useRooms } from "@/hooks/useRooms";

export const Route = createFileRoute("/admin/check-in")({
  head: () => ({ meta: [{ title: "Check-in" }] }),
  component: CheckInPage,
});

function CheckInPage() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState("");

  const booking = useBookingByCode(submitted);
  const updateBooking = useUpdateBooking();
  const checkIn = useCheckInBooking();

  const roomTypeId = (booking.data?.roomTypeId as any)?._id;
  const availableRooms = useRooms(roomTypeId ? { roomTypeId, status: "tersedia" } : undefined);
  const [selectedRoomId, setSelectedRoomId] = useState("");

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
      const hasRoom = Boolean((booking.data.roomId as any)?._id);
      if (!hasRoom) {
        if (!selectedRoomId) {
          toast.error("Pilih kamar fisik terlebih dahulu");
          return;
        }
        await updateBooking.mutateAsync({
          id: booking.data._id,
          payload: { roomId: selectedRoomId },
        });
      }

      await checkIn.mutateAsync(booking.data._id);
      toast.success("Check-in berhasil");
      setSubmitted("");
      setCode("");
      setSelectedRoomId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal check-in");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Check-in" desc="Scan QR atau input booking code untuk check-in tamu" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Scan QR Booking</h3>
          <div className="mt-4 flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/40">
            <div className="text-center">
              <ScanLine className="mx-auto h-16 w-16 text-muted-foreground" />
              <div className="mt-3 text-sm font-medium">Arahkan kamera ke QR</div>
              <button className="mt-3 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground">
                Aktifkan Kamera
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Input Booking Code</h3>
          <div className="mt-4">
            <label className="text-sm font-medium">Booking Code</label>
            <input
              placeholder="STY-2026-XXX-0000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm uppercase outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={onCheck}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Cek Booking <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-6 rounded-xl border border-border p-4">
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
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {booking.data.kodeBooking} · {(booking.data.tamuId as any)?.nama ?? "-"}
                  </div>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    Siap Check-in
                  </span>
                </div>
                <div className="mt-2 text-sm font-bold">
                  {(booking.data.roomTypeId as any)?.namaTipe ?? "-"}
                  {(booking.data.roomId as any)?._id && typeof booking.data.roomId === "object"
                    ? ` — Kamar ${(booking.data.roomId as any).nomorKamar}`
                    : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {String(booking.data.checkIn).slice(0, 10)} →{" "}
                  {String(booking.data.checkOut).slice(0, 10)} · {booking.data.dewasa} tamu
                </div>

                {!(booking.data.roomId as any)?._id && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Pilih Kamar Fisik
                    </div>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                    >
                      <option value="">— Pilih —</option>
                      {(availableRooms.data ?? []).map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.nomorKamar} (Lt. {r.lantai})
                        </option>
                      ))}
                    </select>
                    {availableRooms.isLoading && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Memuat kamar tersedia...
                      </div>
                    )}
                    {availableRooms.isError && (
                      <div className="mt-2 text-xs text-destructive">
                        {availableRooms.error instanceof Error
                          ? availableRooms.error.message
                          : "Gagal memuat kamar tersedia"}
                      </div>
                    )}
                    {!availableRooms.isLoading &&
                      !availableRooms.isError &&
                      (availableRooms.data?.length ?? 0) === 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Tidak ada kamar tersedia untuk tipe ini.
                        </div>
                      )}
                  </div>
                )}

                <button
                  onClick={onConfirm}
                  className="mt-4 w-full rounded-xl bg-accent py-2.5 text-xs font-semibold text-accent-foreground"
                >
                  Konfirmasi Check-in
                </button>
              </>
            )}
            {!booking.isLoading && !booking.isError && !booking.data && submitted && (
              <div className="text-sm text-muted-foreground">Booking tidak ditemukan.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
