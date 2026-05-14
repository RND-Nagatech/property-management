import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { RoomType, Room } from "@/services/types";
import type { Guest } from "@/hooks/useGuests";

export type BookingStatus = "Menunggu" | "Dikonfirmasi" | "Check-in" | "Check-out" | "Dibatalkan";

export type Booking = {
  _id: string;
  kodeBooking: string;
  tamuId?: Guest | string | null;
  customerId?: any;
  guestSnapshot?: any;
  roomTypeId: RoomType | string;
  roomId?: Room | string | null;
  checkIn: string;
  checkOut: string;
  dewasa: number;
  anak: number;
  status: BookingStatus;
  bookingStatus?: string;
  paymentStatus?: string;
  total: number;
  catatan?: string;
};

const keys = {
  bookings: (params: { status?: string; tamuId?: string; roomTypeId?: string }) =>
    ["bookings", params] as const,
  bookingByCode: (code: string) => ["bookings", "byCode", code] as const,
};

export function useBookings(params?: {
  status?: BookingStatus;
  tamuId?: string;
  roomTypeId?: string;
}) {
  const status = params?.status;
  const tamuId = params?.tamuId;
  const roomTypeId = params?.roomTypeId;

  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (tamuId) search.set("tamuId", tamuId);
  if (roomTypeId) search.set("roomTypeId", roomTypeId);
  const qs = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: keys.bookings({
      status: status ?? undefined,
      tamuId: tamuId ?? undefined,
      roomTypeId: roomTypeId ?? undefined,
    }),
    queryFn: () => apiRequest<Booking[]>(`/bookings${qs}`),
  });
}

export function useBookingByCode(code: string) {
  return useQuery({
    queryKey: keys.bookingByCode(code),
    enabled: Boolean(code),
    queryFn: () => apiRequest<Booking>(`/admin/bookings/by-code/${encodeURIComponent(code)}`),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Booking>) =>
      apiRequest<Booking>("/bookings", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Booking> }) =>
      apiRequest<Booking>(`/bookings/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useCheckInBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Booking>(`/admin/bookings/${encodeURIComponent(id)}/check-in`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useCheckOutBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Booking>(`/admin/bookings/${encodeURIComponent(id)}/check-out`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Booking>(`/bookings/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useAdminCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Booking>(`/admin/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
