import * as React from "react";
import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { TopBar } from "@/components/customer/Nav";
import { formatRupiah } from "@/lib/currency";
import { diffNights, formatDateId } from "@/lib/dates";
import { pickBookingSearchState } from "@/lib/booking-search-state";
import { ArrowLeft, Check } from "lucide-react";
import { useRoomType } from "@/hooks/useRoomTypes";
import { isLoggedIn } from "@/services/auth";
import { useMe } from "@/hooks/useMe";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";
import { resolveMediaUrl } from "@/lib/media";
import heroImg from "@/assets/hero-villa.jpg";

export const Route = createFileRoute("/booking/$id")({
  head: () => ({ meta: [{ title: "Booking Kamar — Stayly" }] }),
  component: BookingPage,
});

function BookingPage() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const roomType = useRoomType(params.id);
  const me = useMe();
  const qc = useQueryClient();
  const locationState = useRouterState({ select: (s) => s.location.state });
  const searchState = pickBookingSearchState(locationState);
  const todayYmd = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);
  const tomorrowYmd = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);
  const checkin = searchState.checkin ?? todayYmd;
  const checkout = searchState.checkout ?? tomorrowYmd;
  const adults = searchState.adults ?? 2;
  const children = searchState.children ?? 0;

  const nights = diffNights(checkin, checkout);
  const pricePerNight = roomType.data?.hargaDefault ?? 0;
  const subtotal = pricePerNight * Math.max(1, nights);
  const guestLabel = children > 0 ? `${adults} dewasa, ${children} anak` : `${adults} dewasa`;

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!roomType.data) throw new Error("Tipe kamar tidak ditemukan");
      return apiRequest<any>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          roomTypeId: roomType.data._id,
          checkIn: checkin,
          checkOut: checkout,
          dewasa: adults,
          anak: children,
        }),
      });
    },
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      navigate({ to: "/pembayaran/$id", params: { id: booking._id } });
    },
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate({ to: "/login", search: { redirectTo: `/booking/${params.id}` } as any });
    }
  }, [navigate, params.id]);

  if (!isLoggedIn()) return null;

  if (roomType.isLoading) {
    return (
      <div className="min-h-screen bg-background pb-28 lg:pb-12">
        <TopBar />
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
          Memuat data tipe kamar...
        </div>
      </div>
    );
  }

  if (roomType.isError) {
    return (
      <div className="min-h-screen bg-background pb-28 lg:pb-12">
        <TopBar />
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-destructive">
          {roomType.error instanceof Error ? roomType.error.message : "Gagal memuat tipe kamar"}
        </div>
      </div>
    );
  }

  if (!roomType.data) {
    return (
      <div className="min-h-screen bg-background pb-28 lg:pb-12">
        <TopBar />
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
          Tipe kamar tidak ditemukan.
        </div>
      </div>
    );
  }

  const room = roomType.data;

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-12">
      <TopBar />
      <div className="mx-auto max-w-5xl px-4 py-5 md:py-6">
        <Link
          to="/kamar/$id"
          params={{ id: room.slug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <h1 className="mt-3 text-xl font-bold md:mt-4 md:text-3xl">Lengkapi Booking</h1>

        <div className="mt-5 grid gap-5 md:mt-6 md:gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4 md:space-y-6">
            <Card>
              <h2 className="text-base font-bold md:text-lg">Tanggal Menginap</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-4 md:gap-3">
                <Field label="Check-in" value={formatDateId(checkin)} />
                <Field label="Check-out" value={formatDateId(checkout)} />
                <Field label="Jumlah malam" value={`${nights} malam`} />
                <Field label="Tamu" value={guestLabel} />
              </div>
            </Card>

            <Card>
              <h2 className="text-base font-bold md:text-lg">Data Tamu Utama</h2>
              <div className="mt-3 grid gap-3 md:mt-4 md:gap-4 sm:grid-cols-2">
                <Input
                  label="Nama Lengkap"
                  defaultValue={me.data?.namaLengkap ?? (me.isLoading ? "Memuat..." : "")}
                  disabled
                />
                <Input
                  label="No. HP"
                  defaultValue={me.data?.noHp ?? (me.isLoading ? "Memuat..." : "")}
                  disabled
                />
                <Input
                  label="Email"
                  defaultValue={me.data?.email ?? (me.isLoading ? "Memuat..." : "")}
                  disabled
                />
                <Input label="NIK" defaultValue={me.data?.nik ?? ""} disabled />
              </div>
            </Card>

            <Card>
              <h2 className="text-base font-bold md:text-lg">Catatan Khusus</h2>
              <textarea
                rows={4}
                placeholder="Permintaan khusus, alergi, jam check-in..."
                className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              />
            </Card>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
	            <Card className="overflow-hidden p-0">
	              <div className="flex gap-4 p-4 md:p-5">
                <img
	                  src={resolveMediaUrl(room.gambarThumbnail) || heroImg}
	                  alt={room.namaTipe}
	                  className="h-20 w-24 shrink-0 rounded-xl object-cover"
	                />
	                <div>
	                  <div className="text-sm font-bold">{room.namaTipe}</div>
	                  <div className="mt-0.5 text-xs text-muted-foreground">
	                    {room.tipeKasur} · {room.kapasitas} tamu
	                  </div>
	                  {room.includeSarapan && (
	                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
	                      <Check className="h-3 w-3" />
	                      Termasuk Sarapan
	                    </div>
	                  )}
	                </div>
	              </div>
	              <div className="border-t border-border p-4 md:p-5">
	                <h3 className="text-sm font-bold">Rincian Harga</h3>
	                <div className="mt-3 space-y-2 text-sm">
	                  <Row
	                    label={`${formatRupiah(pricePerNight)} × ${Math.max(1, nights)} malam`}
	                    value={formatRupiah(subtotal)}
	                  />
	                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm font-bold">Total Bayar</span>
                  <span className="text-lg font-bold">{formatRupiah(subtotal)}</span>
                </div>
	                <button
	                  type="button"
	                  onClick={() => createBooking.mutate()}
	                  disabled={createBooking.isPending}
	                  className="mt-4 hidden lg:block w-full rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
	                >
	                  {createBooking.isPending ? "Memproses..." : "Lanjut ke Pembayaran"}
	                </button>
	                {createBooking.isError && (
	                  <div className="mt-3 text-sm text-destructive">
	                    {createBooking.error instanceof Error
	                      ? createBooking.error.message
	                      : "Gagal membuat booking"}
	                  </div>
	                )}
	              </div>
	            </Card>
          </aside>
        </div>
      </div>

      {/* Sticky mobile CTA */}
	      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 lg:hidden">
	        <div className="flex items-center justify-between gap-3">
	          <div>
	            <div className="text-[11px] text-muted-foreground">Total</div>
	            <div className="text-base font-bold">{formatRupiah(subtotal)}</div>
	          </div>
	          <button
	            type="button"
	            onClick={() => createBooking.mutate()}
	            disabled={createBooking.isPending}
	            className="flex-1 rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-foreground disabled:opacity-50"
	          >
	            {createBooking.isPending ? "Memproses..." : "Lanjut Bayar"}
	          </button>
	        </div>
	      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
function Input({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
