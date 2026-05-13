import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { Room, RoomType } from "@/services/types";

export type MaintenanceStatus = "Baru" | "Diproses" | "Selesai";

export type Maintenance = {
  _id: string;
  roomId?: Room | null;
  roomTypeId?: RoomType | null;
  judul: string;
  deskripsi?: string;
  status: MaintenanceStatus;
  biayaEstimasi?: number;
};

export function useMaintenances() {
  return useQuery({
    queryKey: ["maintenances"],
    queryFn: () => apiRequest<Maintenance[]>("/maintenances"),
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Maintenance>) =>
      apiRequest<Maintenance>("/maintenances", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenances"] }),
  });
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Maintenance> }) =>
      apiRequest<Maintenance>(`/maintenances/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenances"] }),
  });
}
