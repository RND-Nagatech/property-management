import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { Booking } from "@/hooks/useBookings";
import type { Guest } from "@/hooks/useGuests";

export type PaymentStatus = "Menunggu" | "Terverifikasi" | "Ditolak";

export type Payment = {
  _id: string;
  invoice: string;
  bookingId: Booking;
  tamuId: Guest;
  metode: string;
  jumlah: number;
  status: PaymentStatus;
  catatan?: string;
};

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => apiRequest<Payment[]>("/payments"),
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Payment> }) =>
      apiRequest<Payment>(`/payments/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}
