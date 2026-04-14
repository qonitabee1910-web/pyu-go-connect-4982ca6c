# 🚌 Analisis Komprehensif Sistem Shuttle PYU-GO Connect

**Tanggal Analisis:** 14 April 2026  
**Fokus:** Alur End-to-End, Efisiensi Operasional, & Pengalaman Penumpang

---

## 1. 🔄 Dokumentasi Alur Proses (Flowchart)

Sistem shuttle beroperasi melalui rangkaian proses terintegrasi antara Penumpang, Admin, Driver Utama, dan Driver Penjemput.

### A. Tahap Pemesanan (Passenger Flow)
1. **Pencarian Rute**: Penumpang memilih rute asal-tujuan.
2. **Pemilihan Jadwal**: Memilih jam keberangkatan yang tersedia.
3. **Konfigurasi Layanan**: Memilih tipe layanan (Express/Reguler) dan jenis kendaraan.
4. **Penentuan Titik Jemput**: Memilih **Rayon** (wilayah) dan **Titik Jemput** spesifik dalam rayon tersebut.
5. **Reservasi Kursi**: Memilih nomor kursi (menggunakan sistem *atomic locking* untuk mencegah *double booking*).
6. **Input Data**: Mengisi informasi penumpang (nama & telepon).
7. **Pembayaran**: Memilih metode pembayaran (CASH/CARD/TRANSFER).
8. **Konfirmasi**: Penerbitan e-tiket dengan kode referensi unik.

### B. Tahap Manajemen Operasional (Admin & Driver Flow)
1. **Alokasi Jadwal**: Admin membuat jadwal perjalanan (`shuttle_schedules`) berdasarkan rute dan layanan.
2. **Penugasan Driver Utama**: Driver mengambil jadwal yang tersedia melalui dashboard (`assign_driver_to_shuttle`).
3. **Manajemen Penjemputan**: Untuk booking yang sudah **PAID**, Admin menugaskan Driver Penjemput (nama & plat nomor) untuk menjemput penumpang dari titik jemput ke lokasi transit utama.
4. **Keberangkatan**: Driver utama melakukan konfirmasi keberangkatan dari titik asal.
5. **Transit/Transfer**: Penumpang dijemput oleh armada kecil (penjemput) dan dibawa ke armada besar (shuttle utama).
6. **Kedatangan**: Konfirmasi kedatangan di titik tujuan akhir.

---

## 2. 🎭 Aktor & Data Terlibat

| Aktor | Peran Utama | Data yang Dibutuhkan |
|-------|-------------|----------------------|
| **Penumpang** | Pemesan & Pengguna | Rute, Jadwal, Saldo/Metode Pembayaran, Lokasi Jemput |
| **Admin** | Koordinator & Pengawas | Status Pembayaran, Ketersediaan Armada, Penugasan Penjemput |
| **Driver Utama** | Eksekutor Perjalanan | Daftar Penumpang, Rute Utama, Waktu Keberangkatan |
| **Driver Penjemput** | Pengumpan (Feeder) | Nama Penumpang, Titik Jemput Spesifik, Jam Jemput |

---

## 3. 🚩 Titik Keputusan & Potensi Bottleneck

### Titik Keputusan Kritis (Decision Points):
- **Verifikasi Pembayaran**: Menentukan apakah proses penjemputan dapat dimulai.
- **Alokasi Armada**: Penyesuaian kapasitas kendaraan dengan jumlah pemesanan pada jam sibuk.
- **Penentuan Rayon**: Pengelompokan penumpang untuk efisiensi rute penjemputan.

### Potensi Bottleneck & Kegagalan:
- ⚠️ **Manual Assignment**: Penugasan driver penjemput masih manual oleh admin, berisiko keterlambatan jika volume booking tinggi.
- ⚠️ **Sync Real-time**: Ketergantungan pada koneksi internet driver untuk update status keberangkatan/kedatangan.
- ⚠️ **Race Condition**: *Double booking* pada kursi yang sama (sudah dimitigasi dengan fungsi PostgreSQL atomic).
- ⚠️ **Komunikasi Penjemputan**: Kurangnya notifikasi otomatis ke penumpang saat driver penjemput ditugaskan.

---

## 📈 4. Metrik KPI (Key Performance Indicators)

Untuk mengukur efisiensi sistem shuttle, metrik berikut harus dipantau:

1. **Load Factor (LF)**: Persentase kursi terisi per perjalanan (Target: >75%).
2. **On-Time Performance (OTP)**: Persentase keberangkatan/kedatangan sesuai jadwal (Target: >95%).
3. **Pickup Wait Time**: Rata-rata waktu tunggu penumpang di titik jemput (Target: <10 menit).
4. **Booking Conversion Rate**: Persentase pencarian rute yang berujung pada booking sukses.
5. **Driver Response Time**: Waktu yang dibutuhkan driver untuk mengambil jadwal yang dipublikasikan admin.

---

## 💡 5. Rekomendasi Optimasi Berbasis Data

1. **Automated Dispatching**:
   Implementasi algoritma untuk otomatis menugaskan driver penjemput berdasarkan lokasi terdekat dan ketersediaan armada, mengurangi beban kerja admin.
   
2. **Real-time Feeder Tracking**:
   Menampilkan posisi driver penjemput di aplikasi penumpang (seperti fitur ride-sharing biasa) untuk meningkatkan transparansi dan kepuasan.

3. **Dynamic Pricing for Rayons**:
   Penyesuaian tarif otomatis berdasarkan jarak titik jemput ke rute utama atau tingkat permintaan di rayon tertentu.

4. **Push Notification Engine**:
   Otomatisasi notifikasi (WhatsApp/Push) saat:
   - Pembayaran berhasil dikonfirmasi.
   - Driver penjemput telah ditugaskan.
   - Armada utama akan segera berangkat.

5. **Integrated Manifest**:
   Dashboard driver utama yang menunjukkan status "Boarded" (Sudah Naik) untuk setiap penumpang yang dijemput oleh feeder secara real-time.

---
*Dokumentasi ini disusun untuk memberikan pandangan strategis bagi pengembangan fitur shuttle lebih lanjut.*
