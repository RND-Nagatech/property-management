import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { RoomType } from "@/services/types";

const keys = {
  roomTypes: ["roomTypes"] as const,
  roomType: (slug: string) => ["roomType", slug] as const,
};

export function useRoomTypes(includeInactive = false) {
  return useQuery({
    queryKey: [...keys.roomTypes, { includeInactive }] as const,
    queryFn: () =>
      apiRequest<RoomType[]>(`/room-types?includeInactive=${includeInactive ? "1" : "0"}`),
  });
}

export function useRoomType(slug: string) {
  return useQuery({
    queryKey: keys.roomType(slug),
    enabled: Boolean(slug),
    queryFn: () => apiRequest<RoomType>(`/room-types/${encodeURIComponent(slug)}`),
  });
}

export function useCreateRoomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<RoomType>) =>
      apiRequest<RoomType>("/room-types", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.roomTypes });
    },
  });
}

export function useUpdateRoomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RoomType> }) =>
      apiRequest<RoomType>(`/room-types/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.roomTypes });
      qc.invalidateQueries({ queryKey: keys.roomType(String(vars.payload.slug ?? "")) });
    },
  });
}

export function useDeleteRoomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<RoomType>(`/room-types/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.roomTypes });
    },
  });
}
