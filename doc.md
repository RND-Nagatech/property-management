# Dokumentasi Proyek Stayly Manajemen Properti

## Struktur Proyek

- `client/` — Frontend utama (React + Vite + TypeScript)
  - `src/`
    - `routes/` — Semua halaman utama (landing, kamar, booking, admin, dsb)
    - `components/` — Komponen UI reusable (button, input, dsb)
    - `lib/` — Data statis, utilitas, dan helper
    - `assets/` — Gambar, ikon, dsb
    - `hooks/` — Custom React hooks
  - `package.json`, `vite.config.ts`, dsb — Konfigurasi project

## Alur Utama Aplikasi

1. **Landing Page** (`/`)
   - Form pencarian: tanggal check-in/out, tamu, kamar (sudah interaktif)
   - Button "Cari Kamar" mengarahkan ke halaman pencarian kamar

2. **Halaman Kamar** (`/kamar`, `/kamar/:id`)
   - Daftar kamar dan detail kamar
   - Di detail kamar, user bisa pilih tanggal & tamu (interaktif)
   - Button "Booking Sekarang" mengarahkan ke proses booking

3. **Booking Saya** (`/booking-saya`)
   - Menampilkan daftar booking user
   - Tab filter (Semua, Aktif, Selesai, Dibatalkan)
   - Perlu integrasi ke backend untuk data booking user

4. **Admin** (`/admin/*`)
   - Kelola kamar, booking, pembayaran, tamu, dsb
   - Banyak fitur masih mockup/hardcoded, perlu integrasi ke backend

## Catatan Button/Feature yang Belum Fungsi

- Banyak data masih hardcoded di file (array di dalam file route)
- Button edit, tambah, hapus, filter, dsb di halaman admin dan customer hanya mengubah state lokal atau belum ada aksi sama sekali
- Belum ada API call ke backend (fetch/axios)
- Belum ada integrasi autentikasi user/admin

## Langkah Integrasi Backend/MongoDB

1. **Siapkan Backend (Node.js/Express/Next.js/Remix, dsb)**
   - Buat endpoint REST API atau GraphQL untuk resource: kamar, booking, user, pembayaran, dsb
   - Koneksi ke MongoDB (pakai mongoose/mongodb driver)
   - Contoh endpoint:
     - `GET /api/kamar` — List kamar
     - `POST /api/booking` — Buat booking baru
     - `GET /api/booking?user=...` — List booking user
     - `POST /api/login` — Login user/admin

2. **Ubah Semua Data Hardcoded di Frontend**
   - Ganti array statis (misal bookings, rooms, tamu) dengan fetch ke API backend
   - Gunakan React hooks (`useEffect`, `useState`) untuk ambil data dari backend
   - Contoh:
     ```tsx
     useEffect(() => {
       fetch('/api/kamar').then(res => res.json()).then(setRooms);
     }, []);
     ```

3. **Integrasi Form & Button**
   - Semua button (edit, tambah, hapus, booking, dsb) harus memanggil API backend
   - Contoh submit booking:
     ```tsx
     fetch('/api/booking', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ ...data })
     })
     ```
   - Update UI setelah response sukses/gagal

4. **Autentikasi**
   - Implementasi login/register di backend
   - Simpan token (JWT/cookie) di frontend
   - Kirim token di setiap request yang butuh autentikasi

5. **Error Handling & Loading State**
   - Tampilkan loading spinner saat fetch data
   - Tampilkan pesan error jika API gagal

## Tips Memperbaiki/Mengaktifkan Semua Button/Feature

- Cari semua array data statis di file `src/routes/` dan `src/lib/data.ts`, ganti dengan fetch ke backend
- Semua aksi (edit, tambah, hapus, booking, dsb) harus trigger API, bukan hanya setState
- Untuk admin, pastikan ada endpoint CRUD untuk semua resource
- Untuk customer, pastikan booking, pembayaran, dsb, terhubung ke backend
- Cek semua button yang belum ada onClick/onSubmit, tambahkan handler yang memanggil API

## Saran Struktur API (MongoDB)

- **Kamar**: { id, name, price, gallery, capacity, ... }
- **Booking**: { id, userId, roomId, checkin, checkout, guests, status, ... }
- **User**: { id, name, email, passwordHash, ... }
- **Pembayaran**: { id, bookingId, amount, status, ... }

## Testing
- Setelah integrasi, test semua fitur: booking, edit kamar, tambah tamu, pembayaran, dsb
- Pastikan semua button benar-benar trigger API dan update data

---

> Dokumentasi ini bisa dikembangkan sesuai kebutuhan tim. Untuk detail implementasi backend, sesuaikan dengan stack yang dipilih (Express, Next.js, Remix, dsb).
