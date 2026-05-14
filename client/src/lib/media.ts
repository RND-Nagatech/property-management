function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = envBase?.trim() ? envBase.trim() : "http://localhost:4000/api";
  return base.replace(/\/+$/, "");
}

export function resolveMediaUrl(url: string | undefined | null): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  // Treat as server-relative asset (e.g. /uploads/xxx.jpg)
  const api = getApiBaseUrl();
  const server = api.endsWith("/api") ? api.slice(0, -"/api".length) : api;
  return `${server}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

