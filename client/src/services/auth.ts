const TOKEN_KEY = "pm_auth_token";
const TOKEN_PERSIST_KEY = "pm_auth_persist";
const AUTH_EVENT = "pm_auth_change";

export function getAuthToken(): string {
  try {
    const persist = String(localStorage.getItem(TOKEN_PERSIST_KEY) ?? "") === "local";
    const store = persist ? localStorage : sessionStorage;
    return String(store.getItem(TOKEN_KEY) ?? "");
  } catch {
    return "";
  }
}

export function setAuthToken(token: string, opts?: { persist?: boolean }) {
  try {
    const persist = Boolean(opts?.persist);
    localStorage.setItem(TOKEN_PERSIST_KEY, persist ? "local" : "session");
    if (persist) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    // ignore
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_PERSIST_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    // ignore
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken());
}
