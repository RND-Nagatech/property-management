import { createFileRoute, Link, notFound, useRouterState } from "@tanstack/react-router";
import { TopBar } from "@/components/customer/Nav";
import { rooms, formatRupiah } from "@/lib/data";
import { diffNights, formatDateId } from "@/lib/dates";
import { pickBookingSearchState } from "@/lib/booking-search-state";
import { ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/booking/$id")({
  head: () => ({ meta: [{ title: "Booking Kamar — Stayly" }] }),
  loader: ({ params }) => {
    const room = rooms.find((r) => r.id === params.id);
    if (!room) throw notFound();
    return { room };
  },
  notFoundComponent: () => <div className="p-10">Kamar tidak ditemukan</div>,
  errorComponent: ({ error }) => <div className="p-10">{error.message}</div>,
  component: BookingPage,
});

function BookingPage() {
  const { room } = Route.useLoaderData();
  const locationState = useRouterState({ select: (s) => s.location.state });
  const searchState = pickBookingSearchState(locationState);
  const checkin = searchState.checkin ?? "2026-05-12";
  const checkout = searchState.checkout ?? "2026-05-15";
  const adults = searchState.adults ?? 2;
  const children = searchState.children ?? 0;

  const nights = diffNights(checkin, checkout);
  const subtotal = room.price * nights;
  const tax = Math.round(subtotal * 0.1);
  const deposit = 300000;
  const total = subtotal + tax + deposit;
  const guestLabel = children > 0 ? `${adults} dewasa, ${children} anak` : `${adults} dewasa`;

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-12">
      <TopBar />
      <div className="mx-auto max-w-5xl px-4 py-5 md:py-6">
        <Link
          to="/kamar/$id"
          params={{ id: room.id }}
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
                <Input label="Nama Lengkap" defaultValue="Budi Santoso" />
                <Input label="No. HP" defaultValue="0812 3456 7890" />
                <Input label="Email" defaultValue="budi@email.com" />
                <Input label="NIK" defaultValue="3201234567890001" />
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
                  src={room.image}
                  alt={room.name}
                  className="h-20 w-24 shrink-0 rounded-xl object-cover"
                />
                <div>
                  <div className="text-sm font-bold">{room.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {room.bed} · {room.capacity} tamu
                  </div>
                  {room.breakfast && (
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
                    label={`${formatRupiah(room.price)} × ${nights} malam`}
                    value={formatRupiah(subtotal)}
                  />
                  <Row label="Pajak & layanan" value={formatRupiah(tax)} />
                  <Row label="Deposit (refundable)" value={formatRupiah(deposit)} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm font-bold">Total Bayar</span>
                  <span className="text-lg font-bold">{formatRupiah(total)}</span>
                </div>
                <Link
                  to="/pembayaran/$id"
                  params={{ id: room.id }}
                  className="mt-4 hidden lg:block w-full rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-foreground hover:opacity-90"
                >
                  Lanjut ke Pembayaran
                </Link>
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
            <div className="text-base font-bold">{formatRupiah(total)}</div>
          </div>
          <Link
            to="/pembayaran/$id"
            params={{ id: room.id }}
            className="flex-1 rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-foreground"
          >
            Lanjut Bayar
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
