import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export type Setting = {
  _id: string;
  key: string;
  value: unknown;
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiRequest<Setting[]>("/settings"),
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; value: unknown }) =>
      apiRequest<Setting>(`/settings/by-key/${encodeURIComponent(payload.key)}`, {
        method: "PUT",
        body: JSON.stringify({ value: payload.value }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
