import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { Booking } from "@/hooks/useBookings";
import type { Maintenance } from "@/hooks/useMaintenances";

export type DashboardData = {
  totals: {
    totalBooking: number;
    checkInHariIni: number;
    checkOutHariIni: number;
    kamarTersedia: number;
    pembayaranPending: number;
    pendapatanHariIni: number;
    pendapatanBulanan: number;
    biayaHariIni: number;
  };
  pendapatanTrend14?: Array<{ day: string; total: number }>;
  bookingTerbaru: Booking[];
  kerusakanAktif: Maintenance[];
};

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiRequest<DashboardData>("/dashboard"),
  });
}
