import deluxe from "@/assets/room-deluxe.jpg";
import suite from "@/assets/room-suite.jpg";
import standard from "@/assets/room-standard.jpg";
import villa from "@/assets/room-villa.jpg";

export type RoomType = {
  id: string;
  name: string;
  price: number;
  capacity: number;
  size: number;
  bed: string;
  breakfast: boolean;
  available: number;
  image: string;
  gallery: string[];
  description: string;
  mainFacilities: string[];
  roomFacilities: string[];
  bathroomFacilities: string[];
};

export const rooms: RoomType[] = [
  {
    id: "deluxe",
    name: "Deluxe Room",
    price: 850000,
    capacity: 2,
    size: 28,
    bed: "1 King Bed",
    breakfast: true,
    available: 5,
    image: deluxe,
    gallery: [deluxe, suite, standard],
    description:
      "Kamar Deluxe dengan pemandangan kota, dilengkapi tempat tidur king-size yang nyaman dan fasilitas premium untuk pengalaman menginap yang berkesan.",
    mainFacilities: ["AC", "WiFi Gratis", 'TV LED 42"', "Kolam Renang", "Sarapan"],
    roomFacilities: ["Lemari Pakaian", "Balkon Pribadi", "Air Mineral", "Mini Bar", "Brankas"],
    bathroomFacilities: ["Shower", "Water Heater", "Handuk", "Perlengkapan Mandi"],
  },
  {
    id: "suite",
    name: "Executive Suite",
    price: 1650000,
    capacity: 3,
    size: 48,
    bed: "1 King Bed + Sofa",
    breakfast: true,
    available: 2,
    image: suite,
    gallery: [suite, deluxe, villa],
    description:
      "Suite mewah dengan ruang tamu terpisah, dirancang untuk kenyamanan maksimal dengan sentuhan elegan di setiap detail.",
    mainFacilities: [
      "AC",
      "WiFi Gratis",
      'Smart TV 55"',
      "Kolam Renang",
      "Sarapan",
      "Lounge Access",
    ],
    roomFacilities: [
      "Walk-in Closet",
      "Balkon Luas",
      "Mini Bar Premium",
      "Brankas",
      "Coffee Machine",
    ],
    bathroomFacilities: ["Bathtub", "Rain Shower", "Water Heater", "Handuk Premium", "Bathrobe"],
  },
  {
    id: "standard",
    name: "Standard Room",
    price: 550000,
    capacity: 2,
    size: 22,
    bed: "1 Double Bed",
    breakfast: false,
    available: 8,
    image: standard,
    gallery: [standard, deluxe],
    description:
      "Pilihan ekonomis dengan kenyamanan maksimal, cocok untuk pelancong yang mencari nilai terbaik.",
    mainFacilities: ["AC", "WiFi Gratis", 'TV LED 32"'],
    roomFacilities: ["Lemari", "Meja Kerja", "Air Mineral"],
    bathroomFacilities: ["Shower", "Water Heater", "Handuk"],
  },
  {
    id: "villa",
    name: "Private Villa",
    price: 2850000,
    capacity: 4,
    size: 95,
    bed: "2 King Bed",
    breakfast: true,
    available: 1,
    image: villa,
    gallery: [villa, suite],
    description:
      "Villa pribadi dengan kolam renang sendiri, taman tropis, dan privasi total untuk liburan tak terlupakan.",
    mainFacilities: ["AC", "WiFi Gratis", "Smart TV", "Kolam Pribadi", "Sarapan", "Butler"],
    roomFacilities: ["Dapur Lengkap", "Ruang Tamu", "Teras", "Mini Bar", "BBQ Area"],
    bathroomFacilities: ["Bathtub Outdoor", "Rain Shower", "Bathrobe", "Perlengkapan Mewah"],
  },
];
