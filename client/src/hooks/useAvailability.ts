import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export type AvailabilityStatus = "AVAILABLE" | "PARTIAL_BOOKED" | "FULL_BOOKED";

export type AvailabilityDay = {
  date: string; // YYYY-MM-DD
  total: number;
  booked: number;
  available: number;
  status: AvailabilityStatus;
};

export type AvailabilityByType = {
  roomType: { _id: string; namaTipe: string; slug: string } | null;
  days: AvailabilityDay[];
};

export function useAvailability(params: {
  from: string;
  to: string;
  roomTypeId?: string;
  includeInactive?: boolean;
}) {
  const qs = new URLSearchParams();
  qs.set("from", params.from);
  qs.set("to", params.to);
  if (params.roomTypeId) qs.set("roomTypeId", params.roomTypeId);
  if (params.includeInactive) qs.set("includeInactive", "1");

  return useQuery({
    queryKey: ["availability", Object.fromEntries(qs.entries())],
    enabled: Boolean(params.from && params.to),
    queryFn: () => apiRequest<AvailabilityByType | AvailabilityByType[]>(`/availability?${qs}`),
  });
}

