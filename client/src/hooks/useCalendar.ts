import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export type CalendarEvent = {
  _id: string;
  tanggal: string;
  label: string;
  colorClass?: string;
};

export function useCalendarEvents() {
  return useQuery({
    queryKey: ["calendar"],
    queryFn: () => apiRequest<CalendarEvent[]>("/calendar"),
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CalendarEvent>) =>
      apiRequest<CalendarEvent>("/calendar", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });
}
