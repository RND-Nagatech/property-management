import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { isLoggedIn } from "@/services/auth";

export type Customer = {
  _id: string;
  namaLengkap: string;
  noHp: string;
  email: string;
  nik?: string;
  alamat?: string;
};

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    enabled: isLoggedIn(),
    queryFn: () => apiRequest<Customer>("/auth/me"),
  });
}

