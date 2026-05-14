import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useAvailability, type AvailabilityDay } from "@/hooks/useAvailability";

export const Route = createFileRoute("/admin/kalender")({
  head: () => ({ meta: [{ title: "Kalender" }] }),
  component: Kalender,
});

const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function Kalender() {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  function toYmd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const from = useMemo(() => toYmd(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)), [monthDate]);
  const to = useMemo(() => toYmd(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)), [monthDate]);
  const monthLabel = useMemo(
    () => monthDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    [monthDate],
  );
  const today = useMemo(() => new Date(), []);

  const roomTypes = useRoomTypes(true);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");

  const activeTypeId =
    selectedTypeId ||
    (roomTypes.data ?? []).find((t) => t.isActive)?._id ||
    (roomTypes.data ?? [])[0]?._id ||
    "";

  const availability = useAvailability({ from, to, roomTypeId: activeTypeId, includeInactive: true });

  const map = useMemo(() => {
    const m: Record<number, AvailabilityDay> = {};
    const data = availability.data && !Array.isArray(availability.data) ? availability.data : null;
    for (const d of data?.days ?? []) {
      const day = Number(String(d.date).slice(-2));
      if (!Number.isFinite(day)) continue;
      m[day] = d;
    }
    return m;
  }, [availability.data]);

  const statusStyle: Record<string, { badge: string; dot: string }> = {
    AVAILABLE: { badge: "bg-success/15 text-success", dot: "bg-success" },
    PARTIAL_BOOKED: { badge: "bg-warning/15 text-warning", dot: "bg-warning" },
    FULL_BOOKED: { badge: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Kalender Booking" desc="Okupansi & jadwal check-in/check-out" />
      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">{monthLabel}</div>
          <div className="flex gap-1">
            <button
              className="rounded-lg border border-border p-2"
              onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="rounded-lg border border-border p-2"
              onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="text-xs font-semibold text-muted-foreground">Tipe Kamar</div>
          <select
            value={activeTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {(roomTypes.data ?? []).map((t) => (
              <option key={t._id} value={t._id}>
                {t.namaTipe} {t.isActive ? "" : "(Nonaktif)"}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1 text-xs">
          {days.map((d) => (
            <div key={d} className="pb-2 text-center font-bold text-muted-foreground">
              {d}
            </div>
          ))}
          {availability.isLoading && (
            <div className="col-span-7 rounded-xl bg-secondary/40 p-3 text-center text-sm text-muted-foreground">
              Memuat ketersediaan kamar...
            </div>
          )}
          {availability.isError && (
            <div className="col-span-7 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
              {availability.error instanceof Error
                ? availability.error.message
                : "Gagal memuat ketersediaan"}
            </div>
          )}
          {(() => {
            const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
            const startOffset = first.getDay(); // 0=Min
            const daysInMonth = last.getDate();
            const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

            return Array.from({ length: cells }).map((_, i) => {
              const day = i - startOffset + 1;
              const valid = day > 0 && day <= daysInMonth;
              const av = valid ? map[day] : undefined;
              const isToday =
                valid &&
                today.getFullYear() === monthDate.getFullYear() &&
                today.getMonth() === monthDate.getMonth() &&
                today.getDate() === day;
            const full = av?.status === "FULL_BOOKED";
            const st = av?.status ? statusStyle[String(av.status)] : undefined;
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl border p-1.5 ${valid ? "bg-background" : "bg-transparent border-transparent"} ${isToday ? "border-accent ring-2 ring-accent/30" : "border-border"}`}
              >
                {valid && (
                  <>
                    <div className={`text-xs font-bold ${isToday ? "text-accent" : ""}`}>{day}</div>
                    <div className="mt-1 space-y-0.5">
                      {av && (
                        <>
                          <div
                            className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold ${
                              st?.badge ?? "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {full
                              ? "FULL BOOKED"
                              : av.status === "PARTIAL_BOOKED"
                                ? "PARTIAL BOOKED"
                                : "AVAILABLE"}
                          </div>
                          <div className="truncate rounded px-1 py-0.5 text-[9px] font-semibold bg-secondary text-muted-foreground">
                            {av.booked} booked · {av.available} avail
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          });
          })()}
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          {[
            { l: "AVAILABLE", c: statusStyle.AVAILABLE.dot },
            { l: "PARTIAL BOOKED", c: statusStyle.PARTIAL_BOOKED.dot },
            { l: "FULL BOOKED", c: statusStyle.FULL_BOOKED.dot },
          ].map((l) => (
            <div key={l.l} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded ${l.c}`} />
              {l.l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
