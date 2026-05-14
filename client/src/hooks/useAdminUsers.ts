import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { isAdminLoggedIn } from "@/services/admin-auth";

export type AdminUser = {
  _id: string;
  username: string;
  nama?: string;
  role?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    enabled: isAdminLoggedIn(),
    queryFn: () => apiRequest<AdminUser[]>("/admin/users"),
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username: string; password: string; nama?: string }) =>
      apiRequest<AdminUser>("/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; payload: { nama?: string; isActive?: boolean; password?: string } }) =>
      apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(vars.id)}`, {
        method: "PUT",
        body: JSON.stringify(vars.payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

