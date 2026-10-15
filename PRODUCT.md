# Product — SiDILAN

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Petugas pencatat menambah, mencari, dan memperbarui surat masuk. Pembaca melihat daftar, detail, dashboard, dan rekap sesuai akses akun Google.

## Product Purpose

Melanjutkan pencatatan surat masuk tanpa mengedit grid spreadsheet langsung. Cari surat, catat disposisi, perbarui posisi dan tindak lanjut, lalu cetak atau ekspor rekap dari data terkini.

## Positioning

Register spreadsheet yang sudah digunakan tetap menjadi sumber data; aplikasi membaca dan menyimpan kembali ke 14 kolom tab yang sama tanpa migrasi atau proses persetujuan baru.

## Operating Context

Google Apps Script Web App memakai akses Google dan data register surat masuk. Petugas bekerja dengan nomor agenda, tanggal surat, asal, perihal, disposisi, posisi surat, dan tautan berkas yang mungkin tidak seragam dalam data lama.

## Capabilities and Constraints

Dashboard memakai hitungan dan tren dari register; daftar surat dapat dicari, difilter, dan dipaginasi. Peran WRITE dapat menambah, mengedit, serta memperbarui disposisi dan tindak lanjut; peran baca tidak dapat mengubah data. Rekap mendukung cetak dan ekspor CSV. Pertahankan struktur spreadsheet, tanggal WIB, nilai historis, dan keamanan tautan. Jangan menciptakan angka dashboard, status workflow, SLA, notifikasi, atau fitur surat keluar yang belum tersedia.

## Brand Commitments

Nama SiDILAN dan kepanjangan “Sistem Digital Monitoring Tindak Lanjut Surat”; terminologi register berbahasa Indonesia. Referensi visual dashboard terlampir menentukan arah redesign, bukan isi statistik.

## Evidence on Hand

[PRD.md](PRD.md), [architecture.md](architecture.md), [design.md](design.md), implementasi `src/`, dan data aktual yang dikembalikan Google Apps Script saat aplikasi dijalankan. Tidak ada aset foto atau metrik pemasaran terverifikasi.

## Product Principles

- Satu sumber kebenaran: register yang ada.
- Temukan surat dan ambil tindakan tanpa alur persetujuan tambahan.
- Jelaskan data kosong, gagal, atau belum dimuat tanpa mengarang hasil.
- Jaga akses, tabel, dan formulir dapat digunakan dengan keyboard serta pada layar sempit.
