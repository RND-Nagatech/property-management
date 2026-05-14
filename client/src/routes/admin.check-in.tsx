import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ScanLine } from "lucide-react";
import { PageHeader } from "./admin.tipe-kamar";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useBookingByCode, useCheckInBooking, useUpdateBooking } from "@/hooks/useBookings";
import { useRooms } from "@/hooks/useRooms";
import { formatRupiah } from "@/lib/currency";

export const Route = createFileRoute("/admin/check-in")({
  head: () => ({ meta: [{ title: "Check-in" }] }),
  component: CheckInPage,
});

function CheckInPage() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanRafRef = useRef<number | null>(null);

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
    setSubmitted(code.trim().toUpperCase());
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

  async function startCamera() {
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Browser tidak mendukung akses kamera");
        setCameraOn(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Tidak bisa mengakses kamera");
      setCameraOn(false);
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    // Attach stream to video after the element is mounted (cameraOn toggles conditional render)
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;
    video.srcObject = stream;
    video
      .play()
      .catch((err) => setCameraError(err instanceof Error ? err.message : "Gagal menyalakan kamera"));
  }, [cameraOn]);

  useEffect(() => {
    // Start QR scan loop using built-in BarcodeDetector when possible
    if (!cameraOn) return;
    const video = videoRef.current;
    if (!video) return;

    const BarcodeDetectorCtor = (globalThis as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setCameraError("Scanner QR tidak didukung di browser ini. Gunakan input nomor booking.");
      return;
    }

    let detector: any;
    try {
      detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
    } catch {
      setCameraError("Scanner QR tidak tersedia. Gunakan input nomor booking.");
      return;
    }

    let lastScanAt = 0;
    const scan = async (ts: number) => {
      scanRafRef.current = requestAnimationFrame(scan);
      if (!video || video.readyState < 2) return;
      if (ts - lastScanAt < 250) return;
      lastScanAt = ts;
      try {
        const codes = await detector.detect(video);
        const raw = codes?.[0]?.rawValue ? String(codes[0].rawValue).trim() : "";
        if (!raw) return;
        const normalized = raw.toUpperCase();
        setCode(normalized);
        setSubmitted(normalized);
        toast.success("QR terdeteksi");
        stopCamera();
      } catch {
        // ignore scan errors
      }
    };
    scanRafRef.current = requestAnimationFrame(scan);

    return () => {
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      if (scanRafRef.current) {
        cancelAnimationFrame(scanRafRef.current);
        scanRafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  return (
    <div className="space-y-6">
      <PageHeader title="Check-in" desc="Scan QR atau input booking code untuk check-in tamu" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Scan QR Booking</h3>
          <div className="mt-4 flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/40">
            {cameraOn ? (
              <div className="relative h-full w-full overflow-hidden rounded-2xl">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/60 px-4 py-2 text-xs font-semibold text-white"
                >
                  Matikan Kamera
                </button>
              </div>
            ) : (
              <div className="text-center">
                <ScanLine className="mx-auto h-16 w-16 text-muted-foreground" />
                <div className="mt-3 text-sm font-medium">Arahkan kamera ke QR</div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
                >
                  Aktifkan Kamera
                </button>
                {cameraError && <div className="mt-3 text-xs text-destructive">{cameraError}</div>}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-base font-bold">Input Nomor Booking</h3>
          <div className="mt-4">
            <label className="text-sm font-medium">Nomor Booking</label>
            <input
              placeholder="BK-260514-001"
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

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total dibayar</span>
                    <span className="font-semibold">{formatRupiah(booking.data.total ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Metode pembayaran</span>
                    <span className="font-semibold">
                      {(booking.data as any)?.payment?.metode ?? "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status pembayaran</span>
                    <span className="font-semibold">
                      {(booking.data as any)?.payment?.status ?? booking.data.paymentStatus ?? "-"}
                    </span>
                  </div>
                  {(booking.data as any)?.payment?.invoice && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Invoice</span>
                      <span className="font-mono font-bold">
                        {(booking.data as any)?.payment?.invoice}
                      </span>
                    </div>
                  )}
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
