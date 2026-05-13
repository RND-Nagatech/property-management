import "../env.js";
import { connectDb } from "../db.js";
import { RoomType } from "../models/RoomType.js";
import { Room } from "../models/Room.js";

async function run() {
  await connectDb(process.env.MONGODB_URI);

  const seedTypes = [
    {
      namaTipe: "Standard Room",
      slug: "standard",
      deskripsi: "Pilihan ekonomis dengan kenyamanan maksimal, cocok untuk pelancong yang mencari nilai terbaik.",
      fasilitasUtama: ["AC", "WiFi Gratis", "TV LED 32\""],
      fasilitasKamar: ["Lemari", "Meja Kerja", "Air Mineral"],
      fasilitasKamarMandi: ["Shower", "Water Heater", "Handuk"],
      hargaDefault: 550000,
      kapasitas: 2,
      ukuranKamar: 22,
      tipeKasur: "1 Double Bed",
      includeSarapan: false,
      depositDefault: 300000,
      kebijakanRefund: "Refund sesuai kebijakan hotel.",
      kebijakanReschedule: "Reschedule sesuai ketersediaan kamar.",
      jamCheckIn: "14:00",
      jamCheckOut: "12:00",
      gambarThumbnail: "/assets/room-standard.jpg",
      galeriGambar: ["/assets/room-standard.jpg", "/assets/room-deluxe.jpg"],
      isActive: true,
    },
    {
      namaTipe: "Deluxe Room",
      slug: "deluxe",
      deskripsi:
        "Kamar Deluxe dengan pemandangan kota, dilengkapi tempat tidur king-size yang nyaman dan fasilitas premium.",
      fasilitasUtama: ["AC", "WiFi Gratis", "TV LED 42\"", "Kolam Renang", "Sarapan"],
      fasilitasKamar: ["Lemari Pakaian", "Balkon Pribadi", "Air Mineral", "Mini Bar", "Brankas"],
      fasilitasKamarMandi: ["Shower", "Water Heater", "Handuk", "Perlengkapan Mandi"],
      hargaDefault: 850000,
      kapasitas: 2,
      ukuranKamar: 28,
      tipeKasur: "1 King Bed",
      includeSarapan: true,
      depositDefault: 300000,
      kebijakanRefund: "Refund sesuai kebijakan hotel.",
      kebijakanReschedule: "Reschedule sesuai ketersediaan kamar.",
      jamCheckIn: "14:00",
      jamCheckOut: "12:00",
      gambarThumbnail: "/assets/room-deluxe.jpg",
      galeriGambar: ["/assets/room-deluxe.jpg", "/assets/room-suite.jpg", "/assets/room-standard.jpg"],
      isActive: true,
    },
    {
      namaTipe: "Executive Suite",
      slug: "suite",
      deskripsi: "Suite mewah dengan ruang tamu terpisah, dirancang untuk kenyamanan maksimal dengan sentuhan elegan.",
      fasilitasUtama: ["AC", "WiFi Gratis", "Smart TV 55\"", "Kolam Renang", "Sarapan", "Lounge Access"],
      fasilitasKamar: ["Walk-in Closet", "Balkon Luas", "Mini Bar Premium", "Brankas", "Coffee Machine"],
      fasilitasKamarMandi: ["Bathtub", "Rain Shower", "Water Heater", "Handuk Premium", "Bathrobe"],
      hargaDefault: 1650000,
      kapasitas: 3,
      ukuranKamar: 48,
      tipeKasur: "1 King Bed + Sofa",
      includeSarapan: true,
      depositDefault: 300000,
      kebijakanRefund: "Refund sesuai kebijakan hotel.",
      kebijakanReschedule: "Reschedule sesuai ketersediaan kamar.",
      jamCheckIn: "14:00",
      jamCheckOut: "12:00",
      gambarThumbnail: "/assets/room-suite.jpg",
      galeriGambar: ["/assets/room-suite.jpg", "/assets/room-deluxe.jpg", "/assets/room-villa.jpg"],
      isActive: true,
    },
    {
      namaTipe: "Private Villa",
      slug: "villa",
      deskripsi: "Villa pribadi dengan kolam renang sendiri, taman tropis, dan privasi total untuk liburan tak terlupakan.",
      fasilitasUtama: ["AC", "WiFi Gratis", "Smart TV", "Kolam Pribadi", "Sarapan", "Butler"],
      fasilitasKamar: ["Dapur Lengkap", "Ruang Tamu", "Teras", "Mini Bar", "BBQ Area"],
      fasilitasKamarMandi: ["Bathtub Outdoor", "Rain Shower", "Bathrobe", "Perlengkapan Mewah"],
      hargaDefault: 2850000,
      kapasitas: 4,
      ukuranKamar: 95,
      tipeKasur: "2 King Bed",
      includeSarapan: true,
      depositDefault: 500000,
      kebijakanRefund: "Refund sesuai kebijakan hotel.",
      kebijakanReschedule: "Reschedule sesuai ketersediaan kamar.",
      jamCheckIn: "14:00",
      jamCheckOut: "12:00",
      gambarThumbnail: "/assets/room-villa.jpg",
      galeriGambar: ["/assets/room-villa.jpg", "/assets/room-suite.jpg"],
      isActive: true,
    },
  ];

  const slugs = seedTypes.map((t) => t.slug);
  await RoomType.deleteMany({ slug: { $in: slugs } });
  const createdTypes = await RoomType.insertMany(seedTypes);

  const bySlug = new Map(createdTypes.map((t) => [t.slug, t]));

  const seedRooms = [
    { nomorKamar: "101", roomTypeId: bySlug.get("standard")._id, lantai: 1, status: "tersedia" },
    { nomorKamar: "102", roomTypeId: bySlug.get("standard")._id, lantai: 1, status: "terisi" },
    { nomorKamar: "201", roomTypeId: bySlug.get("deluxe")._id, lantai: 2, status: "tersedia" },
    { nomorKamar: "202", roomTypeId: bySlug.get("deluxe")._id, lantai: 2, status: "dipesan" },
    { nomorKamar: "301", roomTypeId: bySlug.get("suite")._id, lantai: 3, status: "tersedia" },
    { nomorKamar: "V01", roomTypeId: bySlug.get("villa")._id, lantai: 0, status: "tersedia" },
  ];

  const roomNos = seedRooms.map((r) => r.nomorKamar);
  await Room.deleteMany({ nomorKamar: { $in: roomNos } });
  await Room.insertMany(seedRooms);

  console.log(`Seeded roomTypes=${createdTypes.length}, rooms=${seedRooms.length}`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

