import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export type Expense = {
  _id: string;
  tanggal: string;
  tipeTransaksi?: "IN" | "OUT";
  kategori: string;
  deskripsi: string;
  jumlah: number;
  metode?: string;
};

export function useExpenses(params?: { from?: string; to?: string; tipe?: "IN" | "OUT" }) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.tipe) search.set("tipe", params.tipe);
  const qs = search.toString() ? `?${search.toString()}` : "";
  return useQuery({
    queryKey: ["expenses", { from: params?.from ?? null, to: params?.to ?? null, tipe: params?.tipe ?? null }],
    queryFn: () => apiRequest<Expense[]>(`/expenses${qs}`),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Expense>) =>
      apiRequest<Expense>("/expenses", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Expense>(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
