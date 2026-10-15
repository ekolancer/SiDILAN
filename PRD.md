# PRD — SiDILAN v1

**Produk:** SiDILAN — Sistem Digital Monitoring Tindak Lanjut Surat  
**Versi dokumen:** 1.2 · 13 Oktober 2026  
**Platform:** Google Apps Script Web App dengan spreadsheet yang sudah digunakan  
**Cakupan:** Pencatatan surat masuk melalui tampilan aplikasi  
**Dokumen pendamping:** [design.md](design.md) dan [architecture.md](architecture.md)

## 1. Tujuan produk

SiDILAN v1 menyediakan tampilan web agar petugas dapat melanjutkan pencatatan surat masuk tanpa bekerja langsung pada grid spreadsheet. Aplikasi membaca data yang sudah ada dan menyimpan penambahan/perubahan kembali ke tab yang sama.

Spreadsheet yang sekarang digunakan tetap menjadi sumber data utama. Struktur 14 kolom A:N dipertahankan. Data lama langsung dapat ditampilkan; tidak memerlukan pemindahan ke database baru atau pengelompokan ulang menjadi tabel persuratan.

Proses kerja tetap mengikuti pencatatan saat ini: catat surat, isi disposisi, perbarui posisi surat dan keterangan tindak lanjut. V1 tidak memaksakan tahapan verifikasi, penugasan PIC, persetujuan penyelesaian, atau transisi status.

## 2. Sumber dan kondisi saat ini

Sumber struktur adalah workbook `Draft Surat Masuk 2026.xlsx`, khususnya tab `SuratMasuk`. Target implementasi adalah [spreadsheet yang sekarang digunakan](https://docs.google.com/spreadsheets/d/18zKxtYJxPVhdMWzSadat4GEwXqSjp3ZV/edit?gid=839241284#gid=839241284).

Pemeriksaan workbook menemukan 677 kandidat surat, 490 baris template, dan satu baris anotasi setelah header. Angka tersebut adalah profil file unggahan; aplikasi harus membaca kondisi terbaru dari spreadsheet live, bukan memakai angka ini sebagai nilai tetap.

Hal yang perlu dipertahankan:

- Nomor agenda berbentuk angka maupun teks, termasuk `354.a`.
- Tanggal yang telah tersimpan sebagai tanggal numerik maupun teks Indonesia.
- Tujuan disposisi majemuk dalam satu kolom.
- Hyperlink berkas yang dapat memiliki label berbeda dari URL.
- Catatan lama yang tidak selalu sesuai dengan nama header, khususnya kolom N.
- Formula, formatting, anotasi, dan sel gabungan yang tidak sedang diedit.

Isi versi live belum berhasil dibaca dalam penyusunan dokumen. Sebelum implementasi, pastikan ID spreadsheet, tab, kompatibilitas Google Sheets native dan header A:N sesuai. Tidak ada perubahan pada spreadsheet atau workbook sumber melalui penyusunan dokumen ini.

## 3. Pengguna

| Jenis akses | Penggunaan |
| --- | --- |
| Petugas pencatat | Melihat, mencari, menambah dan memperbarui pencatatan surat masuk |
| Pembaca | Melihat daftar, detail dan rekap sesuai akses yang diberikan |

Konfigurasi akses cukup menggunakan daftar email Google yang boleh membaca atau mengedit. Peran ini berlaku untuk register, tanpa pengaturan akses per surat, daftar PIC, atau struktur persetujuan. Hak Google Sheets dan Google Drive yang berlaku tetap harus dihormati.

Tab `Users` yang ada pada workbook tidak digunakan sebagai login username/password aplikasi. Pembuatan sistem akun sendiri tidak dibutuhkan untuk v1.

## 4. Ruang lingkup v1

| Fitur | Perilaku yang diperlukan |
| --- | --- |
| Dashboard sederhana | Jumlah pencatatan, surat diterima bulan berjalan, distribusi posisi surat dan pencatatan yang memiliki keterangan tindak lanjut |
| Daftar surat masuk | Menampilkan seluruh data saat menu dipilih, dengan pencarian, filter posisi/asal/tujuan dispo, tabel 14 kolom dan paginasi 10/50/100 baris (default 10) |
| Pencatatan baru | Formulir yang menyimpan data ke 14 kolom yang sama |
| Detail surat | Menampilkan identitas, disposisi, posisi, keterangan tindak lanjut dan tautan berkas |
| Edit pencatatan | Memperbarui hanya kolom yang diubah pengguna; field lain tetap dipertahankan |
| Pembaruan cepat | Mengisi disposisi, tujuan, tanggal paraf, posisi dan keterangan tindak lanjut dari detail |
| Tautan dokumen | Memasukkan atau membuka tautan Google Drive yang sudah tersedia |
| Rekap | Tampilan cetak dan ekspor CSV sesuai hasil pencarian/filter |
| Perlindungan simpan | Validasi input, cegah klik ganda dan deteksi data yang berubah saat form dibuka |

Tidak diperlukan pada v1: database/tab transaksi baru, migrasi massal, mesin workflow, master unit/PIC, persetujuan berjenjang, tenggat/SLA baru, arsip terpisah, audit log khusus, penghapusan surat, upload file langsung, atau pengiriman notifikasi otomatis.

**V2:** pencatatan surat keluar dan integrasi WhatsApp. Integrasi Srikandi belum termasuk ruang lingkup; v1 hanya dapat mencatat informasi Input Srikandi secara manual.

## 5. Field formulir dan kolom spreadsheet

| Kolom | Header sumber | Tampilan aplikasi | Aturan v1 |
| --- | --- | --- | --- |
| A | Nomor Agenda | Nomor agenda | Agenda baru dibuat dengan kelanjutan angka register; agenda lama dipertahankan sebagai teks dan tidak diedit biasa |
| B | Tanggal Di Terima | Tanggal diterima | Wajib untuk pencatatan baru; tanggal WIB |
| C | No. Surat | Nomor surat | Wajib untuk pencatatan baru; simpan sebagai teks agar nol depan tidak hilang |
| D | Tanggal Surat | Tanggal surat | Opsional; kosong/placeholder lama tidak diisi otomatis |
| E | Asal Surat | Asal surat | Wajib untuk pencatatan baru |
| F | Perihal | Perihal | Wajib untuk pencatatan baru |
| G | Uraian Berkas | Uraian berkas | Dibuat dari identitas untuk pencatatan baru; nilai lama tidak dihitung ulang massal |
| H | Isi Disposisi | Isi disposisi | Teks multiline opsional; dapat dilengkapi kapan saja |
| I | Penujuan (Tujuan Dispo) | Tujuan disposisi | Teks opsional, boleh beberapa tujuan; tidak diubah menjadi akun atau penugasan PIC |
| J | KET/Tanggal Paraf Dispo | Keterangan / tanggal paraf disposisi | Tanggal atau catatan; terpisah dari tanggal surat/diterima |
| K | Link Berkas | Tautan berkas surat | URL aman atau hyperlink yang sudah ada; tidak diwajibkan untuk menyimpan |
| L | Posisi Surat | Posisi surat | Pilihan mengikuti nilai/validasi spreadsheet; tidak memicu proses otomatis |
| M | Keterangan Tindak lanjut | Keterangan tindak lanjut | Teks multiline opsional |
| N | Link Berkas TL dispo | Berkas / catatan tindak lanjut | URL menjadi tautan; teks lama tetap menjadi catatan |

Field wajib berlaku saat membuat pencatatan baru. Membaca data lama tidak mensyaratkan semua field terisi; edit satu field tidak harus melengkapi seluruh kolom historis. Saat field kosong/placeholder diganti, validasi diterapkan pada input penggantinya.

Uraian baru memakai asal, nomor, tanggal surat yang diformat Indonesia dan perihal. Tanggal kosong ditandai belum tersedia, bukan ditampilkan sebagai serial Excel. Ketika identitas surat lama berubah, aplikasi menawarkan preview pembaruan uraian; G hanya diperbarui bila pengguna memilihnya.

## 6. Posisi surat dan tindak lanjut

Posisi surat tetap mengikuti pencatatan spreadsheet. Nilai aktual pada snapshot:

- Input Srikandi.
- Dispo Sudah Keluar.
- Sudah Kirim di Grup.
- Diruangan Deputi.

Validasi sumber juga memuat Baru Masuk dan variasi Sudah Dikirim Grup. Aplikasi mempertahankan label asli, menyediakan nilai yang diizinkan tab live, dan menampilkan nilai lama yang belum ada dalam pilihan tanpa menggantinya otomatis.

Pengguna dapat memilih posisi secara langsung, tanpa harus menjalankan tahapan sebelumnya. Keterangan tindak lanjut dapat ditambah atau diperbarui kapan saja oleh pencatat yang berwenang.

Posisi surat tidak diperlakukan sebagai bukti selesai. Dashboard menghitung label persis Selesai, Dalam Proses dan Lewat Batas Waktu hanya jika tercatat di kolom Keterangan Tindak Lanjut (M); label manual bukan hasil verifikasi selesai maupun perhitungan SLA/tenggat otomatis. Surat tanpa ketiga label itu dihitung terpisah. Pengiriman grup dicatat manual dan tidak mengirim pesan WhatsApp.

## 7. Alur penggunaan

1. Pengguna membuka web app dan mengakses register dengan akun Google yang diizinkan.
2. Aplikasi menampilkan pencatatan yang sudah ada pada tab SuratMasuk.
3. Untuk surat baru, petugas mengisi formulir dan menyimpan; baris ditulis kembali ke tab yang sama.
4. Untuk surat yang sudah ada, petugas membuka detail, memperbarui field yang diperlukan, lalu menyimpan.
5. Pengguna mencari, memfilter, membuka tautan berkas, atau mencetak/mengekspor rekap.

Tidak ada pengajuan penutupan, buka kembali surat, tahapan wajib, atau antrean review data lama sebagai fitur operasional v1.

## 8. Aturan data dan penyimpanan

- Baris hanya berisi nomor agenda/uraian template bukan surat dan tidak masuk daftar atau hitungan dashboard.
- Baris dengan identitas surat sebagian tetap terlihat dengan penanda field kosong; aplikasi tidak menyembunyikannya karena dianggap belum lengkap.
- Agenda baru melanjutkan agenda numerik pada baris surat nyata, bukan angka cadangan di bagian template. Agenda bersuffix tetap unik dan tidak dianggap angka yang harus dibulatkan.
- Penambahan dapat memakai baris template yang aman. Baris anotasi atau merged cell tidak ditimpa; posisi penyimpanan dijelaskan pada architecture.md.
- Agenda, formula, tanggal dan hyperlink lama tidak dinormalisasi ulang hanya karena aplikasi dibuka.
- Mengubah posisi atau tindak lanjut tidak mengubah identitas, uraian atau tautan berkas lain.
- Data lama yang berpotensi ganda tetap tampil. Saat tambah, nomor surat yang serupa boleh memunculkan peringatan dan pilihan membuka pencatatan yang sudah ada.
- V1 tidak menghapus atau memperbaiki otomatis dua pasangan potensi ganda, G449 salah referensi, merge I651:J651 atau catatan yang tidak sesuai header.
- Bila data berubah sejak form dibuka, aplikasi meminta pengguna memuat ulang sebelum menyimpan; tidak menimpa perubahan diam-diam.
- Sort/filter di aplikasi hanya mengubah tampilan, bukan mengurutkan baris pada spreadsheet.

## 9. Dashboard dan rekap

| Ringkasan | Definisi |
| --- | --- |
| Total pencatatan | Jumlah baris surat nyata, termasuk yang sebagian field-nya belum terisi |
| Diterima bulan ini | Baris dengan tanggal B yang dapat dibaca dan berada pada bulan berjalan WIB |
| Memiliki disposisi | Baris dengan H tidak kosong; tidak berarti disposisi sudah diverifikasi |
| Memiliki keterangan tindak lanjut | Baris dengan M tidak kosong; tidak berarti surat selesai |
| Status tindak lanjut | Hitungan label persis di kolom M; nilai lain/blank dilaporkan terpisah |
| Tren surat | Bulan dari tanggal diterima B paling awal hingga paling akhir di register, termasuk bulan kosong; keluar dari header Tanggal Surat pada spreadsheet terpisah dalam rentang sama jika dikonfigurasi |
| Surat per unit tujuan | Hitungan tujuan disposisi I, dipisah koma/titik koma; satu unit dihitung sekali per surat |

Filter periode menggunakan tanggal diterima. Tanggal yang tidak dapat dipahami tidak ditebak dan disebutkan jumlahnya pada rekap periode. Total pencatatan tetap dapat dihitung tanpa tanggal. Jika variasi label posisi ingin digabung pada grafik, tampilkan aturan penggabungan dan biarkan nilai sumber tetap utuh.

Rekap tidak memuat hasil sebelum pengguna menekan Tampilkan Rekap. Filter posisi/asal/tujuan dispo memakai Select shadcn-vue; asal dan tujuan berasal dari nilai register dan tujuan gabungan dipisah pada koma/titik koma. Reset filter berada di ujung baris filter. Pratinjau memakai 10 baris per halaman dan menampilkan No. Agenda, Tanggal diterima, No. Surat, Tanggal Surat, Asal, Perihal, Isi Disposisi, dan Tujuan Disposisi. Cetak memakai kolom yang sama; CSV memuat seluruh 14 kolom register. Cetak dan CSV berisi seluruh hasil filter. URL berkas hanya diekspor bila pengguna memilihnya; teks yang menyerupai formula diekspor secara aman. URL berkas hanya diekspor bila pengguna memilihnya; teks yang menyerupai formula diekspor secara aman.

## 10. Kriteria penerimaan

| ID | Kriteria |
| --- | --- |
| AC-01 | Data lama dapat dilihat tanpa import atau pemindahan data |
| AC-02 | Surat baru tersimpan pada tab SuratMasuk dengan agenda unik dan field sesuai A:N |
| AC-03 | Baris template/anotasi tidak menambah angka dashboard atau menjadi target edit surat |
| AC-04 | Agenda bersuffix, tanggal campuran, hyperlink berlabel, tujuan majemuk dan catatan N tampil sesuai isi |
| AC-05 | Edit H/L/M mempertahankan semua sel lain, termasuk formula, hyperlink dan formatting |
| AC-06 | Posisi surat dan tindak lanjut dapat diubah langsung tanpa persetujuan atau tahapan wajib |
| AC-07 | Penambahan bersamaan melalui aplikasi tidak menghasilkan agenda ganda; klik ganda ditahan |
| AC-08 | Perubahan dari aplikasi lain/spreadsheet yang terdeteksi menimbulkan konflik, bukan overwrite diam-diam |
| AC-09 | Akses baca tidak dapat memanggil fungsi tambah/edit; identitas dan hak diperiksa di server |
| AC-10 | Nomor surat berawalan nol, input HTML dan ekspor yang menyerupai formula tetap diperlakukan sebagai data |
| AC-11 | Form dapat digunakan pada desktop dan mobile; pencarian/filter/rekap memakai data yang sama |
| AC-12 | Kegagalan simpan tidak menampilkan sukses; respons terputus meminta pengecekan data sebelum pengulangan |

## 11. Tahapan pengembangan dan keputusan minimum

1. Verifikasi tab live, akses akun Google, pilihan posisi dan kelanjutan nomor agenda.
2. Bangun fungsi baca/tambah/edit, formulir, daftar/detail dan penanganan data campuran.
3. Tambahkan dashboard, filter, cetak/CSV dan tampilan responsif.
4. Uji pada salinan spreadsheet, lalu arahkan konfigurasi produksi ke spreadsheet yang sekarang digunakan setelah pemeriksaan hasil.

Keputusan sebelum implementasi: akun pencatat/pembaca, ID tab live, aturan agenda baru bila berbeda dari kelanjutan angka, dan format cetak yang diinginkan. Tidak diperlukan keputusan SOP workflow, PIC, SLA, atau pemetaan status baru untuk memulai v1.

Dokumen ini merupakan spesifikasi. Kode Apps Script dan deployment belum dibuat; spreadsheet sumber belum diubah.
