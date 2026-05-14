import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export function usePendingPaymentsCount() {
  return useQuery({
    queryKey: ["admin", "payments", "pending-count"],
    queryFn: () => apiRequest<{ count: number }>("/admin/payments/pending-count"),
    refetchInterval: 30_000,
  });
}

