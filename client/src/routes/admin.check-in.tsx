import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ScanLine } from "lucide-react";
import { PageHeader } from "./admin.tipe-kamar";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useBookingByCode, useCheckInBooking } from "@/hooks/useBookings";
import { formatRupiah } from "@/lib/currency";
import { useCreateDeposit, useDepositByBooking, useUpdateDeposit } from "@/hooks/useDeposits";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { labelEnum } from "@/lib/labels";
import { diffNights } from "@/lib/dates";

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
  const checkIn = useCheckInBooking();
  const deposit = useDepositByBooking(booking.data?._id);
  const createDeposit = useCreateDeposit();
  const updateDeposit = useUpdateDeposit();

  const [depositType, setDepositType] = useState<"NONE" | "CASH" | "KTP" | "SIM" | "PASSPORT">(
    "NONE"
  );
  const [depositAmount, setDepositAmount] = useState("");
  const [identityName, setIdentityName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [depositNote, setDepositNote] = useState("");

  const bookingEligibility = (() => {
    const b: any = booking.data;
    if (!b) return { can: false, reason: "" };
    const bookingStatusRaw = String(b.bookingStatus ?? b.status ?? "").toLowerCase();
    const paymentStatusRaw = String((b.payment?.status ?? b.paymentStatus ?? "") as any).toLowerCase();
    if (bookingStatusRaw === "cancelled" || bookingStatusRaw === "cancelled_by_customer" || bookingStatusRaw === "dibatalkan") {
      return { can: false, reason: "Booking sudah dibatalkan" };
    }
    if (bookingStatusRaw === "checked_in" || bookingStatusRaw === "check-in") {
      return { can: false, reason: "Booking sudah check-in" };
    }
    if (bookingStatusRaw === "checked_out" || bookingStatusRaw === "check-out") {
      return { can: false, reason: "Booking sudah check-out" };
    }
    // Backend guard: paymentStatus must be paid and bookingStatus must be confirmed.
    if (!(paymentStatusRaw === "paid" && bookingStatusRaw === "confirmed")) {
      return { can: false, reason: "Booking belum terkonfirmasi pembayaran" };
    }
    return { can: true, reason: "" };
  })();

  useEffect(() => {
    if (!booking.data?._id) return;
    const d = deposit.data;
    if (d) {
      setDepositType((d.type as any) ?? (Number(d.jumlah ?? 0) > 0 ? "CASH" : "NONE"));
      setDepositAmount(String(d.amount ?? d.jumlah ?? ""));
      setIdentityName(String(d.identityName ?? ""));
      setIdentityNumber(String(d.identityNumber ?? ""));
      setDepositNote(String(d.note ?? d.catatan ?? ""));
    } else {
      setDepositType("NONE");
      setDepositAmount("");
      setIdentityName("");
      setIdentityNumber("");
      setDepositNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.data?._id, deposit.data?._id]);

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
      // Record actual deposit at check-in (policy only lives in room type).
      const amountNum = Number(depositAmount || "0") || 0;
      if (depositType === "CASH" && amountNum <= 0) {
        toast.error("Nominal deposit wajib diisi untuk deposit uang tunai");
        return;
      }
      const depositPayload: any = {
        bookingId: booking.data._id,
        jumlah: depositType === "CASH" ? amountNum : 0,
        status: "Ditahan",
        catatan: depositNote || "",
        type: depositType,
        amount: depositType === "CASH" ? amountNum : 0,
        identityName: identityName || "",
        identityNumber: identityNumber || "",
        note: depositNote || "",
        receivedAt: new Date().toISOString(),
        returnStatus: "PENDING",
      };
      if (deposit.data?._id) {
        await updateDeposit.mutateAsync({ id: deposit.data._id, payload: depositPayload });
      } else if (depositType !== "NONE") {
        await createDeposit.mutateAsync(depositPayload);
      }

      await checkIn.mutateAsync(booking.data._id);
      toast.success("Check-in berhasil");
      // keep submitted code so UI can show auto-assigned rooms after check-in
      setCode(booking.data.kodeBooking ?? code);
      setDepositType("NONE");
      setDepositAmount("");
      setIdentityName("");
      setIdentityNumber("");
      setDepositNote("");
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
                    {booking.data.kodeBooking} ·{" "}
                    {booking.data.guestSnapshot?.namaLengkap ??
                      ((booking.data.customerId as any)?.namaLengkap ?? (booking.data.tamuId as any)?.nama ?? "-")}
                  </div>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {labelEnum((booking.data as any).bookingStatus ?? booking.data.status)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {String(booking.data.checkIn).slice(0, 10)} → {String(booking.data.checkOut).slice(0, 10)} ·{" "}
                  {diffNights(String(booking.data.checkIn).slice(0, 10), String(booking.data.checkOut).slice(0, 10))}{" "}
                  malam
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
                      {labelEnum((booking.data as any)?.payment?.status ?? booking.data.paymentStatus ?? "-")}
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

              <div className="mt-4 rounded-xl border border-border p-3">
                <div className="text-xs font-semibold text-muted-foreground">Detail Kamar Dipesan</div>
                <div className="mt-2 space-y-2">
                  {(() => {
                    const b: any = booking.data;
                    const nights = diffNights(String(b.checkIn).slice(0, 10), String(b.checkOut).slice(0, 10));
                    const items = Array.isArray(b.bookingItems) && b.bookingItems.length
                      ? b.bookingItems
                      : [
                          {
                            roomTypeId: b.roomTypeId,
                            roomTypeName: (b.roomTypeId as any)?.namaTipe,
                            quantity: 1,
                            pricePerNight: (b.roomTypeId as any)?.hargaDefault ?? 0,
                            totalNights: nights,
                            subtotal: b.total ?? 0,
                            assignedRoomIds: b.roomId ? [b.roomId] : [],
                          },
                        ];
                    return items.map((it: any, idx: number) => {
                      const rt = it.roomTypeId && typeof it.roomTypeId === "object" ? it.roomTypeId : null;
                      const name = String(it.roomTypeName ?? rt?.namaTipe ?? "-");
                      const qty = Math.max(1, Number(it.quantity ?? 1));
                      const ppn = Number(it.pricePerNight ?? rt?.hargaDefault ?? 0) || 0;
                      const tn = Math.max(1, Number(it.totalNights ?? nights));
                      const sub = Number(it.subtotal ?? (ppn * tn * qty)) || 0;
                      const assigned = Array.isArray(it.assignedRoomIds) ? it.assignedRoomIds : [];
                      return (
                        <div key={idx} className="rounded-xl border border-border bg-secondary/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold">
                              {name} x {qty}
                            </div>
                            <div className="text-xs font-semibold">{formatRupiah(sub)}</div>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Harga/malam: {formatRupiah(ppn)}
                          </div>
                          <div className="mt-2 text-[11px]">
                            <span className="text-muted-foreground">Unit kamar: </span>
                            {assigned.length ? (
                              <span className="font-semibold">
                                {assigned
                                  .map((r: any) => (typeof r === "object" ? r.nomorKamar : String(r)))
                                  .join(", ")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Akan dipilih otomatis saat check-in</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border p-3">
                <div className="text-xs font-semibold text-muted-foreground">Deposit saat Check-in</div>
                {deposit.isLoading ? (
                  <div className="mt-2 text-xs text-muted-foreground">Memuat data deposit...</div>
                ) : deposit.isError ? (
                  <div className="mt-2 text-xs text-destructive">
                    {deposit.error instanceof Error ? deposit.error.message : "Gagal memuat deposit"}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Jenis Deposit
                      </span>
                      <select
                        value={depositType}
                        onChange={(e) => setDepositType(e.target.value as any)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                      >
                        <option value="NONE">Tidak ada</option>
                        <option value="CASH">Uang tunai</option>
                        <option value="KTP">KTP</option>
                        <option value="SIM">SIM</option>
                        <option value="PASSPORT">Paspor</option>
                      </select>
                    </label>
                    {depositType === "CASH" && (
                      <CurrencyInput
                        label="Nominal"
                        valueDigits={String(depositAmount ?? "").replace(/[^\d]/g, "")}
                        onChangeDigits={(digits) => setDepositAmount(digits)}
                        placeholder="Rp 300.000"
                      />
                    )}
                    {depositType !== "NONE" && depositType !== "CASH" && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                            Nama di Identitas
                          </span>
                          <input
                            value={identityName}
                            onChange={(e) => setIdentityName(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                            placeholder="Nama sesuai identitas"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                            Nomor Identitas
                          </span>
                          <input
                            value={identityNumber}
                            onChange={(e) => setIdentityNumber(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                            placeholder="Nomor KTP/SIM/Paspor"
                          />
                        </label>
                      </div>
                    )}
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Catatan
                      </span>
                      <textarea
                        rows={2}
                        value={depositNote}
                        onChange={(e) => setDepositNote(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                        placeholder="Catatan deposit (opsional)"
                      />
                    </label>
                  </div>
                )}
              </div>

                <button
                  onClick={onConfirm}
                  disabled={!bookingEligibility.can || checkIn.isPending}
                  className="mt-4 w-full rounded-xl bg-accent py-2.5 text-xs font-semibold text-accent-foreground"
                >
                  Konfirmasi Check-in
                </button>
                {!bookingEligibility.can && (
                  <div className="mt-2 text-xs text-destructive">{bookingEligibility.reason}</div>
                )}
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
