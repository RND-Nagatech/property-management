const ADMIN_TOKEN_KEY = "pm_admin_token";
const ADMIN_AUTH_EVENT = "pm_admin_auth_change";

export function getAdminToken(): string {
  try {
    return String(localStorage.getItem(ADMIN_TOKEN_KEY) ?? "");
  } catch {
    return "";
  }
}

export function setAdminToken(token: string) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  } catch {
    // ignore
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  } catch {
    // ignore
  }
}

export function isAdminLoggedIn(): boolean {
  return Boolean(getAdminToken());
}
