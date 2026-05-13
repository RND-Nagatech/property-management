export function formatDateId(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateRangeId(checkin: string, checkout: string): string {
  return `${formatDateId(checkin)} - ${formatDateId(checkout)}`;
}

export function diffNights(checkin: string, checkout: string): number {
  const start = new Date(`${checkin}T00:00:00`).getTime();
  const end = new Date(`${checkout}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  const ms = end - start;
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, days);
}
