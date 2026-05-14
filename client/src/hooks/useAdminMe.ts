import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { isAdminLoggedIn } from "@/services/admin-auth";

export type AdminMe = {
  _id: string;
  username: string;
  nama?: string;
  role?: string;
  isActive?: boolean;
};

export function useAdminMe() {
  return useQuery({
    queryKey: ["admin", "me"],
    enabled: isAdminLoggedIn(),
    queryFn: () => apiRequest<AdminMe>("/admin/auth/me"),
  });
}

