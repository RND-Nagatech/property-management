import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { TopBar } from "@/components/customer/Nav";
import { rooms } from "@/lib/data";
import { CheckCircle2, QrCode, Download, Calendar } from "lucide-react";

export const Route = createFileRoute("/booking-berhasil/$id")({
  head: () => ({ meta: [{ title: "Booking Berhasil — Stayly" }] }),
  loader: ({ params }) => {
    const room = rooms.find((r) => r.id === params.id);
    if (!room) throw notFound();
    return { room };
  },
  notFoundComponent: () => <div className="p-10">Tidak ditemukan</div>,
  errorComponent: ({ error }) => <div className="p-10">{error.message}</div>,
  component: Success,
});

function Success() {
  const { room } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-12 w-12 text-accent" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Booking Berhasil!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Konfirmasi telah dikirim ke email Anda. Tunjukkan QR code di bawah saat check-in.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Booking Code
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tracking-widest">
              STY-2026-{room.id.slice(0, 3).toUpperCase()}-8421
            </div>
          </div>

          <div className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-secondary">
              <QrCode className="h-32 w-32 text-primary" />
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-secondary/50 p-5 text-left">
            <div className="flex items-center gap-3">
              <img src={room.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div>
                <div className="text-sm font-bold">{room.name}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> 12 Mei 2026 → 15 Mei 2026
                </div>
              </div>
              <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                Dikonfirmasi
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold">
              <Download className="h-4 w-4" /> Download Invoice
            </button>
            <Link
              to="/booking-saya"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground"
            >
              Lihat Booking Saya
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
