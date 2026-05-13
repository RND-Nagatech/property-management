export type BookingSearchState = {
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  roomsCount: number;
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function pickBookingSearchState(value: unknown): Partial<BookingSearchState> {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;

  const state: Partial<BookingSearchState> = {};
  if (isIsoDate(v.checkin)) state.checkin = v.checkin;
  if (isIsoDate(v.checkout)) state.checkout = v.checkout;
  if (isFiniteNumber(v.adults)) state.adults = v.adults;
  if (isFiniteNumber(v.children)) state.children = v.children;
  if (isFiniteNumber(v.roomsCount)) state.roomsCount = v.roomsCount;

  return state;
}
