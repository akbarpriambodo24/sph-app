# 📄 Aplikasi Surat Penawaran Harga (SPH)
PT. Lapan Alpha Kirana

## Cara Menjalankan

### Prasyarat
- Node.js versi 16 atau lebih baru (unduh di https://nodejs.org)

### Langkah Instalasi
1. Ekstrak folder `sph-app`
2. Buka terminal, masuk ke folder tersebut:
   ```
   cd sph-app
   ```
3. Install dependensi (hanya sekali):
   ```
   npm install
   ```
4. Jalankan server:
   ```
   npm start
   ```
5. Buka browser: **http://localhost:3000**

---

## Akun Default
| Role  | Username | Password   |
|-------|----------|------------|
| Admin | admin    | admin123   |
| Staff | staff1   | staff123   |

> ⚠️ Ganti password default setelah login pertama melalui menu **Kelola Pengguna**

---

## Fitur Utama

### 👤 Staff
- Buat pengajuan Surat Penawaran Harga baru
- Isi informasi penerima, daftar produk, kondisi, dan link info produk
- Lihat status pengajuan (Menunggu / Disetujui / Ditolak)
- Unduh dokumen DOCX setelah disetujui admin

### 👑 Admin
- Lihat semua pengajuan dari seluruh staff
- Setujui pengajuan → nomor surat otomatis dibuat
- Tolak pengajuan dengan keterangan alasan
- Unduh dokumen DOCX
- Kelola pengguna (tambah / hapus)
- Atur pengaturan perusahaan & penanda tangan

### 📄 Dokumen DOCX
- Format sesuai template surat penawaran harga
- Kolom "Info" berisi **QR Code** yang mengarah ke link produk
- Logo perusahaan otomatis muncul di header
- Nomor surat otomatis: `001/PMH-LAK/III/2026`

---

## Menambah Logo Perusahaan
Ganti file `public/img/logo.png` dengan logo perusahaan Anda (format PNG, ukuran 400×100px direkomendasikan).

---

## Troubleshooting
- **Port sudah digunakan**: Jalankan dengan port lain: `PORT=3001 npm start`
- **Data tersimpan di**: `data/sph.db` (SQLite)
