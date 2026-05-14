import React from "react";
import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { TopBar } from "@/components/customer/Nav";
import { formatRupiah } from "@/lib/currency";
import { formatDateId } from "@/lib/dates";
import { useClickOutside } from "@/hooks/use-click-outside";
import { pickBookingSearchState } from "@/lib/booking-search-state";
import { useRoomType } from "@/hooks/useRoomTypes";
import { isLoggedIn } from "@/services/auth";
import { useAvailability } from "@/hooks/useAvailability";
import { resolveMediaUrl } from "@/lib/media";
import heroImg from "@/assets/hero-villa.jpg";
import {
  Users,
  Maximize,
  Bed,
  Coffee,
  Check,
  ArrowLeft,
  Clock,
  ShieldCheck,
  RefreshCcw,
} from "lucide-react";

export const Route = createFileRoute("/kamar/$id")({
  head: () => ({ meta: [{ title: "Detail Kamar — Stayly" }] }),
  component: RoomDetail,
});

function RoomDetail() {
  const params = Route.useParams();
  const roomType = useRoomType(params.id);

  if (roomType.isLoading) {
    return (
      <div className="min-h-screen pb-28 md:pb-12">
        <TopBar />
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
          Memuat detail tipe kamar...
        </div>
      </div>
    );
  }

  if (roomType.isError) {
    return (
      <div className="min-h-screen pb-28 md:pb-12">
        <TopBar />
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-destructive">
          {roomType.error instanceof Error
            ? roomType.error.message
            : "Gagal memuat detail tipe kamar"}
        </div>
      </div>
    );
  }

  if (!roomType.data) {
    return (
      <div className="min-h-screen pb-28 md:pb-12">
        <TopBar />
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
          Tipe kamar tidak ditemukan.
        </div>
      </div>
    );
  }

  return <RoomDetailContent room={roomType.data} />;
}

function RoomDetailContent({ room }: { room: any }) {
  const navigate = useNavigate();
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

  const [checkin, setCheckin] = React.useState(() => searchState.checkin ?? todayYmd);
  const [checkout, setCheckout] = React.useState(() => searchState.checkout ?? tomorrowYmd);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [adults, setAdults] = React.useState(() => searchState.adults ?? 2);
  const [children, setChildren] = React.useState(() => searchState.children ?? 0);
  const [roomsCount, setRoomsCount] = React.useState(() => searchState.roomsCount ?? 1);
  const [showGuestPopover, setShowGuestPopover] = React.useState(false);

  const dateRef = React.useRef<HTMLDivElement | null>(null);
  const guestRef = React.useRef<HTMLDivElement | null>(null);
  useClickOutside([dateRef], () => setShowDatePicker(false), showDatePicker);
  useClickOutside([guestRef], () => setShowGuestPopover(false), showGuestPopover);

  const [calMonth, setCalMonth] = React.useState(() => new Date());

  function toYmdLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const monthFrom = React.useMemo(() => {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    return toYmdLocal(d);
  }, [calMonth]);

  const monthTo = React.useMemo(() => {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    return toYmdLocal(d);
  }, [calMonth]);

  const availability = useAvailability({ from: monthFrom, to: monthTo, roomTypeId: room._id });
  const availabilityMap = React.useMemo(() => {
    const m: Record<string, { status: string; booked: number; available: number }> = {};
    const data = availability.data && !Array.isArray(availability.data) ? availability.data : null;
    for (const d of data?.days ?? []) {
      m[d.date] = { status: d.status, booked: d.booked, available: d.available };
    }
    return m;
  }, [availability.data]);

  const [calError, setCalError] = React.useState<string>("");

  function addDaysYmd(ymd: string, days: number) {
    const [y, m, d] = ymd.split("-").map((n) => Number(n));
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    dt.setDate(dt.getDate() + days);
    return toYmdLocal(dt);
  }

  function inRange(ymd: string, start: string, end: string) {
    return ymd >= start && ymd <= end;
  }

  function rangeHasFullBooked(start: string, end: string) {
    // booking counts for nights: [start, end) ; we disallow FULL_BOOKED dates inside start..(end-1)
    let d = start;
    while (d < end) {
      if (availabilityMap[d]?.status === "FULL_BOOKED") return d;
      d = addDaysYmd(d, 1);
    }
    return "";
  }

  const galleryRaw = room.galeriGambar?.length
    ? room.galeriGambar
    : room.gambarThumbnail
      ? [room.gambarThumbnail]
      : [];
  const gallery = galleryRaw.map((g: string) => resolveMediaUrl(g)).filter(Boolean);
  return (
    <div className="min-h-screen pb-28 md:pb-12">
      <TopBar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link
          to="/kamar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Semua kamar
        </Link>

        {/* Gallery */}
        <div className="mt-4 grid gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[480px]">
          <div className="md:col-span-2 md:row-span-2 overflow-hidden rounded-2xl">
            {gallery[0] ? (
              <img src={gallery[0]} alt={room.namaTipe} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
                Tidak ada gambar
              </div>
            )}
          </div>
          {gallery.slice(1, 5).map((g: string, i: number) => (
            <div key={i} className="hidden md:block overflow-hidden rounded-2xl">
              <img src={g} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">{room.namaTipe}</h1>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                  {room.tipeKasur || "-"} · Stayly Resort & Villa
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { i: Users, l: "Kapasitas", v: `${room.kapasitas} tamu` },
                { i: Maximize, l: "Ukuran", v: `${room.ukuranKamar} m²` },
                { i: Bed, l: "Tipe Kasur", v: room.tipeKasur || "-" },
                { i: Coffee, l: "Sarapan", v: room.includeSarapan ? "Termasuk" : "Tidak termasuk" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                  <s.i className="h-5 w-5 text-accent" />
                  <div className="mt-2 text-xs text-muted-foreground">{s.l}</div>
                  <div className="text-sm font-semibold">{s.v}</div>
                </div>
              ))}
            </div>

            <section className="mt-8">
              <h2 className="text-lg font-bold">Tentang Kamar</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{room.deskripsi}</p>
            </section>

            <FacilitySection title="Fasilitas Utama" items={room.fasilitasUtama ?? []} />
            <FacilitySection title="Fasilitas Kamar" items={room.fasilitasKamar ?? []} />
            <FacilitySection title="Fasilitas Kamar Mandi" items={room.fasilitasKamarMandi ?? []} />

            <section className="mt-8 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-bold">Kebijakan</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Policy
                  icon={Clock}
                  title="Check-in / Check-out"
                  desc={`${room.jamCheckIn || "14:00"} / ${room.jamCheckOut || "12:00"}`}
                />
                <Policy
                  icon={RefreshCcw}
                  title="Reschedule"
                  desc={room.kebijakanReschedule || "Tidak tersedia"}
                />
                <Policy
                  icon={ShieldCheck}
                  title="Refund"
                  desc={room.kebijakanRefund || "Tidak tersedia"}
                />
                <Policy
                  icon={ShieldCheck}
                  title="Deposit"
                  desc={`${formatRupiah(room.depositDefault ?? 0)} (refundable)`}
                />
              </div>
            </section>
          </div>

          {/* Booking card */}
          <aside className="lg:sticky lg:top-20 lg:self-start hidden md:block">
            <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-soft)] overflow-visible">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{formatRupiah(room.hargaDefault)}</div>
                  <div className="text-xs text-muted-foreground">per malam</div>
                </div>
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                  {room.kamarTersedia ?? 0} tersedia
                </span>
              </div>
              {/* Date range picker simple, center popover and prevent overflow */}
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-border p-2">
                <div className="rounded-lg p-2 relative" ref={dateRef}>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">
                    Check-in
                  </div>
                  <button
                    type="button"
                    className="text-sm font-semibold w-full text-left"
                    onClick={() => setShowDatePicker((v) => !v)}
                  >
                    {formatDateId(checkin)}
                  </button>
                  {showDatePicker && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-12 z-30 w-[320px] rounded-2xl bg-white p-4 shadow-xl border border-border animate-fade-in">
                      <div className="font-bold mb-2 text-base">Tanggal Menginap</div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 text-xs font-semibold"
                          onClick={() =>
                            setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                          }
                        >
                          Prev
                        </button>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {calMonth.toLocaleString("id-ID", { month: "long", year: "numeric" })}
                        </div>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 text-xs font-semibold"
                          onClick={() =>
                            setCalMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                          }
                        >
                          Next
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-7 gap-1 text-[10px]">
                        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                          <div key={d} className="pb-1 text-center font-bold text-muted-foreground">
                            {d}
                          </div>
                        ))}
                        {(() => {
                          const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
                          const startDow = first.getDay(); // 0=Sun
                          const daysInMonth = new Date(
                            calMonth.getFullYear(),
                            calMonth.getMonth() + 1,
                            0
                          ).getDate();

                          const cells = [];
                          for (let i = 0; i < startDow; i++) cells.push(null);
                          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                          while (cells.length < 42) cells.push(null);

                          return cells.map((day, idx) => {
                            if (!day) {
                              return <div key={idx} className="aspect-square rounded-md" />;
                            }
                            const ymd = toYmdLocal(
                              new Date(calMonth.getFullYear(), calMonth.getMonth(), day)
                            );

                            const st = availabilityMap[ymd]?.status;
                            const isPast = ymd < todayYmd;
                            const isFull = st === "FULL_BOOKED";
                            const isSelected = inRange(ymd, checkin, checkout);
                            const isStart = ymd === checkin;
                            const isEnd = ymd === checkout;

                            const base =
                              st === "FULL_BOOKED"
                                ? "bg-destructive/10 text-destructive"
                                : st === "PARTIAL_BOOKED"
                                  ? "bg-warning/15 text-warning"
                                  : st === "AVAILABLE"
                                    ? "bg-success/15 text-success"
                                    : "bg-secondary/40 text-muted-foreground";

                            const selectedCls = isSelected
                              ? "bg-primary text-primary-foreground"
                              : base;

                            const disabled = isPast || isFull;

                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  setCalError("");
                                  if (disabled) return;
                                  // Select start/end range
                                  if (!checkin || (checkin && checkout && ymd <= checkin)) {
                                    setCheckin(ymd);
                                    setCheckout(addDaysYmd(ymd, 1));
                                    return;
                                  }
                                  if (ymd > checkin) {
                                    const nextCheckout = ymd;
                                    const bad = rangeHasFullBooked(checkin, nextCheckout);
                                    if (bad) {
                                      setCalError(`Tanggal ${bad} FULL BOOKED. Rentang tidak boleh melewati tanggal tersebut.`);
                                      return;
                                    }
                                    setCheckout(nextCheckout);
                                  }
                                }}
                                className={`aspect-square rounded-md border border-border px-0.5 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                  selectedCls
                                } ${isStart || isEnd ? "ring-2 ring-primary/30" : ""}`}
                                title={
                                  isFull
                                    ? "FULL BOOKED"
                                    : availabilityMap[ymd]
                                      ? `${availabilityMap[ymd].available} tersedia`
                                      : ""
                                }
                              >
                                {day}
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {availability.isLoading && (
                        <div className="text-xs text-muted-foreground">Memuat ketersediaan...</div>
                      )}
                      {availability.isError && (
                        <div className="text-xs text-destructive">
                          {availability.error instanceof Error
                            ? availability.error.message
                            : "Gagal memuat ketersediaan"}
                        </div>
                      )}
                      {calError && <div className="text-xs text-destructive mt-2">{calError}</div>}
                      <button
                        className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-accent-foreground mt-2"
                        onClick={() => setShowDatePicker(false)}
                      >
                        Selesai
                      </button>
                    </div>
                  )}
                </div>
                <div className="rounded-lg p-2 border-l border-border">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">
                    Check-out
                  </div>
                  <span className="text-sm font-semibold">{formatDateId(checkout)}</span>
                </div>
              </div>
              {/* Guest popover mirip landing page */}
              <div className="mt-3 rounded-xl border border-border p-3 relative" ref={guestRef}>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Tamu</div>
                <button
                  type="button"
                  className="text-sm font-semibold w-full text-left"
                  onClick={() => setShowGuestPopover((v) => !v)}
                >
                  {adults} Dewasa, {children} Anak, {roomsCount} Kamar
                </button>
                {showGuestPopover && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-12 z-30 w-[320px] rounded-2xl bg-white p-4 shadow-xl border border-border animate-fade-in">
                    <div className="font-bold mb-2 text-base">Tamu dan Kamar</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2">Dewasa</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="rounded-full bg-secondary px-2"
                        >
                          -
                        </button>
                        <span className="w-6 text-center">{adults}</span>
                        <button
                          onClick={() => setAdults(adults + 1)}
                          className="rounded-full bg-secondary px-2"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2">Anak</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="rounded-full bg-secondary px-2"
                        >
                          -
                        </button>
                        <span className="w-6 text-center">{children}</span>
                        <button
                          onClick={() => setChildren(children + 1)}
                          className="rounded-full bg-secondary px-2"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex items-center gap-2">Kamar</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
                          className="rounded-full bg-secondary px-2"
                        >
                          -
                        </button>
                        <span className="w-6 text-center">{roomsCount}</span>
                        <button
                          onClick={() => setRoomsCount(roomsCount + 1)}
                          className="rounded-full bg-secondary px-2"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-accent-foreground"
                      onClick={() => setShowGuestPopover(false)}
                    >
                      Selesai
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = `/booking/${room.slug}`;
                  if (!isLoggedIn()) {
                    navigate({ to: "/login", search: { redirectTo: next } as any });
                    return;
                  }
                  navigate({
                    to: "/booking/$id",
                    params: { id: room.slug },
                    state: { checkin, checkout, adults, children, roomsCount } as any,
                  });
                }}
                className="mt-5 block w-full rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Booking Sekarang
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Belum ada biaya yang dikenakan
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{formatRupiah(room.hargaDefault)}</div>
            <div className="text-[11px] text-muted-foreground">per malam</div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = `/booking/${room.slug}`;
              if (!isLoggedIn()) {
                navigate({ to: "/login", search: { redirectTo: next } as any });
                return;
              }
              navigate({
                to: "/booking/$id",
                params: { id: room.slug },
                state: { checkin, checkout, adults, children, roomsCount } as any,
              });
            }}
            className="flex-1 rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-foreground"
          >
            Booking Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

function FacilitySection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((it) => (
          <div
            key={it}
            className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 text-sm shadow-[var(--shadow-card)]"
          >
            <Check className="h-4 w-4 text-accent" /> {it}
          </div>
        ))}
      </div>
    </section>
  );
}

function Policy({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="h-5 w-5 shrink-0 text-accent" />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
