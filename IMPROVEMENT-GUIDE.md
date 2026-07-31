# Panduan Perbaikan & Pengembangan Sistema Administrasaun Postu

## Prioritas 1 — Bug & Hardcode

### 1.1 Dashboard tanggal hardcode
**File:** `app/page.tsx:104`
**Masalah:** Tanggal "JUMAT, 31 JULI 2026" ditulis manual.
**Perbaikan:** Ganti dengan `new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })`.

### 1.2 Usia penduduk hardcode
**File:** `app/components/ResidentData.tsx:27`
**Masalah:** `new Date("2026-07-31")` hardcode, usia tidak akurat setelah lewat tanggal tersebut.
**Perbaikan:** Ganti dengan `new Date()` agar usia dihitung dari tanggal saat ini.

### 1.3 Filter bulan/tahun hardcode
**File:**
- `app/components/ActivityReports.tsx:69` — hardcode `"2026-07"`
- `app/components/DocumentArchive.tsx:58` — hardcode `2026`

**Perbaikan:** Gunakan `new Date().toISOString().slice(0, 7)` untuk bulan dan `new Date().getFullYear()` untuk tahun.

---

## Prioritas 2 — Fitur CRUD Lengkap (Edit & Hapus)

### 2.1 Tambahkan tombol Edit & Hapus di setiap modul

**Modul yang perlu diperbarui:**
- `IncomingMail.tsx` — tambah kolom Aksi dengan tombol Edit & Hapus
- `OutgoingMail.tsx` — tambah kolom Aksi dengan tombol Edit & Hapus
- `ResidentData.tsx` — tambah kolom Aksi dengan tombol Edit & Hapus
- `ActivityReports.tsx` — tambah kolom Aksi dengan tombol Edit & Hapus
- `Finance.tsx` — tambah tombol Hapus untuk pengeluaran
- `DocumentArchive.tsx` — tambah tombol Hapus

### 2.2 API routes — tambah method DELETE & PATCH (edit)

**File yang perlu ditambah:**
- `app/api/incoming-letters/route.ts` — tambah `DELETE` handler + perluas `PATCH` untuk semua field
- `app/api/outgoing-letters/route.ts` — tambah `DELETE` + perluas `PATCH`
- `app/api/residents/route.ts` — tambah `DELETE` + tambah `PATCH`
- `app/api/activity-reports/route.ts` — tambah `DELETE` + perluas `PATCH`
- `app/api/finance/route.ts` — tambah `DELETE`
- `app/api/documents/route.ts` — tambah `DELETE`

### 2.3 Komponen modal Edit

**Pendekatan:** Buat form edit dengan modal yang sama seperti form tambah, tapi field terisi data yang sudah ada.

**Contoh pola untuk semua modul:**
```
1. State: editingItem (item yang sedang diedit) atau null
2. Tombol Edit → setEditingItem(item), setShowForm(true)
3. Form terisi dengan data editingItem
4. Submit → PATCH ke API → update state lokal → tutup modal
```

---

## Prioritas 3 — Dashboard Real-Time

### 3.1 Buat API endpoint dashboard

**File baru:** `app/api/dashboard/route.ts`

**Endpoint GET** yang mengembalikan:
```json
{
  "incomingLetters": { "total": 0, "newCount": 0, "processedCount": 0 },
  "outgoingLetters": { "total": 0, "pendingApproval": 0, "sent": 0 },
  "residents": { "total": 0, "households": 0, "male": 0, "female": 0 },
  "documents": { "total": 0, "storageUsed": 0 },
  "recentActivities": [],
  "budgetSummary": { "total": 0, "realized": 0, "remaining": 0 }
}
```

### 3.2 Perbarui Dashboard

**File:** `app/page.tsx`

- Hapus semua data hardcode di `activities`, `initialTasks`
- Fetch dari `/api/dashboard` saat mount
- Statistik card → ambil dari API
- Aktivitas terbaru → ambil dari `recentActivities`
- Ringkasan anggaran → ambil dari `budgetSummary`

---

## Prioritas 4 — Pagination

### 4.1 Komponen pagination

**File baru:** `app/components/Pagination.tsx`

```tsx
type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};
```

### 4.2 Terapkan di setiap tabel

**Modul:** Semua modul yang punya tabel (IncomingMail, OutgoingMail, ResidentData, ActivityReports, Finance, DocumentArchive)

**Pendekatan:**
- Tampilkan 15 item per halaman
- Pagination di bawah tabel
- Server-side pagination: tambah query params `?page=1&limit=15` di API

---

## Prioritas 5 — Export Data

### 5.1 Fungsi utilitas export

**File baru:** `app/utils/export.ts`

```ts
export function exportToCSV(data: Record<string, unknown>[], filename: string): void
export function printTable(tableId: string): void
```

### 5.2 Tombol Export di setiap modul

Tambahkan tombol "Export CSV" dan "Cetak" di toolbar setiap modul.

---

## Prioritas 6 — Audit Log Otomatis

### 6.1 Buat fungsi helper

**File baru:** `app/utils/audit.ts`

```ts
export async function writeAuditLog(
  db: Database,
  params: { actorEmail: string; actorName: string; action: string; module: string; details: string }
): Promise<void>
```

### 6.2 Panggil di setiap API write

**File:** Semua route.ts yang punya `POST`, `PATCH`, `DELETE`

Tambahkan `await writeAuditLog(db, { ... })` setelah operasi berhasil.

---

## Prioritas 7 — UX Improvements

### 7.1 Toast notification

**File baru:** `app/components/Toast.tsx`

- Auto-dismiss setelah 3 detik
- Tipe: success, error, info
- Ganti semua `setMessage()` dengan toast

### 7.2 Loading skeleton

**File baru:** `app/components/Skeleton.tsx`

- Buat komponen skeleton placeholder untuk tabel dan kartu
- Ganti teks "Memuat data..." dengan skeleton

### 7.3 Search debounce

**File baru:** `app/utils/useDebounce.ts`

```ts
export function useDebounce<T>(value: T, delay: number): T
```

Terapkan di input search semua modul.

---

## Prioritas 8 — Keamanan

### 8.1 Auth check di API

**File:** `app/security.ts` (sudah ada, perlu dipastikan terpakai)

- Pastikan setiap API route memanggil fungsi auth check
- Kembalikan 401 jika tidak terautentikasi

### 8.2 Input sanitization

**File baru:** `app/utils/sanitize.ts`

```ts
export function sanitizeInput(input: string): string
```

Panggil di semua POST/PATCH handler sebelum insert ke database.

---

## Urutan Pengerjaan

| Langkah | Prioritas | Estimasi |
|---------|-----------|----------|
| 1. Fix hardcode tanggal | Tinggi | 15 menit |
| 2. API DELETE + PATCH untuk semua modul | Tinggi | 1 jam |
| 3. Tombol Edit & Hapus di semua modul | Tinggi | 2 jam |
| 4. Dashboard real-time API + update UI | Sedang | 1.5 jam |
| 5. Audit log otomatis | Sedang | 45 menit |
| 6. Pagination | Sedang | 1.5 jam |
| 7. Toast notification | Rendah | 45 menit |
| 8. Export CSV | Rendah | 30 menit |
| 9. Loading skeleton | Rendah | 30 menit |
| 10. Search debounce | Rendah | 15 menit |
| 11. Auth check & sanitization | Sedang | 1 jam |

---

## Catatan Teknis

- **Framework:** Next.js 16 + Vinext (Cloudflare)
- **Database:** D1 (SQLite) via Drizzle ORM
- **Tidak ada file config wrangler** — proyek pakai vinext bawaan
- **Scripts pakai bash** — `scripts/sites-env.sh` untuk env wrapper
- **Testing:** `node --test tests/rendered-html.test.mjs`
- **Build:** `npm run build` → validasi otomatis
