# Roadmap Fitur Kantor Posto Administrativo

Roadmap ini membagi pengembangan menjadi tahap kecil agar fitur yang sudah bekerja
tetap aman. Setiap tahap harus melalui pemeriksaan akses, data contoh, pengujian,
ESLint, dan build sebelum dilanjutkan.

## Tahap 1 — Tugas Kantor (selesai)

- Daftar tugas dari disposisi Karta Tama.
- Ringkasan diproses, terlambat, menunggu pemeriksaan, dan selesai.
- Staf hanya melihat tugas yang diberikan kepadanya.
- Pimpinan dan Administrator melihat seluruh tugas.
- Pencarian, filter status, tenggat, dan penanggung jawab.

## Tahap 2 — Pelayanan Administrasi (fondasi selesai)

- Nomor pelayanan otomatis. ✅
- Jenis pelayanan dan daftar persyaratan. ✅
- Pemohon, asal/Suco, dan tanggal masuk. ✅
- Penanggung jawab, status, tenggat, dan tanggal penyelesaian. ✅
- Riwayat perubahan dan penanda keterlambatan. ✅
- Data pengembangan wajib menggunakan data contoh.

Pengembangan lanjutan modul ini dapat menambahkan daftar persyaratan berbentuk
checklist, penyerahan hasil kepada pemohon, serta statistik pelayanan pada
Dashboard.

## Tahap 3 — Template Karta Sai (fondasi selesai)

- Template undangan, pemberitahuan, rekomendasi, tugas, dan balasan. ✅
- Editor isi dalam Tetun, Portugis, dan Indonesia. ✅
- Pengisian nomor, tanggal, tujuan, perihal, isi, serta penandatangan. ✅
- Pratinjau sebelum disimpan. ✅
- Tetap mengikuti proses persetujuan Karta Sai yang sudah ada. ✅

## Tahap 4 — Kalender dan Pengingat (fondasi selesai)

- Kalender rapat, kegiatan, kunjungan, pelayanan, dan tenggat. ✅
- Prioritas, waktu, lokasi, penanggung jawab, dan status agenda. ✅
- Pengingat otomatis untuk agenda lewat yang belum selesai. ✅
- Hubungan langsung dengan Tugas Kantor dan Laporan Kegiatan akan dilanjutkan.

## Tahap 5 — Pengaduan dan Aspirasi (fondasi selesai)

- Nomor KA, kategori, lokasi, ringkasan, dan prioritas. ✅
- Penanggung jawab dan riwayat tindak lanjut. ✅
- Status baru, diproses, menunggu, selesai, dan ditutup. ✅
- Pembatasan akses untuk isi yang sensitif. ✅
- Pelapor anonim dan larangan menyimpan identitas yang tidak diperlukan. ✅

## Tahap 6 — Buku Tamu (fondasi selesai)

- Nomor LV, nama, asal, tujuan, staf yang ditemui, serta jam masuk/keluar. ✅
- Tombol keluar cepat dan validasi urutan waktu. ✅
- Hindari pengumpulan informasi pribadi yang tidak diperlukan. ✅
- Rekap dan filter kunjungan harian. ✅

## Tahap 7 — Inventaris Kantor (kode selesai; migration lokal tertunda)

- Kode aset, nama barang, lokasi, kondisi, dan penanggung jawab. ✅
- Jumlah, status, tanggal perolehan, dan jadwal pemeriksaan. ✅
- Pengingat barang rusak atau terlambat diperiksa. ✅
- Riwayat pemindahan dan perawatan akan dilanjutkan.
- Migration `0020_office_assets.sql` belum diterapkan karena batas penggunaan alat.

## Tahap 8 — Laporan Otomatis

- Rekap Karta Tama/Karta Sai, tugas, pelayanan, pengaduan, kegiatan, dan keuangan.
- Filter periode, Suco, status, serta penanggung jawab.
- Ekspor CSV dan tampilan cetak/PDF.

## Tahap 9 — Backup dan Pemulihan

- Status backup D1 dan inventaris file R2.
- Pemeriksaan integritas serta petunjuk pemulihan.
- Backup sebelum migration atau perubahan besar.

## Aturan setiap tahap

1. Tidak menghapus migration atau fitur lama.
2. Tidak menggunakan data penduduk asli untuk pengujian.
3. Tidak menyimpan password, token, atau data rahasia dalam kode.
4. Terapkan akses Administrator, Pimpinan, Staf, dan Viewer.
5. Sediakan Tetun, Portugis, dan Indonesia.
6. Jalankan pengujian, ESLint, dan build.
7. Deployment hanya dilakukan setelah izin pengguna.
