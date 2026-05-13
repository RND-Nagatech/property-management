export type BookingStatus =
  | "Dikonfirmasi"
  | "Menunggu Pembayaran"
  | "Menunggu Konfirmasi"
  | "Check-in"
  | "Check-out"
  | "Dibatalkan";

export type Booking = {
  id: string;
  roomId: string;
  date: string;
  status: BookingStatus;
  total: number;
};

export const bookings: Booking[] = [
  {
    id: "STY-001",
    roomId: "deluxe",
    date: "12–15 Mei 2026",
    status: "Dikonfirmasi",
    total: 2805000,
  },
  {
    id: "STY-002",
    roomId: "suite",
    date: "20–22 Mei 2026",
    status: "Menunggu Pembayaran",
    total: 3630000,
  },
  { id: "STY-003", roomId: "villa", date: "01–05 Apr 2026", status: "Check-out", total: 12540000 },
  { id: "STY-004", roomId: "standard", date: "10 Mar 2026", status: "Dibatalkan", total: 605000 },
];
