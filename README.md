# Finance Tracker

Aplikasi keuangan pribadi dengan Next.js 16, Better Auth, Prisma 7, dan PostgreSQL 16. Workspace satu halaman merangkum saldo, transaksi, budget, target, investasi, dan pengelolaan data.

## Menjalankan seluruh stack di Docker

1. Siapkan `.env` dari `.env.example`. Isi `POSTGRES_PASSWORD` dengan nilai acak dan gunakan nilai yang sama pada bagian password di `DATABASE_URL`. Isi `BETTER_AUTH_SECRET` dengan string acak minimal 32 karakter. Isi `OWNER_EMAIL` dan `OWNER_PASSWORD` untuk akun pertama. Jangan commit `.env`.
2. Jalankan `docker compose up --build -d`.
3. Buka `http://localhost:3001/login` pada konfigurasi lokal ini. Untuk instalasi baru, gunakan port pada `APP_PORT` (default 3000) dan masuk dengan email serta password pemilik.

Compose menjalankan migration yang sudah dicatat di `prisma/migrations/`, membuat akun pemilik satu kali, dan mengisi pengaturan IDR, Asia/Jakarta, serta siklus tanggal 25. Registrasi publik dinonaktifkan. Mengubah `OWNER_PASSWORD` setelah akun dibuat **tidak** mengubah password akun yang sudah ada. Database disimpan di volume `postgres_data`.

Setelah masuk, tambahkan akun beserta saldo awal melalui **Akun**. Catat pemasukan, pengeluaran, transfer antar akun, atau penyesuaian saldo melalui **Transaksi**. Beranda menghitung saldo akun dari saldo awal dan transaksi berstatus posted; transfer dan penyesuaian tidak dihitung sebagai pemasukan atau pengeluaran siklus.

## Impor Money Manager dan budget

Buka **Lainnya → Impor & ekspor** lalu pilih file `.xlsx` hasil ekspor Money Manager. Sistem memeriksa seluruh baris sebelum menyimpan; satu baris tidak valid membatalkan seluruh impor. Akun dari kolom `Account` dibuat otomatis. `Transfer-Out` memakai nilai `Category` sebagai akun tujuan, sedangkan `Modified Bal.` menjadi penyesuaian saldo. Food, Coffee, Fuel, Salary, dan Other dipetakan ke Makan, Ngopi, Bensin, Gaji, dan Lainnya. Kategori lain mengikuti nama workbook, terpisah untuk pemasukan dan pengeluaran. Mengunggah file yang sama lagi tidak membuat transaksi ganda.

Ekspor ini tidak menyertakan saldo awal. Akun baru dimulai dari Rp0 pada tanggal transaksi tertua; cocokkan saldo hasil perhitungan dengan catatan Money Manager sebelum memakai angka saldo sebagai dasar keputusan. Simpan file sumber di tempat privat; aplikasi hanya menyimpan data yang diimpor di PostgreSQL.

Menu **Budget** menyediakan batas per kategori pengeluaran untuk hari, bulan kalender, siklus gajian, dan tahun kalender. Beberapa batas untuk kategori yang sama membaca transaksi yang sama, sehingga pengeluaran hari ini ikut dihitung ke setiap batas yang periodenya mencakup tanggal tersebut. Mengisi kategori dan periode yang sudah ada memperbarui batasnya. Dashboard menampilkan pemakaian budget dan kategori dengan belanja terbesar pada siklus aktif.

Untuk melihat status: `docker compose ps`. Untuk melihat log: `docker compose logs app`. Untuk menghentikan tanpa menghapus data: `docker compose down`.

## Development dengan Docker, tanpa rebuild setiap perubahan

Compose dev memakai source code dari direktori proyek dan menjalankan `next dev` dengan Turbopack. Perubahan file terlihat lewat Fast Refresh. `node_modules`, cache Next.js, dan store pnpm disimpan di volume Docker terpisah.

```bash
# Pertama kali atau setelah Dockerfile.dev berubah:
docker compose -f compose.yaml -f compose.dev.yaml up --build -d

# Mulai berikutnya, termasuk setelah mengubah kode:
docker compose -f compose.yaml -f compose.dev.yaml up -d

# Lihat log Next.js:
docker compose -f compose.yaml -f compose.dev.yaml logs -f app
```

Gunakan `APP_PORT` di `.env` untuk menentukan port host (konfigurasi lokal saat ini 3001). Jalankan `docker compose -f compose.yaml -f compose.dev.yaml down` untuk berhenti tanpa menghapus database. Jangan gunakan `down -v` kecuali memang ingin menghapus seluruh volume database dan cache. Jika dependency pada `package.json` berubah, jalankan ulang `up -d` agar `pnpm install` di container memperbarui volume `node_modules`; tidak perlu rebuild image dev.

Untuk kembali ke mode produksi, jalankan `docker compose up --build -d` agar image produksi dibuat dari `Dockerfile`.

## Pengembangan tanpa container aplikasi

Jalankan PostgreSQL dengan `docker compose up -d db`, lalu arahkan `DATABASE_URL` lokal ke `localhost` (container database tidak membuka port secara default; tambahkan port lokal pada compose override bila diperlukan). Jalankan `pnpm install`, `pnpm db:generate`, `pnpm db:deploy`, `pnpm db:bootstrap`, dan `pnpm dev`.

Verifikasi: `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm build`.

## Backup database

Backup: `docker compose exec -T db pg_dump -U finance -d finance_tracker -Fc > finance-tracker.dump`. Simpan file dump di lokasi privat. Restore perlu database kosong: `cat finance-tracker.dump | docker compose exec -T db pg_restore -U finance -d finance_tracker --clean --if-exists`. Uji restore di lingkungan terpisah sebelum menggunakannya untuk data penting.

## Fitur dan cara pakai

Workspace utama berada di `/` dan dirender di server pada permintaan awal. Navigasi bawah di ponsel atau sidebar di desktop berpindah antar panel tanpa reload. Tautan lama `/accounts`, `/transactions`, `/budgets`, dan `/import` mengarah ke panel yang sesuai.

Chart (`/charts`) dan Pertumbuhan (`/growth`) adalah halaman laporan tersendiri yang juga dirender di server. Keduanya tersedia dari sidebar desktop dan menu **Lainnya → Laporan** pada ponsel.

- **Transaksi:** buat, ubah, cari, saring, batalkan, dan pulihkan pemasukan, pengeluaran, transfer, serta koreksi saldo. Daftar membuka bulan berjalan, menampilkan 30 transaksi per tahap, dan punya pilihan semua periode. Buka transaksi untuk membatalkan, memulihkan, atau mengonfirmasi draft; pembatalan mempertahankan riwayat audit dan menghitung ulang saldo.
- **Koreksi akun:** buka **Lainnya → Akun → Koreksi saldo**, masukkan saldo nyata dan alasan. Selisih disimpan sebagai transaksi `ADJUSTMENT`, sehingga riwayat sebelumnya tetap ada.
- **Kategori:** pilih ikon Font Awesome saat menambah atau mengubah kategori. **Pindahkan transaksi** memindahkan seluruh transaksi kategori asal ke kategori tujuan yang sejenis; nominal, saldo, budget, dan jadwal tetap tidak diubah.
- **Budget:** batas harian, bulanan, siklus gajian, dan tahunan. Periode memakai transaksi nyata dari kategori yang sama.
- **Target:** buat target tabungan dan tautkan transfer yang sudah terjadi sebagai kontribusi. Menautkan transfer tidak menggandakan saldo.
- **Investasi:** catat aset, pembelian, penjualan, dividen, biaya, dan harga manual. Nilai tanpa harga memakai modal tersisa. Penjualan yang melebihi unit pada tanggal transaksi ditolak.
- **Lainnya:** kelola akun, kategori, jadwal tetap, laporan siklus, pemeriksaan saldo, impor/ekspor, dan tanggal awal siklus. Jadwal tetap membuat draft yang perlu dikonfirmasi sebelum memengaruhi saldo.
- **Ekspor:** unduh CSV transaksi atau JSON semua catatan melalui Lainnya → Impor & ekspor. File JSON adalah arsip data, belum tersedia impor ulang dari JSON.
- **Chart:** bandingkan pemasukan, pengeluaran, rasio pengeluaran terhadap pemasukan, dan porsi kategori untuk 6 atau 12 bulan. Transfer dan koreksi saldo dikecualikan dari arus uang.
- **Pertumbuhan:** lihat total aset tercatat tiap akhir bulan dari saldo akun dan investasi. Harga aset memakai snapshot terakhir yang tersedia saat itu; tanpa harga, nilai memakai modal tersisa. Perubahan lain mencakup koreksi, harga aset, dan saldo awal akun baru.

Perubahan skema dijalankan saat container dimulai. Setelah mengubah `prisma/schema.prisma` dalam mode dev, restart service `app` supaya Prisma Client diperbarui. Verifikasi: `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm build`.
