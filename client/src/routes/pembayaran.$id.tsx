import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/customer/Nav";
import { formatRupiah } from "@/lib/currency";
import { ArrowLeft, Building2, QrCode, Banknote, Upload, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { isLoggedIn } from "@/services/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export const Route = createFileRoute("/pembayaran/$id")({
  head: () => ({ meta: [{ title: "Pembayaran — Stayly" }] }),
  component: Payment,
});

function Payment() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const [method, setMethod] = useState("transfer");
  const [proofImage, setProofImage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const booking = useQuery({
    queryKey: ["bookings", params.id],
    enabled: isLoggedIn(),
    queryFn: () => apiRequest<any>(`/bookings/${encodeURIComponent(params.id)}`),
  });

  const submitPayment = useMutation({
    mutationFn: async () => {
      if (!booking.data) throw new Error("Booking tidak ditemukan");
      setError("");
      return apiRequest<any>("/payments", {
        method: "POST",
        body: JSON.stringify({
          bookingId: booking.data._id,
          metode:
            method === "transfer"
              ? "transfer_bank"
              : method === "qris"
                ? "qris"
                : "cash",
          jumlah: Number(booking.data.total ?? 0),
          proofImage,
        }),
      });
    },
    onSuccess: () => {
      navigate({ to: "/booking-berhasil/$id", params: { id: params.id } });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Gagal submit pembayaran");
    },
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate({ to: "/login", search: { redirectTo: `/pembayaran/${params.id}` } as any });
    }
  }, [navigate, params.id]);
  if (!isLoggedIn()) return null;

  if (booking.isLoading) {
    return (
      <div className="min-h-screen bg-background pb-28 lg:pb-12">
        <TopBar />
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Memuat invoice...</div>
      </div>
    );
  }

  if (booking.isError) {
    return (
      <div className="min-h-screen bg-background pb-28 lg:pb-12">
        <TopBar />
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-destructive">
          {booking.error instanceof Error ? booking.error.message : "Gagal memuat booking"}
        </div>
      </div>
    );
  }

  const data = booking.data;
  const roomType = data?.roomTypeId;
  const total = Number(data?.total ?? 0);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-12">
      <TopBar />
      <div className="mx-auto max-w-5xl px-4 py-5 md:py-6">
        <Link
          to="/booking/$id"
          params={{ id: roomType?.slug ?? "" }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <h1 className="mt-3 text-xl font-bold md:mt-4 md:text-3xl">Pembayaran</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No Booking {data?.kodeBooking}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-bold">Pilih Metode Pembayaran</h2>
              <div className="mt-4 space-y-2">
                {[
                  {
                    id: "transfer",
                    icon: Building2,
                    label: "Transfer Bank",
                    desc: "BCA, Mandiri, BNI, BRI",
                  },
                  { id: "qris", icon: QrCode, label: "QRIS", desc: "Bayar dengan scan QR" },
                  {
                    id: "cash",
                    icon: Banknote,
                    label: "Cash di Properti",
                    desc: "Bayar saat check-in",
                  },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${method === m.id ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/50"}`}
                  >
                    <input
                      type="radio"
                      name="method"
                      checked={method === m.id}
                      onChange={() => setMethod(m.id)}
                      className="h-4 w-4 accent-[oklch(0.72_0.15_162)]"
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <m.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {method === "transfer" && (
              <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-bold">Transfer ke Rekening</h3>
                <div className="mt-3 rounded-xl bg-secondary p-4">
                  <div className="text-xs text-muted-foreground">BCA — Stayly Indonesia</div>
                  <div className="mt-1 text-xl font-bold tracking-wide">8870 1234 5678</div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium">Upload Bukti Transfer</div>
                  <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 p-8 hover:border-accent">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                    <div className="mt-2 text-sm font-medium">Klik untuk upload</div>
                    <div className="text-xs text-muted-foreground">JPG, PNG hingga 5MB</div>
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
                      alt="Bukti bayar"
                      className="mt-3 max-h-64 w-full rounded-xl object-contain border border-border"
                    />
                  )}
                </div>
              </div>
            )}

            {method === "qris" && (
              <div className="rounded-2xl bg-card p-6 text-center shadow-[var(--shadow-card)]">
                <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl bg-secondary">
                  <QrCode className="h-32 w-32 text-primary" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Scan QR di atas dengan aplikasi e-wallet Anda
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="font-medium">
                Status:{" "}
                {data?.paymentStatus === "paid"
                  ? "Pembayaran terverifikasi"
                  : data?.paymentStatus === "waiting_confirmation"
                    ? "Menunggu konfirmasi"
                    : "Menunggu pembayaran"}
              </span>
            </div>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-soft)]">
              <h3 className="text-sm font-bold">Ringkasan Invoice</h3>
              <div className="mt-3 flex gap-3">
                {roomType?.gambarThumbnail ? (
                  <img
                    src={roomType.gambarThumbnail}
                    alt=""
                    className="h-16 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-20 rounded-lg bg-secondary" />
                )}
                <div>
                  <div className="text-sm font-bold">{roomType?.namaTipe ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {String(data?.checkIn ?? "").slice(0, 10)} → {String(data?.checkOut ?? "").slice(0, 10)}
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Pembayaran</span>
                  <span className="text-xl font-bold">{formatRupiah(total)}</span>
                </div>
              </div>
              {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
              <button
                type="button"
                onClick={() => submitPayment.mutate()}
                disabled={submitPayment.isPending || (method !== "cash" && !proofImage)}
                className="mt-5 hidden lg:inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />{" "}
                {submitPayment.isPending ? "Memproses..." : "Konfirmasi Pembayaran"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground">Total</div>
            <div className="text-base font-bold">{formatRupiah(total)}</div>
          </div>
          <button
            type="button"
            onClick={() => submitPayment.mutate()}
            disabled={submitPayment.isPending || (method !== "cash" && !proofImage)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {submitPayment.isPending ? "Memproses..." : "Konfirmasi"}
          </button>
        </div>
      </div>
    </div>
  );
}
