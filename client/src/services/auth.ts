const TOKEN_KEY = "pm_auth_token";

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
  } catch {
    // ignore
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken());
}

