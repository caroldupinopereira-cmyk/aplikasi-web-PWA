# Rencana Aktivasi Cloudflare Access

Dokumen ini tidak berisi email staf, token, atau nilai konfigurasi produksi.

## Environment variable yang diperlukan

- `CF_ACCESS_TEAM_DOMAIN`  
  Contoh bentuk: `https://nama-tim.cloudflareaccess.com`
- `CF_ACCESS_AUD`  
  Application Audience (AUD) Tag dari aplikasi Cloudflare Access.
- `CF_ACCESS_INITIAL_ADMIN_EMAIL`  
  Email Administrator pertama. Nilai ini harus disimpan sebagai konfigurasi
  environment, tidak ditulis di source code.

Jika `CF_ACCESS_TEAM_DOMAIN` dan `CF_ACCESS_AUD` belum tersedia, aplikasi tetap
memakai identitas preview lama sebagai mode transisi. Setelah keduanya tersedia,
mode transisi otomatis berhenti dan hanya JWT Cloudflare Access yang diterima.

## Urutan aktivasi produksi

1. Buat aplikasi Cloudflare Access untuk alamat produksi.
2. Aktifkan One-time PIN sebagai metode masuk.
3. Buat kebijakan `Allow` yang menyebutkan tepat empat email staf.
4. Jangan gunakan aturan `Include Everyone` atau semua email valid.
5. Salin Team Domain dan Application Audience Tag.
6. Tambahkan tiga environment variable di atas.
7. Pastikan email Administrator pertama cocok dengan
   `CF_ACCESS_INITIAL_ADMIN_EMAIL`.
8. Uji akun Administrator lebih dahulu.
9. Tambahkan atau perbarui tiga akun lain melalui Pengaturan.
10. Uji peran Pimpinan, Staf, Viewer, akun nonaktif, dan proses keluar.

## Catatan keamanan

- Aplikasi memvalidasi tanda tangan JWT, issuer, dan audience.
- Identitas tidak diambil hanya dari header email.
- Kata sandi dan kode OTP tidak disimpan di D1.
- Keluar dari aplikasi menggunakan `/cdn-cgi/access/logout`.
- Setelah migrasi berhasil, helper ChatGPT lama dapat dihapus pada tahap
  pembersihan terakhir.
