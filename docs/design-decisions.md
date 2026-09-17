# Arah antarmuka

Design Read: aplikasi keuangan pribadi untuk satu pemilik, dengan bahasa visual terminal finansial yang tenang. ENERGY 2 / RHYTHM 2 / MOTION 1.

- Kanvas hitam matte dan permukaan arang berasal dari `DESIGN.md`; angka rupiah menjadi titik fokus tanpa warna dekoratif di sekelilingnya.
- Inter Variable dipakai sebagai pengganti Calibre yang tidak tersedia; angka tabular membuat kolom nominal mudah dipindai.
- Biru hanya menandai tindakan utama dan tautan, hijau menunjukkan selisih positif, dan jingga menunjukkan arus negatif. Warna memberi makna yang konsisten.
- Nilai aset diberi ruang paling besar karena pemilik perlu melihat posisi uang sebelum membaca arus siklus dan rincian akun.
- Baris akun dan transaksi dipakai untuk data yang dapat dipindai; kartu hanya untuk total dan formulir yang memang butuh batas visual.
- Navigasi bawah pada ponsel berisi lima tujuan yang berfungsi, dengan ikon dan label agar tujuan tetap mudah dikenali. Pada desktop, tujuan yang sama berpindah ke sidebar sehingga konten angka mendapat ruang lebih lebar. Target sentuh minimal 44 piksel.
- Dashboard menampilkan kategori belanja dan budget dari transaksi nyata. Bar progres hanya muncul untuk batas belanja dan menggunakan warna jingga saat batas terlampaui.
- Tidak ada animasi otomatis; perubahan hover dan fokus cukup untuk menunjukkan interaksi tanpa mengganggu pembacaan angka.
- Identitas tipografi memakai judul pendek dengan titik akhir dan tracking rapat; pola ini muncul pada layar masuk serta halaman utama tanpa meniru susunan halaman Fey.
- Workspace kini memakai satu route server-rendered. Lima tab berpindah di klien tanpa reload, sementara data awal tetap tersedia dalam HTML dan setiap server action memperbarui data dari database.
- Form edit muncul sebagai lembar dari bawah pada ponsel agar dekat dengan jempol; di layar besar menjadi dialog terpusat. Navigasi bawah tetap memiliki label pada semua ikon.
- Alur yang mengubah histori finansial memakai pembatalan atau arsip, sehingga audit dan saldo bisa dihitung ulang. Budget, harga aset, tautan kontribusi, dan snapshot dapat dihapus karena data sumbernya tetap terjaga.
