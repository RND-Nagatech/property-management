import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { Booking } from "@/hooks/useBookings";
import type { Guest } from "@/hooks/useGuests";

export type DepositStatus = "Ditahan" | "Dikembalikan" | "Dipakai";

export type Deposit = {
  _id: string;
  bookingId: Booking | string;
  tamuId: Guest | string;
  jumlah: number;
  potongan?: number;
  refundJumlah?: number;
  status: DepositStatus;
  catatan?: string;
  type?: "NONE" | "CASH" | "KTP" | "SIM" | "PASSPORT";
  amount?: number;
  identityName?: string;
  identityNumber?: string;
  note?: string;
  receivedAt?: string | Date | null;
  receivedBy?: string;
  returnStatus?: "PENDING" | "RETURNED" | "PARTIALLY_DEDUCTED" | "NOT_RETURNED" | null;
  returnedAmount?: number;
  deductedAmount?: number;
  returnNote?: string;
  returnedAt?: string | Date | null;
  returnedBy?: string;
};

export function useDeposits() {
  return useQuery({
    queryKey: ["deposits"],
    queryFn: () => apiRequest<Deposit[]>("/deposits"),
  });
}

export function useDepositByBooking(bookingId?: string) {
  const qs = bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : "";
  return useQuery({
    queryKey: ["deposits", { bookingId: bookingId ?? null }],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      const list = await apiRequest<Deposit[]>(`/deposits${qs}`);
      return list[0] ?? null;
    },
  });
}

export function useCreateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Deposit>) =>
      apiRequest<Deposit>("/deposits", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Deposit> }) =>
      apiRequest<Deposit>(`/deposits/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
