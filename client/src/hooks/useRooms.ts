import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { Room, RoomType } from "@/services/types";

const keys = {
  rooms: ["rooms"] as const,
  roomsByType: (params: { roomTypeId?: string; status?: string }) =>
    ["rooms", { roomTypeId: params.roomTypeId ?? null, status: params.status ?? null }] as const,
};

export function useRooms(params?: { roomTypeId?: string; status?: string }) {
  const roomTypeId = params?.roomTypeId;
  const status = params?.status;

  const search = new URLSearchParams();
  if (roomTypeId) search.set("roomTypeId", roomTypeId);
  if (status) search.set("status", status);
  const qs = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: keys.roomsByType({ roomTypeId, status }),
    queryFn: () => apiRequest<Room[]>(`/rooms${qs}`),
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Room>) =>
      apiRequest<Room>("/rooms", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rooms });
      qc.invalidateQueries({ queryKey: ["roomTypes"] });
    },
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Room> }) =>
      apiRequest<Room>(`/rooms/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rooms });
      qc.invalidateQueries({ queryKey: ["roomTypes"] });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Room>(`/rooms/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rooms });
      qc.invalidateQueries({ queryKey: ["roomTypes"] });
    },
  });
}
