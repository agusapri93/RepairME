# RepairME

Aplikasi manajemen aset dan laporan kerusakan. Backend dan frontend berjalan dalam satu proses Bun:

- **Backend:** [ElysiaJS](https://elysiajs.com) + PostgreSQL + [DrizzleORM](https://orm.drizzle.team), di bawah `/api`
- **Frontend:** React + React Router + Tailwind CSS v4, di-bundle langsung oleh [Bun](https://bun.sh) dari `src/web/index.html` (Tailwind dikompilasi lewat `bun-plugin-tailwind`, lihat `bunfig.toml`)
- **UI:** layout dan komponen dari tema Metronic 9 (Tailwind React, layout "demo1"), dengan komponen ReUI berbasis Radix UI dan ikon lucide

> Sumber tema Metronic di folder `metronic/` diabaikan oleh git karena berlisensi. Hanya bagian yang dipakai yang disalin ke `src/web/components/ui`, `src/web/css`, `src/web/lib`, dan `src/web/hooks`.

## Fitur

| Menu                   | Isi                                                                     |
| ---------------------- | ----------------------------------------------------------------------- |
| Dashboard              | Ringkasan jumlah aset per kondisi, jadwal pemeliharaan rutin, dan laporan kerusakan |
| Aset                   | Data aset, riwayat dan jadwal pemeliharaan rutin                        |
| Laporan Kerusakan Aset | Laporan kerusakan dari pegawai maupun teknisi, beserta tindak lanjutnya |
| Master Data → Kategori Aset | Jenis aset beserta kodenya, dipakai saat mengisi data aset (khusus Administrator) |
| Master Data → Gedung   | Gedung (alamat, telepon, penanggung jawab) beserta ruangannya, dipakai sebagai lokasi aset (khusus Administrator) |
| User Management        | Kelola akun dan role pengguna (khusus Administrator)                    |

### Hak Akses

| Aksi                                         | Administrator | Teknisi | Pegawai          |
| -------------------------------------------- | :-----------: | :-----: | :--------------: |
| Melihat dashboard dan daftar aset            | ✓             | ✓       | ✓                |
| Tambah / ubah / hapus aset                   | ✓             |         |                  |
| Kelola kategori aset (Master Data)           | ✓             |         |                  |
| Kelola gedung & ruangan (Master Data)        | ✓             |         |                  |
| Mencatat pemeliharaan aset                   | ✓             | ✓       |                  |
| Membuat laporan kerusakan                    | ✓             | ✓       | ✓                |
| Melihat laporan kerusakan                    | Semua         | Semua   | Milik sendiri    |
| Menindaklanjuti laporan (status, catatan, kondisi aset) | ✓  | ✓       |                  |
| Ubah / hapus laporan                         | ✓             |         |                  |
| Kelola user                                  | ✓             |         |                  |

Hak akses diperiksa di backend (setiap endpoint), bukan hanya disembunyikan di frontend.

### Kategori Aset & Asset Tag

Lokasi aset dipilih dari **Gedung → Ruangan** di Master Data, atau dibiarkan "Belum ditempatkan". Gedung atau ruangan yang masih berisi aset tidak dapat dihapus; menghapus gedung ikut menghapus ruangannya yang kosong.

Setiap aset wajib memiliki kategori (jenis aset) dari Master Data. Saat aset dibuat, sistem membuat **Asset Tag** otomatis dengan format `<KODE KATEGORI>-<nomor urut>`, misalnya `LPT-0001`, `LPT-0002`, `PRN-0001`.

- Nomor urut dihitung per kategori dan tidak pernah dipakai ulang, meskipun asetnya dihapus.
- Asset Tag tidak dapat diubah, termasuk jika kategori aset dipindah.
- Kode kategori dikunci setelah dipakai oleh aset, dan kategori yang masih memiliki aset tidak dapat dihapus.

### Pemeliharaan Rutin

Aset yang memiliki **interval pemeliharaan** (dalam hari) dijadwalkan otomatis: jadwal berikutnya = tanggal pemeliharaan terakhir + interval. Jika belum pernah dipelihara, jadwal dihitung dari tanggal pembelian (atau tanggal aset didaftarkan). Dashboard menandai jadwal yang terlambat dan yang jatuh tempo dalam 7 hari.

## Requirements

- Bun 1.x
- PostgreSQL (instalasi lokal, atau Docker lewat `docker-compose.yml`)

## Setup

```bash
bun install
cp .env.example .env        # sesuaikan DATABASE_URL
docker compose up -d        # opsional: jalankan PostgreSQL di Docker
bun run db:migrate          # terapkan migrasi
bun run db:seed             # buat akun Administrator pertama
bun run dev                 # jalankan server dengan watch mode + hot reload
```

Buka `http://localhost:3000` lalu login dengan akun dari `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (default `admin@repairme.local` / `admin12345`). Segera ganti password-nya lewat menu User Management, lalu tambahkan kategori aset di **Master Data → Kategori Aset** sebelum mengisi data aset.

> Jika password database mengandung karakter khusus, tulis dalam bentuk URL-encoded di `DATABASE_URL` (misalnya `#` menjadi `%23`).

## Scripts

| Script                | Keterangan                                                   |
| --------------------- | ------------------------------------------------------------ |
| `bun run dev`         | Jalankan server dengan watch mode dan hot reload frontend    |
| `bun run start`       | Jalankan server dalam mode production                        |
| `bun run typecheck`   | Type-check backend dan frontend                              |
| `bun run db:generate` | Buat migrasi baru dari perubahan di `src/db/schema.ts`       |
| `bun run db:migrate`  | Terapkan migrasi yang belum dijalankan                       |
| `bun run db:seed`     | Buat Administrator pertama (dilewati jika sudah ada)         |
| `bun run db:studio`   | Buka Drizzle Studio                                          |

## Struktur Project

```
src/
  index.ts              # entry point: Bun.serve untuk frontend + /api
  app.ts                # Elysia app (/api), error handling, registrasi modul
  config/env.ts         # environment variables
  shared/constants.ts   # role, kondisi, status, prioritas (dipakai backend & frontend)
  db/
    index.ts            # koneksi Drizzle + PostgreSQL
    schema.ts           # definisi tabel
    seed.ts             # seed Administrator pertama
  lib/
    auth.ts             # session cookie + macro `auth` untuk cek login & role
    maintenance.ts      # perhitungan jadwal pemeliharaan
    schema.ts           # helper validasi request
  modules/
    auth/               # login, logout, me
    dashboard/          # ringkasan dashboard
    categories/         # master data kategori aset
    buildings/          # master data gedung & ruangan
    assets/             # aset (Asset Tag otomatis) + catatan pemeliharaan
    reports/            # laporan kerusakan + tindak lanjut
    users/              # user management
    health/             # health check
  web/
    index.html, main.tsx, App.tsx, styles.css
    api.ts, auth.tsx    # API client dan auth context
    theme.tsx           # mode terang/gelap
    config/menu.ts      # menu sidebar (beserta role yang boleh melihatnya) dan breadcrumb
    components/
      layout/           # sidebar, header, menu user (layout Metronic demo1)
      common.tsx        # komponen bersama: toolbar halaman, badge status, form dialog, konfirmasi, dll.
      ui/               # komponen ReUI dari Metronic
    css/                # token warna ReUI dan CSS layout Metronic
    pages/              # halaman per menu
drizzle/                # migrasi SQL hasil generate
```

## API

Semua endpoint berada di bawah `/api` dan memakai session cookie `httpOnly` dari `POST /api/auth/login`.

| Method | Path                                    | Akses                  |
| ------ | --------------------------------------- | ---------------------- |
| GET    | `/health`                               | Publik                 |
| POST   | `/auth/login`, `/auth/logout`           | Publik                 |
| GET    | `/auth/me`                              | Login                  |
| GET    | `/dashboard`                            | Login                  |
| GET    | `/categories`                           | Login                  |
| POST   | `/categories`                           | Administrator          |
| PATCH / DELETE | `/categories/:id`               | Administrator          |
| GET    | `/buildings`, `/buildings/:id` (termasuk ruangan) | Login        |
| POST   | `/buildings`, `/buildings/:id/rooms`    | Administrator          |
| PATCH / DELETE | `/buildings/:id`, `/buildings/:id/rooms/:roomId` | Administrator |
| GET    | `/assets`, `/assets/:id`                | Login                  |
| POST   | `/assets`                               | Administrator          |
| PATCH / DELETE | `/assets/:id`                   | Administrator          |
| POST   | `/assets/:id/maintenance`               | Administrator, Teknisi |
| DELETE | `/assets/:id/maintenance/:recordId`     | Administrator          |
| GET    | `/reports` (`?status=`), `/reports/:id` | Login (Pegawai: milik sendiri) |
| POST   | `/reports`                              | Login                  |
| PATCH  | `/reports/:id/follow-up`                | Administrator, Teknisi |
| PATCH / DELETE | `/reports/:id`                  | Administrator          |
| GET / POST | `/users`                            | Administrator          |
| PATCH / DELETE | `/users/:id`                    | Administrator          |

## Mengubah Schema

1. Ubah `src/db/schema.ts`.
2. Jalankan `bun run db:generate` untuk membuat migrasi baru di `drizzle/`.
3. Jalankan `bun run db:migrate` untuk menerapkannya.
