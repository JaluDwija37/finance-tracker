# Pemeriksaan antislop, 17 September 2026

Design Read: aplikasi keuangan pribadi untuk satu pemilik, kanvas terminal finansial yang tenang. ENERGY 2 / RHYTHM 2 / MOTION 1. Keputusan visual dan alasannya ada di `design-decisions.md`.

## Hard Gate

- R-02 PASS: teks UI tidak memakai em dash.
- R-03 PASS: Chart dan Pertumbuhan diuji pada 320, 390, 768, dan 1440 piksel; tidak ada overflow horizontal.
- R-17 PASS: jumlah rupiah berasal dari saldo awal dan transaksi database; keadaan kosong tidak menampilkan angka rekaan.
- R-18 PASS: tidak ada testimonial atau identitas orang rekaan.
- R-23 PASS: identitas tetap berupa teks Finance Tracker; ikon kategori adalah permintaan pengguna dan dibatasi pada pilihan yang relevan.
- R-24 PASS: Beranda, Transaksi, Budget, Target, Chart, Pertumbuhan, dan Lainnya membuka konten nyata.
- R-25 PASS: kontras teks sekunder 5.99:1 hingga 8.45:1; tombol 15.95:1; batas field 3.90:1.
- R-26 PASS: koreksi saldo tanpa selisih memberi umpan balik, pemilih ikon berubah, dialog pindah kategori terbuka, tombol Chart dan Pertumbuhan berpindah ke route nyata, dan rentang 12 bulan menampilkan 12 baris.
- R-27 PASS: halaman kosong mengarah ke pembuatan akun/transaksi; `loading.tsx` dan `error.tsx` tersedia; pemulihan setelah database dinyalakan kembali diuji.
- R-28 PASS: tidak ada FAQ.
- R-32 PASS: login berhasil lewat Tab dan Enter; indikator fokus 2 piksel terukur di browser.
- R-33 PASS: perubahan UI ditulis langsung dalam komponen dan CSS; tidak ada skrip patch yang ditinggalkan.
- R-34 PASS: tidak ada toggle tema; tema gelap tetap didasarkan pada `DESIGN.md`.
- R-35 PASS: build, lint, typecheck, dan tes lulus; uji browser mencakup koreksi saldo tanpa perubahan, pemilih ikon, filter tujuan kategori, Escape dialog, tautan laporan, rentang 6/12 bulan, menu laporan ponsel, dan empat lebar layar tanpa kesalahan konsol.
- R-36 PASS: tidak ada klaim sertifikasi, keamanan, atau performa tanpa bukti.
- R-37 PASS: arah `DESIGN.md` dibaca sebelum membangun UI dan dials dicatat di atas.
- R-38 PASS: konten transaksi uji dihapus setelah verifikasi; UI kosong menampilkan tindakan berikutnya tanpa data palsu.

## Purpose Gate

- R-01 PASS: warna biru hanya untuk tindakan/tautan; hijau dan jingga memberi arti pada angka finansial.
- R-04 PASS: ikon Font Awesome memudahkan pemindaian kategori dan dipilih dari daftar kecil berdasarkan makna kategori; ikon tanpa padanan bermakna memakai tag umum.
- R-06 PASS: Inter Variable menggantikan Calibre karena paket Calibre tidak tersedia; angka tabular membantu pemindaian nominal.
- R-07 PASS: tidak ada pola latar dekoratif.
- R-08 PASS: tidak ada panah dekoratif pada tombol.
- R-09 PASS: tidak ada badge tanpa fungsi.
- R-10 PASS: tidak ada blur atau glassmorphism.
- R-12 PASS: tidak ada bayangan yang membuat setiap panel melayang.
- R-13 PASS: tidak ada glow dekoratif.
- R-14 PASS: nilai aset mendapat ruang lebih besar; daftar akun dan transaksi berupa baris, bukan kartu seragam.
- R-19 PASS: motion hanya pada hover, fokus, dan scroll yang menghormati reduced motion.
- R-22 PASS: tidak ada ilustrasi generik.

## Liveliness dan Craftsmanship

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 konsisten dari login hingga dashboard.
- Focal point PASS: nilai aset di Beranda, perbandingan arus uang di Chart, dan kekayaan bersih di Pertumbuhan menjadi fokus masing-masing layar.
- Whitespace PASS: ruang memisahkan total, siklus, dan rincian agar angka mudah dipindai.
- Accent PASS: biru ditahan pada aksi utama dan tautan.
- Motif PASS: judul pendek bertitik dan tracking rapat berulang tanpa meniru tata letak referensi.
- C-1 dan R-31 PASS: alasan warna, tipografi, tata letak, jarak, dan kartu dicatat di `design-decisions.md`.
- C-2 PASS: semua kontrol yang tampil memiliki aksi yang diuji.
- C-3 dan R-05 PASS: urutan beranda mengikuti keputusan pengguna: total aset, arus siklus, akun, lalu transaksi.
- C-4 PASS: keadaan kosong, loading, error, layar 320 hingga 1440 piksel, pemilih ikon dengan keyboard, dan dialog yang tertutup dengan Escape diuji.
- C-5 PASS: tidak ada metrik atau klaim yang dibuat-buat.
- R-11 PASS: pill dipakai untuk nav dan aksi; input 10 piksel dan panel 16 piksel.
- R-15 dan R-16 PASS: CTA menyebut tindakan spesifik; tidak ada jargon pemasaran.
- R-20 dan R-30 PASS: token gelap dari referensi diterapkan pada produk keuangan pribadi dengan komposisi data sendiri.
- R-21 PASS: tema gelap berasal dari `DESIGN.md`.
- R-29 PASS: palet aktif adalah hitam/arang, teks netral, biru aksi, dan warna semantik untung/rugi.
