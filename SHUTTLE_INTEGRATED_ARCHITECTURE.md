# 🚌 Arsitektur Sistem Shuttle PYU-GO Connect (Terbarui)

**Tanggal:** 14 April 2026  
**Status:** Integrasi Mendalam (Rayon → Titik Jemput → Service → Cars → Jadwal)

---

## 1. 🏗️ Model Data & Relasi

Sistem shuttle dibangun di atas struktur relasional yang ketat untuk memastikan integritas data dan kemudahan navigasi.

### Entitas Inti:
- **`shuttle_routes`**: Definisi rute utama (Asal → Tujuan).
- **`shuttle_rayons`**: Zona geografis spesifik rute (`route_id`).
- **`shuttle_pickup_points`**: Lokasi penjemputan detail dalam rayon (`rayon_id`).
- **`shuttle_service_types`**: Kelas layanan (e.g., Standard, Executive) per rute (`route_id`).
- **`shuttle_service_vehicle_types`**: Pemetaan model kendaraan ke layanan dan rute.
- **`shuttle_schedules`**: Jadwal keberangkatan rute.
- **`shuttle_schedule_services`**: Ketersediaan kursi per layanan pada jadwal tertentu.

---

## 2. 🔄 Alur Bisnis Terintegrasi (UX Flow)

Untuk meningkatkan pengalaman pengguna, alur navigasi diubah menjadi lebih intuitif berbasis lokasi:

1. **Seleksi Rayon & Titik Jemput**: 
   - User memilih wilayah (Rayon) yang secara otomatis mengidentifikasi rute.
   - User memilih titik jemput spesifik untuk mendapatkan estimasi waktu jemput lokal.
2. **Seleksi Layanan (Service)**:
   - User memilih kelas layanan yang diinginkan (e.g., Executive untuk kenyamanan lebih).
3. **Seleksi Kendaraan (Cars)**:
   - Berdasarkan layanan, user memilih jenis kendaraan (e.g., Hiace, SUV).
4. **Seleksi Jadwal**:
   - Menampilkan jadwal yang tersedia untuk kombinasi rute, layanan, dan kendaraan yang dipilih.
5. **Konfirmasi & Pembayaran**:
   - Ringkasan pemesanan dengan perhitungan harga otomatis (Base Fare + Service Premium + Rayon Surcharge).

---

## 🛠️ Rekomendasi Perbaikan & Optimasi

### A. Level Database (Integritas & Performa)
- **Atomic Booking RPC**: Migrasi seluruh logika `createBooking` dari TypeScript ke satu fungsi PostgreSQL RPC (`create_shuttle_booking_atomic`) untuk mencegah *race conditions* pada pemilihan kursi.
- **Materialized Views**: Pertimbangkan penggunaan *Materialized View* untuk ringkasan ketersediaan jadwal harian jika volume data meningkat drastis.
- **Composite Indexing**: Pastikan indeks komposit pada `(route_id, active, departure_time)` ada untuk mempercepat pencarian jadwal.

### B. Level Backend Service (`ShuttleService.ts`)
- **Batch Queries**: Ganti pemanggilan RPC berulang dalam loop (N+1) dengan satu query join yang mengambil seluruh data layanan untuk semua jadwal sekaligus.
- **Server-Side Pricing**: Pindahkan seluruh logika kalkulasi harga ke SQL function untuk menjamin konsistensi antara Admin dan User App.

### C. Level User Experience (UX)
- **Location-First Search**: Ubah landing page shuttle agar user mencari berdasarkan "Lokasi Terdekat" (Rayon) daripada daftar rute yang statis.
- **Visual Seat Map**: Implementasi peta kursi interaktif yang mencerminkan tipe kendaraan (Mini Car vs Hiace).
- **Real-time Availability**: Gunakan Supabase Realtime untuk mengupdate sisa kursi secara instan tanpa refresh halaman.

---

## 🗺️ Roadmap Pengembangan (Berdasarkan Prioritas UX)

### Fase 1: Konsolidasi Data (Minggu 1-2) - **Prioritas Tinggi**
- [ ] Implementasi penuh RPC `create_shuttle_booking_atomic`.
- [ ] Penyeragaman logika harga antara frontend dan database.
- [ ] Pembersihan data sampah dan standarisasi penamaan rute/rayon.

### Fase 2: Integrasi UX Baru (Minggu 3-4) - **Prioritas Tinggi**
- [ ] Refactor `ShuttleRefactored.tsx` untuk mendukung alur Rayon-First.
- [ ] Pembuatan komponen `LocationPicker` yang lebih intuitif berbasis Rayon.
- [ ] Optimasi loading state dengan Skeleton UI pada setiap langkah pemilihan.

### Fase 3: Skalabilitas & Fitur Lanjut (Minggu 5-8) - **Prioritas Medium**
- [ ] Implementasi sistem kupon dan diskon per rute/layanan.
- [ ] Dashboard analitik untuk Admin guna memantau rute paling menguntungkan.
- [ ] Integrasi pelacakan armada secara real-time untuk penumpang.
