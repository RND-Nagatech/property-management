import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export type Guest = {
  _id: string;
  nama: string;
  email: string;
  hp: string;
  catatan?: string;
  totalBooking?: number;
};

const keys = {
  guests: (q: string) => ["guests", { q }] as const,
};

export function useGuests(q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return useQuery({
    queryKey: keys.guests(q),
    queryFn: () => apiRequest<Guest[]>(`/guests${qs}`),
  });
}

export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Guest>) =>
      apiRequest<Guest>("/guests", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guests"] }),
  });
}

export function useUpdateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Guest> }) =>
      apiRequest<Guest>(`/guests/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guests"] }),
  });
}

export function useDeleteGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Guest>(`/guests/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guests"] }),
  });
}
