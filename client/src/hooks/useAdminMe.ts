import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { clearAdminToken } from "@/services/admin-auth";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export type AdminMe = {
  _id: string;
  username: string;
  nama?: string;
  role?: string;
  isActive?: boolean;
};

export function useAdminMe() {
  const adminLoggedIn = useAdminAuth();
  return useQuery({
    queryKey: ["admin", "me"],
    enabled: adminLoggedIn,
    queryFn: () => apiRequest<AdminMe>("/admin/auth/me"),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onError: (err) => {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) {
        clearAdminToken();
      }
    },
  });
}

