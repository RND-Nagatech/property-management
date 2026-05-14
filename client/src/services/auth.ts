const TOKEN_KEY = "pm_auth_token";
const AUTH_EVENT = "pm_auth_change";

export function getAuthToken(): string {
  try {
    return String(localStorage.getItem(TOKEN_KEY) ?? "");
  } catch {
    return "";
  }
}

export function setAuthToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    // ignore
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    // ignore
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken());
}
