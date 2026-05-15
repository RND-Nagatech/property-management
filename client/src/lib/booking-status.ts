// Konversi status booking ke label user-friendly
export function formatBookingStatus(status: string): string {
  switch (status) {
    case "pending_payment":
      return "Menunggu Pembayaran";
    case "waiting_confirmation":
      return "Menunggu Konfirmasi";
    case "confirmed":
      return "Dikonfirmasi";
    case "checked_in":
      return "Check-in";
    case "checked_out":
      return "Check-out";
    case "cancelled":
      return "Dibatalkan";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
