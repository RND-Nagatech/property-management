export type RoomType = {
  _id: string;
  namaTipe: string;
  slug: string;
  deskripsi: string;
  fasilitasUtama: string[];
  fasilitasKamar: string[];
  fasilitasKamarMandi: string[];
  hargaDefault: number;
  kapasitas: number;
  ukuranKamar: number;
  tipeKasur: string;
  includeSarapan: boolean;
  depositDefault: number;
  kebijakanRefund: string;
  kebijakanReschedule: string;
  jamCheckIn: string;
  jamCheckOut: string;
  gambarThumbnail: string;
  galeriGambar: string[];
  isActive: boolean;
  // derived (aggregation)
  totalKamar?: number;
  kamarTersedia?: number;
};

export type RoomStatus = "tersedia" | "dipesan" | "terisi" | "perbaikan";

export type Room = {
  _id: string;
  nomorKamar: string;
  roomTypeId: string | RoomType;
  lantai: number;
  status: RoomStatus;
  catatan: string;
  hargaOverride?: number;
};
