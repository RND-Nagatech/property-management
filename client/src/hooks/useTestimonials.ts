import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { isLoggedIn } from "@/services/auth";

export type Testimonial = {
  _id: string;
  bookingId: string;
  customerId: string;
  guestName: string;
  rating: number;
  comment: string;
  isActive: boolean;
  createdAt?: string;
};

export function usePublicTestimonials() {
  return useQuery({
    queryKey: ["testimonials", "public"],
    queryFn: () => apiRequest<Testimonial[]>("/testimonials/public"),
  });
}

export function useTestimonialByBooking(bookingId?: string) {
  return useQuery({
    queryKey: ["testimonials", "byBooking", bookingId ?? null],
    enabled: Boolean(bookingId) && isLoggedIn(),
    queryFn: () => apiRequest<Testimonial | null>(`/testimonials/by-booking/${encodeURIComponent(String(bookingId))}`),
  });
}

export function useCreateTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { bookingId: string; rating: number; comment: string }) =>
      apiRequest<Testimonial>("/testimonials", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["testimonials", "public"] });
      qc.invalidateQueries({ queryKey: ["testimonials", "byBooking", vars.bookingId] });
    },
  });
}

export function useAdminTestimonials() {
  return useQuery({
    queryKey: ["admin", "testimonials"],
    queryFn: () => apiRequest<Testimonial[]>("/admin/testimonials"),
  });
}

export function useToggleTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Testimonial>(`/admin/testimonials/${encodeURIComponent(id)}/toggle`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      qc.invalidateQueries({ queryKey: ["testimonials", "public"] });
    },
  });
}
