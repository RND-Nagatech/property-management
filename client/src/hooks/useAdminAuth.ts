import { useSyncExternalStore } from "react";
import { isAdminLoggedIn } from "@/services/admin-auth";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("pm_admin_auth_change", callback as any);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("pm_admin_auth_change", callback as any);
  };
}

export function useAdminAuth() {
  return useSyncExternalStore(subscribe, isAdminLoggedIn, () => false);
}

