# Design — SiDILAN v1

**Versi:** 1.2 · 13 Oktober 2026  
**Cakupan:** Tampilan web untuk melanjutkan pencatatan pada spreadsheet yang sama  
**Acuan:** [PRD.md](PRD.md), workbook sumber dan identitas visual SiDILAN  
**Dokumen teknis:** [architecture.md](architecture.md)

## 1. Prinsip desain

Pengguna cukup menemukan surat, mengisi atau memperbarui pencatatan, lalu menyimpan. Bahasa dan field mengikuti 14 kolom register. Aplikasi tidak menampilkan tahapan wajib, persetujuan, penugasan PIC atau indikator selesai yang tidak ada dalam data sumber.

Tampilan formal, bersih dan mudah dibaca, dengan identitas biru tua–oranye SiDILAN. Konten kerja lebih dominan daripada banner/foto gedung.

## 2. Navigasi

| Menu | Isi |
| --- | --- |
| Dashboard | Ringkasan pencatatan, grafik status/tren/unit tujuan dan daftar terbaru |
| Surat Masuk | Pencarian, filter, daftar, tombol tambah dan detail |
| Rekap | Preview register, cetak dan CSV |

Form tambah/edit serta detail dibuka dari Surat Masuk. Pengguna pembaca tidak melihat tombol tambah/edit. Konfigurasi akun dikelola oleh pengelola Apps Script, sehingga tidak membutuhkan halaman manajemen pengguna pada v1.

Menu Disposisi, Penugasan, Tugas Saya, Review, Arsip, Surat Keluar dan WhatsApp tidak diperlukan pada v1. Disposisi serta tindak lanjut adalah bagian dari detail surat.

## 3. Tata letak dan gaya

| Elemen | Arahan |
| --- | --- |
| Navigasi | Sidebar navy 224 px dengan tiga menu dan ikon; menu aktif berwarna biru. Pada mobile menjadi navigasi horizontal |
| Header | Header putih berisi sapaan, peran dan identitas akun; tombol Muat ulang pada tampilan terkait |
| Latar halaman | Biru-abu muda `#F2F6FA`; panel putih berbatas biru lembut. Area filter dan tabel memakai tint biru pucat untuk membantu pemindaian |
| Peran warna | Navy untuk hierarki/teks, biru untuk aksi dan data masuk, oranye untuk penekanan brand, hijau untuk status selesai/keluar, amber untuk proses/peringatan, merah untuk lewat batas waktu/error |
| Warna merek | Navy `#0B2745`, biru `#1263A0`, oranye `#F47A14` |
| Teks | Utama `#172B4D`, sekunder `#52647A` |
| Tipografi | Outfit lokal dengan fallback sistem; body 14–16 px; judul responsif 25–32 px |
| Input/tombol | Tinggi 40–44 px; label jelas; radius 8 px |
| Panel | Radius 12 px; jarak 16–24 px; dekorasi terbatas |

Tombol utama menggunakan biru dengan teks putih. Oranye dipakai sebagai aksen. Kontras teks/input/fokus diverifikasi pada implementasi; warna bukan satu-satunya pembeda.

Komponen shadcn-vue yang disiapkan: Button, Input, Label, Textarea, Select (posisi tunggal), Card, Badge, Table, Dialog, Sheet, dan Sonner. Filter daftar surat menggunakan dropdown satu posisi (Semua posisi, Belum diisi, atau salah satu nilai live), dengan tombol Reset dan Muat ulang. Filter rekap tetap menggunakan native multi-select untuk beberapa posisi; Dialog, Sheet, dan Sonner tersedia untuk layar yang memerlukannya, bukan pengganti otomatis bagi panel atau pesan saat ini.

Pada layar kecil, sidebar menjadi navigasi horizontal yang dapat digeser, form menjadi satu kolom dan daftar surat menjadi baris ringkas bertumpuk. Target lebar minimum 360 px; tombol dapat digunakan dengan sentuhan maupun keyboard. Tautan lewati ke konten tersedia untuk keyboard. Logo resmi dipakai bila tersedia.

## 4. Dashboard

Default periode bulan berjalan untuk ringkasan berbasis tanggal diterima. Tampilkan:

- Total pencatatan pada register.
- Surat diterima bulan ini.
- Pencatatan dengan isi disposisi.
- Pencatatan dengan keterangan tindak lanjut.

Label posisi surat seperti Input Srikandi atau Sudah Kirim di Grup tetap merupakan informasi pencatatan manual pada daftar/detail, bukan status tindak lanjut pada donat.

Dashboard terbuka sebagai tampilan awal. Daftar terbaru menampilkan agenda, tanggal diterima, perihal, asal surat dan unit tujuan dari kolom Tujuan Disposisi; bila belum dicatat, tampil Belum diisi. Angka dibaca dari spreadsheet, dengan waktu pemuatan dan tombol Muat ulang; tidak ada angka ilustrasi yang ditanam sebagai data.

Ringkasan tidak menghitung selesai, terlambat, SLA atau persentase penyelesaian dari posisi maupun dari sekadar adanya catatan. Donat hanya menampilkan hitungan label eksplisit di kolom M; label tersebut bukan bukti verifikasi penyelesaian atau perhitungan tenggat otomatis.

Referensi dashboard digunakan untuk komposisi sidebar, kartu statistik berikon dan tabel pencatatan terbaru. Empat kartu tetap memakai metrik register yang tersedia. Panel Posisi surat diganti tiga grafik:

- Donat status tindak lanjut menghitung hanya nilai kolom M yang persis **Selesai**, **Dalam Proses**, atau **Lewat Batas Waktu** (abaikan kapitalisasi dan spasi tepi). Surat tanpa ketiga label tersebut dilaporkan terpisah, tidak diam-diam dianggap dalam proses atau terlambat.
- Tren mengikuti bulan dari tanggal diterima surat masuk paling awal hingga paling akhir pada register, termasuk bulan tanpa surat. Seri keluar menghitung **Tanggal Surat** dari spreadsheet terpisah pada rentang bulan yang sama. Surat masuk tanpa tanggal terbaca tidak masuk tren. ID dan nama sheet keluar dibaca dari Script Properties `OUTGOING_SPREADSHEET_ID` serta `OUTGOING_SHEET_NAME`; ketika tidak dikonfigurasi, tidak dapat dibaca, atau header tidak ada, garis keluar tidak ditampilkan. Grafik kosong bila register tidak memiliki tanggal masuk yang dapat dibaca.
- Batang horizontal **Surat per unit tujuan** menghitung nilai kolom Tujuan Disposisi. Koma dan titik koma memisahkan tujuan; tiap unit unik dihitung sekali per surat. Hanya 8 unit terbanyak ditampilkan, dengan jumlah lain disebutkan.

Grafik tidak menambah tahap proses, SLA, tenggat, surat keluar ke register masuk, notifikasi atau WhatsApp. Surat dengan label Lewat Batas Waktu adalah label manual, bukan hasil perhitungan tenggat.

## 5. Daftar surat masuk

Saat menu dibuka, tampilkan seluruh register sejak awal dengan 10 baris per halaman. Kontrol halaman menyediakan nomor halaman langsung, Sebelumnya/Berikutnya, serta pilihan 10/50/100 baris. Pencarian: agenda, nomor surat, asal, perihal dan tujuan disposisi. Placeholder **Cari agenda, nomor surat, asal, atau perihal**.

Filter utama: posisi surat. Filter tambahan: memiliki disposisi, memiliki keterangan tindak lanjut, atau memiliki tautan berkas. Filter tidak memerlukan master unit/PIC.

Daftar menggunakan tabel register 14 kolom yang sama seperti Rekap. Setiap baris punya aksi Lihat dan Edit bagi pencatat. Filter berbasis komponen Select shadcn-vue: kata kunci, posisi (multi-pilih), asal surat dan tujuan disposisi (multi-pilih; tujuan gabungan dipisah koma/titik koma). Opsi berasal dari register penuh. Paginasi default 10 baris, pilihan 10/50/100 serta tombol nomor halaman, Sebelumnya dan Berikutnya.

Filter tetap dipertahankan setelah pengguna kembali dari detail.

Pada mobile, kartu menampilkan agenda, perihal, asal, tanggal dan posisi. Paginasi menata ulang kontrol menjadi susunan ringkas tanpa luapan horizontal. Detail menjadi tempat melihat semua field. Baris template tidak tampil; baris surat sebagian tetap tampil dengan field kosong yang jelas.

## 6. Form tambah dan edit

Form berupa halaman/panel lebar dengan empat bagian:

| Bagian | Field |
| --- | --- |
| Identitas surat | Agenda, tanggal diterima, nomor surat, tanggal surat, asal, perihal, uraian berkas |
| Disposisi | Isi disposisi, tujuan disposisi, keterangan/tanggal paraf |
| Posisi dan tindak lanjut | Posisi surat, keterangan tindak lanjut |
| Berkas | Tautan berkas surat, berkas/catatan tindak lanjut |

**Tambah:** agenda diberi keterangan Akan dibuat saat disimpan. Tanggal diterima default hari ini WIB; tanggal surat tidak diberi default. Wajib: tanggal diterima, nomor surat, asal dan perihal. Disposisi/tindak lanjut/link boleh kosong.

**Edit:** agenda baca saja; semua nilai asli dimuat. Pengguna cukup mengubah bagian yang diperlukan. Kekosongan historis pada field lain tidak memaksa pengguna melengkapinya untuk menyimpan perubahan posisi/catatan.

Uraian berkas baru mempunyai preview otomatis dengan tanggal Indonesia, tanpa serial Excel. Pada edit, uraian asli tetap tampil; bila identitas berubah, tersedia **Perbarui uraian dari identitas** dengan preview sebelum simpan. Tidak ada perbaikan massal uraian lama.

Tujuan disposisi berupa textarea, sehingga gabungan unit/jabatan/nama tetap dapat dicatat seperti kebiasaan saat ini. Tidak ada multi-select yang mengharuskan pemetaan akun atau pilihan koordinator.

Tanggal paraf menyediakan mode **Tanggal** atau **Catatan** sesuai isi J. Nilai lama yang tidak dikenali tetap tampil sebagai teks. Sel gabungan yang tidak aman diedit menampilkan petunjuk khusus, bukan konversi tanggal otomatis.

Posisi surat menggunakan dropdown dari pilihan live. Nilai lama di luar daftar muncul sebagai pilihan Nilai saat ini; menyimpan field lain tidak mengganti nilai tersebut. Tidak ada syarat posisi sebelumnya.

Tombol: **Simpan** dan **Batal**. Saat menyimpan, tombol dinonaktifkan sementara. Field yang berubah ditandai agar pengguna mengetahui apa yang akan ditulis.

## 7. Detail dan pembaruan cepat

Header memuat agenda dan perihal. Isi detail menggunakan empat bagian form yang sama dalam mode baca. Nilai kosong ditampilkan **Belum diisi**, bukan status proses baru.

Pencatat dapat memilih **Edit pencatatan** atau **Perbarui disposisi/tindak lanjut**. Aksi kedua membuka field H:N yang relevan, tanpa mengubah A:G. Pengguna dapat langsung mengubah posisi dan catatan, tanpa review atau approval.

K atau N berisi URL HTTPS yang aman mendapat tombol **Buka berkas**. Hyperlink berlabel menggunakan target yang tersimpan. N berisi nama/catatan tetap ditampilkan sebagai teks, tanpa tombol berkas. Aplikasi tidak menganggap nama tersebut PIC.

Hak akses berkas tetap mengikuti Google Drive. Jika akun tidak memiliki izin berkas, jangan memberi kesan bahwa aplikasi otomatis membagikannya.

## 8. Rekap

Rekap kosong saat menu dibuka; data hanya dimuat setelah pengguna menekan **Tampilkan rekap**. Filter memakai komponen Select shadcn-vue untuk posisi (multi-pilih), Asal Surat dan Tujuan Dispo dalam satu baris pada desktop, dengan Reset filter di ujung kanan. Tujuan gabungan dipisah pada koma/titik koma menjadi opsi masing-masing. Preview register 14 kolom menampilkan 10 baris per halaman; Cetak dan CSV berisi seluruh hasil filter. Header cetak memuat nama aplikasi/unit, filter dan waktu pembuatan.

Cetak menggunakan layout landscape, header tabel berulang dan gaya hitam-putih yang tetap terbaca. Cetak dan CSV memakai seluruh hasil filter, bukan hanya halaman pratinjau aktif. Tautan berkas menjadi opsi ekspor, tidak disisipkan tanpa pilihan pengguna.

Tanggal yang tidak dapat dibaca muncul dengan nilai asli. Untuk laporan periode, jumlah tanggal yang belum dapat dimasukkan ke periode disebutkan. Baris template tidak ikut laporan.

## 9. Feedback dan keadaan layar

| Keadaan | Pesan/perilaku |
| --- | --- |
| Memuat | Indikator singkat; tidak menampilkan angka nol sebagai data gagal |
| Tidak ada hasil | Tidak ada surat sesuai pencarian; Reset filter |
| Surat baru tersimpan | Surat berhasil dicatat dengan agenda … |
| Edit berhasil | Perubahan pencatatan berhasil disimpan |
| Validasi gagal | Pesan dekat field; fokus ke field pertama yang perlu diperbaiki |
| Data berubah | Data telah diperbarui sejak form dibuka. Muat ulang sebelum menyimpan |
| Simpan terputus | Hasil penyimpanan belum diketahui. Muat ulang dan periksa pencatatan sebelum mengulang |
| Akses ditolak | Akun belum memiliki akses untuk tindakan ini |
| Data lama tidak lazim | Nilai asli tetap tampil; penjelasan hanya pada field terkait |
| Sel gabungan bermasalah | Bagian ini perlu diperiksa pada spreadsheet sebelum dapat diedit dengan aman |

Input yang belum disimpan tetap di memori halaman, dengan peringatan ketika meninggalkan form. Tidak menyimpan isi surat ke localStorage sebagai fitur default.

## 10. Checklist UI v1

- Daftar dan form benar-benar mewakili 14 kolom register.
- Membaca data lama tidak memunculkan proses migrasi atau review wajib.
- Edit posisi/catatan tidak memperbarui field identitas atau uraian.
- Nomor agenda bersuffix, tujuan majemuk, teks tanggal dan catatan N terbaca.
- Pembaca tidak mendapat aksi tulis; server tetap memeriksa izin.
- Form, tabel/kartu, dialog, fokus dan pesan error dapat dioperasikan dengan keyboard.
- Warna memiliki kontras memadai dan posisi surat tetap terbaca tanpa warna.
- Tampilan desktop, mobile 360 px, cetak dan CSV diperiksa pada implementasi.

Dokumen ini menentukan tampilan. Tidak ada mockup web atau kode antarmuka yang dibuat sebagai bagian dari revisi spesifikasi ini.
