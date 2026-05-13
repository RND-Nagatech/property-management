const JAKARTA_OFFSET_MINUTES = 7 * 60;

function toJakartaMs(date) {
  const utcMs = date.getTime();
  const localOffsetMinutes = date.getTimezoneOffset(); // minutes behind UTC
  const asUtcMs = utcMs + localOffsetMinutes * 60_000;
  return asUtcMs + JAKARTA_OFFSET_MINUTES * 60_000;
}

function fromJakartaMs(ms) {
  return new Date(ms - JAKARTA_OFFSET_MINUTES * 60_000);
}

export function getJakartaDayRange(date = new Date()) {
  const jakartaMs = toJakartaMs(date);
  const d = new Date(jakartaMs);
  d.setHours(0, 0, 0, 0);
  const startJakartaMs = d.getTime();
  const endJakartaMs = startJakartaMs + 24 * 60 * 60_000;

  return {
    start: fromJakartaMs(startJakartaMs),
    end: fromJakartaMs(endJakartaMs),
  };
}

export function getJakartaMonthRange(year, month1Based) {
  const m = month1Based - 1;
  const startJakarta = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0));
  const endJakarta = new Date(Date.UTC(year, m + 1, 1, 0, 0, 0, 0));

  return {
    start: fromJakartaMs(startJakarta.getTime()),
    end: fromJakartaMs(endJakarta.getTime()),
  };
}

