import { getAuthToken } from "./auth";
import { clearAdminToken, getAdminToken } from "./admin-auth";

type ApiError = {
  code?: string;
  message?: string;
};

type ApiResponse<T> = { data: T } | { error: ApiError };

function getBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = envBase?.trim() ? envBase.trim() : "http://localhost:4000/api";
  return base.replace(/\/+$/, "");
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const isAdminApi = path.startsWith("/admin/");
  const token = isAdminApi ? getAdminToken() : getAuthToken();

  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-cache",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await parseJsonSafe(response)) as ApiResponse<T> | null;

  if (!response.ok) {
    if (response.status === 401 && isAdminApi) {
      clearAdminToken();
    }
    const errMsg =
      (json && "error" in json && json.error?.message) || `Request gagal (${response.status})`;
    const err = new Error(errMsg) as Error & { status?: number; code?: string };
    err.status = response.status;
    if (json && "error" in json && (json as any).error?.code) err.code = (json as any).error.code;
    throw err;
  }

  if (!json || !("data" in json)) throw new Error("Response tidak valid");
  return json.data;
}
