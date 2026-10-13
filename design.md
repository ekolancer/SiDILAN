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
| Dashboard | Ringkasan pencatatan, posisi surat dan daftar terbaru |
| Surat Masuk | Pencarian, filter, daftar, tombol tambah dan detail |
| Rekap | Preview register, cetak dan CSV |

Form tambah/edit serta detail dibuka dari Surat Masuk. Pengguna pembaca tidak melihat tombol tambah/edit. Konfigurasi akun dikelola oleh pengelola Apps Script, sehingga tidak membutuhkan halaman manajemen pengguna pada v1.

Menu Disposisi, Penugasan, Tugas Saya, Review, Arsip, Surat Keluar dan WhatsApp tidak diperlukan pada v1. Disposisi serta tindak lanjut adalah bagian dari detail surat.

## 3. Tata letak dan gaya

| Elemen | Arahan |
| --- | --- |
| Sidebar desktop | Lebar sekitar 220 px, tiga menu utama |
| Header | Judul halaman, identitas pengguna dan Muat ulang |
| Latar halaman | `#F4F7FB`, panel putih dengan border ringan |
| Warna merek | Navy `#0B2745`, biru `#1263A0`, oranye `#F47A14` |
| Teks | Utama `#172B4D`, sekunder `#52647A` |
| Tipografi | Font sistem; body 14–16 px; judul 24 px |
| Input/tombol | Tinggi 40–44 px; label jelas; radius 8 px |
| Panel | Radius 12 px; jarak 16–24 px; dekorasi terbatas |

Tombol utama menggunakan biru dengan teks putih. Oranye dipakai sebagai aksen. Kontras teks/input/fokus diverifikasi pada implementasi; warna bukan satu-satunya pembeda.

Pada layar kecil, sidebar menjadi drawer, form menjadi satu kolom dan daftar surat menjadi kartu ringkas. Target lebar minimum 360 px; tombol dapat digunakan dengan sentuhan maupun keyboard. Logo resmi dipakai bila tersedia.

## 4. Dashboard

Default periode bulan berjalan untuk ringkasan berbasis tanggal diterima. Tampilkan:

- Total pencatatan pada register.
- Surat diterima bulan ini.
- Pencatatan dengan isi disposisi.
- Pencatatan dengan keterangan tindak lanjut.

Panel **Posisi surat** menampilkan hitungan label L dan Belum diisi. Label seperti Input Srikandi atau Sudah Kirim di Grup tetap merupakan informasi pencatatan manual.

Daftar terbaru menampilkan agenda, tanggal diterima, asal, perihal dan posisi. Klik membuka detail. Angka dibaca dari spreadsheet, dengan waktu pemuatan dan tombol Muat ulang; tidak ada angka ilustrasi yang ditanam sebagai data.

Ringkasan tidak memuat Selesai, Terlambat, SLA atau persentase penyelesaian. Catatan tindak lanjut terisi diberi label persis demikian, tanpa dianggap bukti selesai.

## 5. Daftar surat masuk

Pencarian: agenda, nomor surat, asal, perihal dan tujuan disposisi. Placeholder **Cari agenda, nomor surat, asal, atau perihal**.

Filter utama: periode diterima dan posisi surat. Filter tambahan: memiliki disposisi, memiliki keterangan tindak lanjut, atau memiliki tautan berkas. Filter tidak memerlukan master unit/PIC.

| Kolom default | Perilaku |
| --- | --- |
| Agenda | Teks asli, termasuk suffix; tautan detail |
| Tanggal diterima | Tanggal yang dapat dibaca diformat ringkas; teks tidak dikenali tetap terlihat |
| Nomor surat | Teks utuh dengan nol depan |
| Asal surat | Instansi/nama sesuai register |
| Perihal | Maksimal dua baris pada daftar; penuh di detail |
| Tujuan disposisi | Teks ringkas; gabungan tujuan tidak dipecah menjadi penugasan |
| Posisi surat | Badge teks asli atau Belum diisi |
| Aksi | Lihat; Edit bagi pencatat |

Paginasi 25/50/100 baris. Sorting hanya memengaruhi tampilan. Filter tetap dipertahankan setelah pengguna kembali dari detail.

Pada mobile, kartu menampilkan agenda, perihal, asal, tanggal dan posisi. Detail menjadi tempat melihat semua field. Baris template tidak tampil; baris surat sebagian tetap tampil dengan field kosong yang jelas.

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

Pengguna memilih periode dan posisi, lalu melihat preview register 14 kolom. Header memuat nama aplikasi/unit, filter dan waktu pembuatan.

Cetak menggunakan layout landscape, header tabel berulang dan gaya hitam-putih yang tetap terbaca. CSV menggunakan data sesuai filter. Tautan berkas menjadi opsi ekspor, tidak disisipkan tanpa pilihan pengguna.

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
