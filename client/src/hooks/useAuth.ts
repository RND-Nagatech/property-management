import { useSyncExternalStore } from "react";
import { isLoggedIn } from "@/services/auth";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("pm_auth_change", callback as any);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("pm_auth_change", callback as any);
  };
}

export function useAuth() {
  // This will re-render on login/logout (localStorage change)
  return useSyncExternalStore(subscribe, isLoggedIn, () => false);
}
