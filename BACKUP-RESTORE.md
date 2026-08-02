# Backup dan Pemulihan Lokal

Panduan ini hanya untuk lingkungan lokal. Jangan menjalankannya terhadap
database produksi.

## Membuat backup

Hentikan perubahan data sementara, lalu jalankan:

```powershell
npm run backup:local
```

Sistem membuat folder bertanggal di dalam `backups/`. Isinya:

- `database.sql`: seluruh schema dan data D1 lokal;
- `drizzle/`: salinan seluruh migration;
- `r2-state/`: state penyimpanan R2 lokal jika tersedia;
- `manifest.json`: tanggal, cakupan, dan checksum database.

Folder backup dapat berisi data sensitif. Jangan commit, unggah, atau kirim
folder tersebut kepada orang lain.

## Memeriksa backup

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-backup.ps1 `
  -BackupPath backups/local-YYYYMMDD-HHMMSS
```

Hanya gunakan backup yang menampilkan `Backup valid`.

## Memulihkan backup

Pemulihan mengganti state D1 dan R2 lokal. Tutup `npm run dev` terlebih dahulu.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-local.ps1 `
  -BackupPath backups/local-YYYYMMDD-HHMMSS `
  -Confirmation PULIHKAN-DATABASE-LOKAL
```

Sebelum mengganti state, script memindahkan state yang sedang digunakan ke
folder `backups/pre-restore-...`. Karena itu, kondisi sebelum pemulihan masih
dapat dikembalikan secara manual.

Setelah pemulihan:

1. Jalankan `npm run dev`.
2. Login menggunakan akun yang tersimpan pada waktu backup dibuat.
3. Periksa Dashboard dan jumlah data.
4. Buka Arsip Dokumen dan jalankan **Periksa Integritas**.

## Produksi

Backup dan pemulihan produksi belum diaktifkan. Proses produksi harus memakai
database/bucket ID asli, kontrol akses Cloudflare, penyimpanan backup terenkripsi,
dan persetujuan pemilik aplikasi.
