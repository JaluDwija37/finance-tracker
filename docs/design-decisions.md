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
- Ikon kategori memakai pilihan Font Awesome yang terbatas dan relevan dengan nama kategori, sehingga daftar transaksi lebih mudah dipindai tanpa menjadikan setiap kartu dekorasi warna berbeda. Identitas teks Finance Tracker tetap tanpa logo.
- Koreksi saldo memakai saldo nyata sebagai masukan, lalu memperlihatkan selisih sebelum disimpan sebagai transaksi. Ini mengurangi risiko salah memilih arah atau menghitung nominal koreksi secara manual.
- Chart memakai pasangan batang horizontal per bulan agar angka masuk dan keluar tetap terbaca pada ponsel sempit. Persentase berasal dari pengeluaran dibagi pemasukan; jika pemasukan nol, teks menjelaskan bahwa rasio belum ada.
- Pertumbuhan memakai satu garis nilai kekayaan sebagai fokus. Rincian di desktop berupa tabel, sementara ponsel memecah tiap bulan menjadi blok dua kolom agar semua angka terlihat tanpa geser samping.
- Sidebar desktop memberi akses tetap ke Chart dan Pertumbuhan tanpa memperpanjang navigasi bawah ponsel. Di ponsel, kedua halaman tersedia lewat Lainnya dan menu halaman laporan.
- Baris data memakai area sentuh 44 piksel yang mencakup judul dan rincian; aksi lain tetap tombol tersendiri agar tap tidak salah sasaran.
- Aksi catat transaksi berada di header ponsel dan tombol halaman Transaksi. Tombol melayang dihapus karena menutup nominal dan aksi pada baris yang digulir.
- Transaksi membuka bulan berjalan, menampilkan 30 baris per tahap, dan menaruh filter lanjutan dalam panel yang bisa dibuka. Pilihan semua periode tetap terlihat agar riwayat lama mudah dicari.
- Lainnya membuka indeks tujuan vertikal. Satu layar detail dibuka setelah pengguna memilih tujuan, dengan tombol kembali yang jelas; sidebar detail tetap tersedia pada layar lebar.
- Chart dan Pertumbuhan berbagi ikon navigasi workspace, tautan kembali ke Laporan, dan pemilih antar laporan. Ini menjaga konteks saat laporan SSR dibuka dari aplikasi utama.
- Istilah “total aset tercatat” dipakai di Beranda dan Pertumbuhan karena perhitungan saat ini menjumlah saldo akun dan nilai investasi, tanpa model utang.
