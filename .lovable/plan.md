

# Titik Jemput Tidak Muncul — Analisis & Solusi

## Masalah

Dari data network request, ketika memilih rute **"HERMES - KNO AIRPORT"** (id: `f98144db`), query `shuttle_rayons` mengembalikan `[]` (kosong). Tidak ada rayon yang terhubung ke rute tersebut, sehingga langkah "Titik Jemput" dilewati langsung ke "Pilih Kursi".

Rute lain (Medan Kota, Medan Petisah, dll) sudah memiliki rayon dan titik jemput.

## Solusi

Tambahkan rayon dan titik jemput untuk rute HERMES via **database migration**:

### 1. Migration: Insert rayon untuk rute HERMES

```sql
INSERT INTO shuttle_rayons (id, route_id, name, description, active)
VALUES (
  gen_random_uuid(),
  'f98144db-c3a0-474e-98c2-fd94109986de',
  'Rayon Hermes',
  'Titik jemput area Hermes Palace',
  true
);
```

### 2. Migration: Insert pickup points untuk rayon baru tersebut

Contoh titik jemput:
- Hermes Palace (stop 1)
- Titik jemput lainnya sesuai kebutuhan

Dengan rayon dan pickup points yang terhubung ke rute HERMES, langkah "Titik Jemput" akan otomatis muncul saat user memilih jadwal di rute tersebut.

### Tidak Ada Perubahan Kode

Kode di `Shuttle.tsx` dan `PickupSelector.tsx` sudah benar — hanya data rayon yang belum ada untuk rute HERMES.

| Aksi | Detail |
|------|--------|
| Database migration | Insert rayon + pickup points untuk rute HERMES |
| Kode | Tidak ada perubahan |

