# Rencana Pengembangan

## Tahap 1 — Keamanan dasar

- [x] Wajibkan identitas pengguna pada seluruh API.
- [x] Terapkan hak akses Administrator, Pimpinan, Staf, dan Viewer.
- [x] Batasi perubahan data ke peran operasional.
- [x] Batasi penghapusan dan pengelolaan keuangan ke peran berwenang.
- [x] Aktifkan audit log untuk operasi tambah, ubah, dan hapus.
- [x] Validasi ID dan tanggal pada endpoint utama.
- [x] Tampilkan identitas pengguna aktif, bukan profil statis.

## Tahap 2 — Integritas data

- [ ] Tambahkan indeks unik untuk nomor surat, nomor penduduk, nomor laporan, dan nomor kuitansi.
- [ ] Tambahkan nomor dokumen otomatis yang dapat dikonfigurasi.
- [ ] Satukan skema validasi formulir dan API.
- [ ] Tambahkan pagination, filter, dan pencarian di sisi server.
- [ ] Tambahkan mekanisme arsip/nonaktif sebagai pengganti penghapusan permanen.

## Tahap 3 — Alur kerja

- [ ] Persetujuan surat keluar dan pengeluaran.
- [ ] Notifikasi untuk surat baru, persetujuan, dan tugas tertunda.
- [ ] Lampiran surat dan laporan kegiatan.
- [ ] Pencarian global lintas modul.
- [ ] Riwayat perubahan per rekaman.

## Tahap 4 — Pelaporan

- [ ] Ekspor PDF dan Excel/CSV.
- [ ] Impor penduduk dari Excel dengan pratinjau dan validasi.
- [ ] Grafik statistik penduduk, surat, kegiatan, dan anggaran.
- [ ] Template cetak dengan logo dan identitas kantor.

## Tahap 5 — Kesiapan operasional

- [ ] Pengujian API, hak akses, formulir, dan migrasi database.
- [ ] Strategi backup dan pemulihan D1/R2.
- [ ] Audit aksesibilitas dan penggunaan melalui telepon.
- [ ] Dokumentasi operator dan administrator.
- [ ] Dukungan antarmuka Bahasa Indonesia dan Tetum.

## Matriks hak akses

| Tindakan | Administrator | Pimpinan | Staf | Viewer |
| --- | --- | --- | --- | --- |
| Membaca data | Ya | Ya | Ya | Ya |
| Menambah/mengubah data operasional | Ya | Ya | Ya | Tidak |
| Menghapus data operasional | Ya | Ya | Tidak | Tidak |
| Mengelola anggaran/pengeluaran | Ya | Ya | Tidak | Tidak |
| Menghapus data keuangan | Ya | Tidak | Tidak | Tidak |
| Mengelola akun staf | Ya | Tidak | Tidak | Tidak |
