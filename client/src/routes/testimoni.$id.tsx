import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/customer/Nav";
import { ArrowLeft, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { isLoggedIn } from "@/services/auth";
import { useCreateTestimonial, useTestimonialByBooking } from "@/hooks/useTestimonials";

export const Route = createFileRoute("/testimoni/$id")({
  head: () => ({ meta: [{ title: "Beri Testimoni — Stayly" }] }),
  component: TestimoniCustomer,
});

function TestimoniCustomer() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const bookingId = params.id;

  const booking = useQuery({
    queryKey: ["bookings", bookingId],
    enabled: isLoggedIn(),
    queryFn: () => apiRequest<any>(`/bookings/${encodeURIComponent(bookingId)}`),
  });

  const existing = useTestimonialByBooking(bookingId);
  const create = useCreateTestimonial();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  if (!isLoggedIn()) {
    navigate({ to: "/login", search: { redirectTo: `/testimoni/${bookingId}` } as any });
    return null;
  }

  if (existing.data) {
    return (
      <div className="min-h-screen bg-background pb-28 lg:pb-12">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Link to="/booking-saya" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
            <h1 className="text-xl font-bold">Testimoni sudah terkirim</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Terima kasih! Testimoni Anda akan tampil setelah disetujui admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-12">
      <TopBar />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link to="/booking-saya" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="mt-6 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-bold">Beri Testimoni</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.isLoading ? "Memuat booking..." : `Booking: ${booking.data?.kodeBooking ?? "-"}`}
          </p>

          <div className="mt-5">
            <div className="text-sm font-semibold">Rating</div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const n = i + 1;
                const active = n <= rating;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`rounded-lg p-2 ${active ? "text-warning" : "text-muted-foreground"}`}
                    title={`${n}`}
                  >
                    <Star className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold">Komentar</div>
            <textarea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent"
              placeholder="Ceritakan pengalaman menginap Anda..."
            />
          </div>

          <button
            type="button"
            disabled={create.isPending || !comment.trim()}
            onClick={async () => {
              try {
                await create.mutateAsync({ bookingId, rating, comment: comment.trim() });
                toast.success("Testimoni terkirim");
                navigate({ to: "/booking-saya" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Gagal mengirim testimoni");
              }
            }}
            className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {create.isPending ? "Mengirim..." : "Kirim Testimoni"}
          </button>

          <div className="mt-3 text-xs text-muted-foreground">
            Testimoni akan tampil setelah disetujui admin.
          </div>
        </div>
      </div>
    </div>
  );
}

