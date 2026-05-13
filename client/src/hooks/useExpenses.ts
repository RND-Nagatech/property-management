import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export type Expense = {
  _id: string;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  metode?: string;
};

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiRequest<Expense[]>("/expenses"),
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
