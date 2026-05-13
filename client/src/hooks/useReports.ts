import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export type FinanceReport = {
  month: string;
  pendapatanHariIni: number;
  pendapatanBulanan: number;
  biayaHariIni: number;
  biayaBulanan: number;
  labaBulanan: number;
  potonganDepositBulanan: number;
  byRoomType: Array<{
    roomTypeId: string;
    namaTipe: string;
    slug: string;
    totalBooking: number;
    pendapatan: number;
  }>;
};

export type BookingReport = {
  totalBooking: number;
  sukses: number;
  dibatalkan: number;
  byStatus: Record<string, number>;
  avgLengthNights: number;
  trend30: Array<{ day: string; total: number }>;
};

export function useFinanceReport(month?: string) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  return useQuery({
    queryKey: ["reports", "finance", { month: month ?? null }],
    queryFn: () => apiRequest<FinanceReport>(`/reports/finance${qs}`),
  });
}

export function useBookingReport(params?: { from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const qs = search.toString() ? `?${search.toString()}` : "";

  return useQuery({
    queryKey: ["reports", "bookings", { from: params?.from ?? null, to: params?.to ?? null }],
    queryFn: () => apiRequest<BookingReport>(`/reports/bookings${qs}`),
  });
}
