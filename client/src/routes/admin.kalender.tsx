import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./admin.tipe-kamar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useCalendarEvents } from "@/hooks/useCalendar";

export const Route = createFileRoute("/admin/kalender")({
  head: () => ({ meta: [{ title: "Kalender" }] }),
  component: Kalender,
});

const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function Kalender() {
  const cal = useCalendarEvents();
  const events = useMemo(() => {
    const map: Record<number, { l: string; c: string }[]> = {};
    const year = 2026;
    const month = 4; // Mei (0-based)
    for (const e of cal.data ?? []) {
      const d = new Date(e.tanggal);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const day = d.getDate();
      map[day] ??= [];
      map[day].push({ l: e.label, c: e.colorClass ?? "bg-secondary text-muted-foreground" });
    }
    return map;
  }, [cal.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Kalender Booking" desc="Okupansi & jadwal check-in/check-out" />
      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">Mei 2026</div>
          <div className="flex gap-1">
            <button className="rounded-lg border border-border p-2">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="rounded-lg border border-border p-2">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1 text-xs">
          {days.map((d) => (
            <div key={d} className="pb-2 text-center font-bold text-muted-foreground">
              {d}
            </div>
          ))}
          {cal.isLoading && (
            <div className="col-span-7 rounded-xl bg-secondary/40 p-3 text-center text-sm text-muted-foreground">
              Memuat event kalender...
            </div>
          )}
          {cal.isError && (
            <div className="col-span-7 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
              {cal.error instanceof Error ? cal.error.message : "Gagal memuat event kalender"}
            </div>
          )}
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - 3;
            const valid = day > 0 && day <= 31;
            const ev = valid ? events[day] : undefined;
            const today = day === 12;
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl border p-1.5 ${valid ? "bg-background" : "bg-transparent border-transparent"} ${today ? "border-accent ring-2 ring-accent/30" : "border-border"}`}
              >
                {valid && (
                  <>
                    <div className={`text-xs font-bold ${today ? "text-accent" : ""}`}>{day}</div>
                    <div className="mt-1 space-y-0.5">
                      {ev?.map((e, j) => (
                        <div
                          key={j}
                          className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold ${e.c}`}
                        >
                          {e.l}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          {[
            { l: "Check-in", c: "bg-accent" },
            { l: "Check-out", c: "bg-muted-foreground" },
            { l: "Booking baru", c: "bg-blue-500" },
            { l: "Full", c: "bg-warning" },
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
