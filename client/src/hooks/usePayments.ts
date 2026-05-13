import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { Booking } from "@/hooks/useBookings";
import type { Guest } from "@/hooks/useGuests";

export type PaymentStatus =
  | "Menunggu"
  | "Terverifikasi"
  | "Ditolak"
  | "waiting_confirmation"
  | "paid"
  | "failed";

export type Payment = {
  _id: string;
  invoice: string;
  bookingId: Booking | string;
  tamuId: Guest | string;
  customerId?: any;
  metode: string;
  jumlah: number;
  status: PaymentStatus;
  proofImage?: string;
  rejectionReason?: string;
  catatan?: string;
};

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => apiRequest<Payment[]>("/admin/payments"),
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, payload }: { id: string; action: "verify" | "reject"; payload?: any }) =>
      apiRequest<Payment>(`/admin/payments/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}
