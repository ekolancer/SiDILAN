# SiDILAN v1 — Rencana Implementasi

**Basis:** [PRD.md](./PRD.md), [architecture.md](./architecture.md), [design.md](./design.md) dan keputusan sesi per 13 Oktober 2026.  
**Status:** Tahap 0 selesai; Tahap 1 diterapkan lokal dan menunggu verifikasi role melalui deployment project uji.  
**Strategi:** Bertahap, setiap tahap punya gerbang verifikasi. Semua uji tulis menggunakan salinan spreadsheet; production tidak disentuh sebelum validasi dan persetujuan.

## Keputusan tetap

- Sumber data tetap tab `SuratMasuk`, kolom A:N. Tidak ada migrasi, tab baru, perubahan header, workflow, penghapusan surat, upload, atau notifikasi.
- Autentikasi memakai akun Google dan allowlist email. Konfigurasi `SPREADSHEET_ID`, `SHEET_NAME`, `READ_EMAILS`, `WRITE_EMAILS` di Script Properties. Project uji memakai ID dan allowlist terpisah dari production.
- Pengguna di luar allowlist ditolak dengan pesan umum **“Akses tidak diizinkan”**. Viewer hanya baca; editor boleh baca, tambah, dan edit. Pemeriksaan role selalu di server.
- Jika ID/tab/header tidak cocok, operasi berhenti dengan error konfigurasi yang jelas; aplikasi tidak membetulkan sheet otomatis.
- Tahap baca pertama: daftar, detail read-only, pencarian wajib, filter posisi. Daftar mengikuti urutan baris sumber dan dipaginasi 50 baris. Detail membuka panel agar state daftar tetap.
- Pencarian case-insensitive, partial match, trim spasi; kolom pencarian: agenda, nomor surat, asal, perihal, uraian berkas. Kosong menampilkan **“masukan kata kunci”**. Nol hasil menampilkan **“Tidak ada data yang cocok”** dan aksi reset.
- Surat nyata: minimal satu nilai identitas A–F bukan kosong/placeholder. Baris template/anotasi dikecualikan. Nilai kosong tampil **“Belum diisi”** tanpa mengubah sumber. Baris rusak dilewati dan jumlahnya diberitahukan.
- Filter posisi multi-select, default semua nilai posisi live termasuk kosong/label lama. Tautan mempertahankan label; hanya URL `https:` yang dapat dibuka.
- Konflik edit kelak membandingkan snapshot seluruh A:N dan menolak simpan bila ada perubahan apa pun. Edit hanya menulis sel yang diubah.
- Tambah kelak wajib memvalidasi B, C, E, F di server; agenda berikutnya dari angka tertinggi di register nyata. Potensi duplikat diberi peringatan, pengguna dapat membuka yang ada atau mengonfirmasi lanjut.
- Gunakan `LockService` untuk validasi agenda dan tulis. Jika hasil simpan ambigu akibat putus koneksi, pengguna harus memeriksa daftar sebelum mencoba lagi.
- Tidak deploy sampai konfigurasi project uji, ID salinan, dan akses dikonfirmasi. Tidak deploy production tanpa persetujuan eksplisit.

## Urutan tahap dan gerbang selesai

### Tahap 0 — Verifikasi prasyarat dan keselamatan

**Tujuan:** pastikan project dan salinan siap diuji tanpa risiko ke production.

**Pekerjaan**
- [x] Audit kode dan manifest Apps Script yang ada; petakan fungsi login lama, baca, tambah, dashboard, dan pemanggilan UI. Kode masih memakai login tab `Users` dan spreadsheet ID hardcoded; manifest memberi akses anonymous dan berjalan sebagai deployer.
- [x] Konfirmasi project `.clasp.json` terpisah dari production. Verifikasi identitas email pada deployment `execute as user accessing the web app` tetap menunggu konfigurasi dan pengujian project uji.
- [x] Pemilik mengonfirmasi `SPREADSHEET_ID` pada project uji mengarah ke spreadsheet salinan, bukan production; ID tidak ditulis ke kode atau dokumen.
- [x] Pemilik mengonfirmasi Script Properties project uji sudah dilengkapi: `SPREADSHEET_ID`, `SHEET_NAME=SuratMasuk`, `READ_EMAILS`, `WRITE_EMAILS` (nilai tidak diekspos).
- [x] Pemilik mengarsipkan semua versioned deployment project uji. Tidak ada deployment aktif yang perlu dipakai pada Tahap 0; tombol hapus memang tidak tersedia untuk versioned deployments. Jangan redeploy atau gunakan URL lama sebelum pengaman server dan akses terbatas disiapkan. Deployment uji dibuat lagi setelah pengamanan pada tahap berikutnya.
- [x] Baca metadata dan header A:N secara read-only; cocokkan Google Sheets native, nama tab, header, merge, validasi posisi, serta kondisi baris. `auditCopyReadOnly()` berhasil: Google Sheets native, akun diizinkan, tab ditemukan, header cocok setelah normalisasi whitespace; 1.169 baris, 677 kandidat surat, satu merge `I651:J651`, 6 pilihan validasi posisi, dan 2.328 formula. Sheet tidak diubah.

**Verifikasi / gerbang**
- [x] ID yang dikonfigurasi adalah ID salinan; pemeriksaan melewati guard ID production.
- [x] Tab dan header cocok, akses email teruji, snapshot profil data dasar tercatat.
- [x] Jika salah satu pemeriksaan gagal, hentikan fitur baca/tulis dan laporkan kondisi tanpa mengubah sheet.

**Tidak termasuk:** penulisan sheet, deploy production.

### Tahap 1 — Akses Google dan konfigurasi server

**Tujuan:** hilangkan login username/password dan tegakkan izin di server.

**Pekerjaan**
- [x] Tambahkan pembacaan konfigurasi Script Properties dengan validasi nilai wajib dan error yang tidak membocorkan konfigurasi.
- [x] Tambahkan pemeriksaan akses server pada endpoint publik yang tersedia: identitas Google aktif, normalisasi email, role READ/WRITE.
- [x] Tolak identitas kosong/tidak terdaftar; WRITE otomatis mencakup READ.
- [x] Hapus alur login username/password dari UI dan pemakaian tab `Users` sebagai autentikasi; tab tidak diubah.
- [x] Ganti tampilan login dengan status aplikasi dan penanganan akses ditolak/error konfigurasi yang aman.
- [ ] Tetapkan manifest/deployment setelah mode akses project uji dipastikan; konfigurasi saat ini masih `USER_DEPLOYING`/`ANYONE_ANONYMOUS`.

**Verifikasi / gerbang**
- [ ] Email allowlist baca dapat memanggil endpoint baca; email tanpa akses ditolak (butuh uji deployment).
- [ ] Viewer ditolak pada semua operasi tulis meski memanggil fungsi server langsung (butuh uji deployment).
- [ ] Editor lolos pemeriksaan izin server (butuh uji deployment).
- [x] Email/role dari browser tidak menentukan hak; server membaca identitas dan allowlist Script Properties.
- [x] Pemeriksaan sintaks lokal lulus; belum ada push/deploy dalam pengerjaan ini.

### Tahap 2 — Pembacaan aman dan kontrak data

**Tujuan:** baca data campuran A:N di memori tanpa mengubah spreadsheet.

**Pekerjaan**
- [ ] Buka spreadsheet hanya melalui `SPREADSHEET_ID` server-side; pastikan tab/header cocok sebelum membaca.
- [ ] Batch-read nilai, formula, rich text/hyperlink dan metadata yang diperlukan; hindari pembacaan sel satu per satu.
- [ ] Bentuk record 14 kolom dengan `rowHint` dan token/snapshot konflik sementara, tanpa menambah kolom sumber.
- [ ] Serialisasi tanggal menjadi nilai RPC yang aman; pertahankan teks tanggal yang tidak dikenali sebagai teks mentah.
- [ ] Ambil URL hyperlink rich text/formula secara aman; jangan mengeksekusi formula sebagai JavaScript.
- [ ] Pertahankan nomor agenda numerik/teks dan suffix, nomor surat dengan nol depan, tujuan majemuk, formula, dan label hyperlink.
- [ ] Ambil pilihan posisi yang diizinkan dari tab live dan nilai posisi yang tersimpan untuk menjaga label historis.
- [ ] Klasifikasikan surat nyata menggunakan aturan A–F yang disepakati; kecualikan template/anotasi; jangan forward-fill merged cell.
- [ ] Lewati record yang benar-benar tidak dapat dibaca, hitung, dan kembalikan peringatan terukur; jangan menyembunyikan error konfigurasi global.

**Verifikasi / gerbang**
- [ ] Uji kasus angka/teks/suffix agenda, tanggal numerik/teks, hyperlink berlabel, tujuan majemuk, nilai kosong/placeholder, formula, posisi lama, template/anotasi dan merge.
- [ ] Membuka atau membaca aplikasi tidak mengubah nilai, formula, formatting, hyperlink, merge, atau validasi sheet.
- [ ] Data live tidak memakai angka profil snapshot sebagai konstanta.

### Tahap 3 — Daftar, pencarian, filter, detail

**Tujuan:** kirim slice baca yang bisa digunakan viewer/editor.

**Pekerjaan**
- [ ] Bangun daftar dengan paginasi server 50 record, urutan baris sumber, total hasil dan navigasi halaman.
- [ ] Wajibkan kata kunci; trim tepi. Jika kosong tampilkan **“masukan kata kunci”** dan jangan query seluruh register.
- [ ] Cari parsial tanpa membedakan kapital di A, C, E, F, G.
- [ ] Tambahkan filter posisi multi-select, default semua posisi live/nilai historis; gabungkan pencarian dan filter sebelum paginasi.
- [ ] Tampilkan status kosong, hasil nihil, loading, kegagalan jaringan, error konfigurasi, dan hitungan record dilewati.
- [ ] Buka detail dalam panel tanpa kehilangan kata kunci/filter/halaman; ambil ulang baris terkini dan pastikan identitasnya masih cocok.
- [ ] Tampilkan semua kolom relevan dengan multiline dan placeholder **“Belum diisi”**; K/N mempertahankan label/catatan, tautan hanya `https:` dan membuka konteks baru dengan perlindungan opener.
- [ ] Escape data saat render HTML; jangan menyisipkan nilai sheet sebagai markup.
- [ ] Hapus menu/fitur placeholder yang memberi kesan fungsi sudah aktif bila mengganggu alur tahap ini.

**Verifikasi / gerbang**
- [ ] Pencarian wajib, hasil nihil/reset, multi-filter, paginasi, detail, kembali dengan state utuh teruji.
- [ ] Nilai HTML berbahaya tampil sebagai teks, tidak dieksekusi.
- [ ] Perubahan/hilangnya record saat daftar dimuat memicu pesan dan aksi muat ulang, bukan menampilkan detail yang salah.
- [ ] Uji desktop dan mobile; aksesibilitas dasar: label kontrol, fokus keyboard, kontras dan status yang diumumkan.

### Tahap 4 — Uji integrasi baca dan rilis tahap baca

**Tujuan:** nyatakan slice pertama siap sebelum mengaktifkan penulisan.

**Pekerjaan**
- [ ] Jalankan skenario pada salinan dengan akun allowlist READ, WRITE, dan akun tanpa akses.
- [ ] Cocokkan sampel data aplikasi dengan spreadsheet secara manual, termasuk edge case PRD.
- [ ] Catat defect dan perbaiki sebelum gerbang rilis.
- [ ] Deploy ke project uji hanya setelah pemilik mengonfirmasi konfigurasi dan akses; tidak mengarah ke production.

**Kriteria selesai**
- [ ] Data nyata salinan tervalidasi.
- [ ] Non-allowlist ditolak server-side.
- [ ] Daftar, detail, pencarian, filter, paginasi dan data campuran lulus uji.
- [ ] Tidak ada perubahan pada spreadsheet akibat tahap baca.
- [ ] Pemilik menyetujui slice baca sebagai selesai sebelum tahap tulis.

### Tahap 5 — Tambah surat masuk

**Prasyarat:** Tahap 4 disetujui; project dan spreadsheet tetap salinan uji.

**Pekerjaan**
- [ ] Form tambah dengan validasi antarmuka dan validasi server untuk tanggal diterima B, nomor surat C, asal E, perihal F.
- [ ] Simpan nomor surat sebagai teks; dukung field opsional D, H–N dan tanggal WIB.
- [ ] Buat G dari identitas untuk record baru; tanggal surat kosong ditandai belum tersedia.
- [ ] Deteksi potensi nomor surat serupa; tampilkan record yang ada dan pilihan kembali atau konfirmasi lanjut.
- [ ] Ambil `LockService`; baca ulang data nyata dan agenda; hitung agenda numerik berikutnya sambil mengecek keunikan terhadap seluruh agenda termasuk suffix.
- [ ] Pilih template aman hanya jika A:N tidak akan menimpa data, formula, merge, anotasi, catatan atau validasi; jika tidak ada, gunakan strategi append/insert aman dari architecture dan hentikan bila struktur meragukan.
- [ ] Tulis satu baris A:N dengan tipe/format yang menjaga nol depan, tanggal dan teks; jangan mengubah header/kolom lain.
- [ ] Cegah submit ganda di UI; selalu validasi ulang di server.
- [ ] Jika hasil RPC ambigu, arahkan pengguna memeriksa daftar sebelum mengulang.

**Verifikasi / gerbang**
- [ ] Uji field wajib, tanggal, nol depan, agenda berikutnya, suffix, template aman, duplikat, klik ganda dan kegagalan simpan.
- [ ] Bandingkan sebelum/sesudah: hanya baris target yang berubah; formula, hyperlink, formatting dan anotasi lain tetap.
- [ ] Uji concurrency dua editor; agenda ganda tidak tercipta.

### Tahap 6 — Edit dan pembaruan cepat

**Prasyarat:** tambah tervalidasi pada salinan.

**Pekerjaan**
- [ ] Form edit/detail editor mendukung field sesuai A:N; A tidak dapat diedit biasa.
- [ ] Saat buka form, simpan snapshot/hash seluruh A:N di sisi klien; jangan mempercayai `rowHint` sebagai identitas tunggal.
- [ ] Saat simpan, ambil lock, baca ulang baris, pastikan agenda/identitas dan seluruh snapshot cocok. Jika satu sel berubah, tolak seluruh simpan dan minta muat ulang.
- [ ] Validasi ulang hanya field yang diubah; jangan memaksa kelengkapan semua field historis.
- [ ] Tulis hanya sel yang benar-benar berubah; pertahankan formula, rich text/hyperlink, format dan nilai sel lain.
- [ ] Pembaruan cepat H/I/J/L/M dari detail memakai mekanisme konflik dan hak server yang sama.
- [ ] Jika identitas berubah, tampilkan preview uraian; G hanya berubah bila pengguna menyetujuinya.
- [ ] Nilai L mengikuti validasi live; nilai lama yang tidak ada tetap tampil sampai pengguna memilih pengganti.

**Verifikasi / gerbang**
- [ ] Uji konflik satu sel, perubahan formula/hyperlink, baris dipindah/hilang, agenda ganda, edit parsial, dan pembaruan H/I/J/L/M.
- [ ] Konflik tidak melakukan penulisan parsial atau overwrite diam-diam.

### Tahap 7 — Dashboard

**Prasyarat:** klasifikasi record tahap 2 tervalidasi.

**Pekerjaan**
- [ ] Hitung jumlah surat nyata, diterima bulan berjalan WIB, distribusi posisi asli, memiliki H, memiliki M.
- [ ] Tanggal tak terbaca tidak ditebak; tampilkan jumlahnya untuk ringkasan periode yang relevan.
- [ ] Jangan tampilkan Selesai, Terlambat atau SLA; jangan anggap posisi sebagai bukti selesai.
- [ ] Hapus angka demo/hardcoded dan samakan sumber hitung dengan klasifikasi daftar.

**Verifikasi / gerbang**
- [ ] Cocokkan tiap angka dashboard dengan hasil query/rekap dari dataset uji, termasuk record parsial dan tanggal tak terbaca.

### Tahap 8 — Rekap, cetak, CSV, responsif

**Pekerjaan**
- [ ] Gunakan himpunan hasil pencarian/filter yang sama dengan daftar; sediakan periode berdasarkan tanggal diterima.
- [ ] Tampilkan hitungan tanggal tak terbaca pada rekap periode.
- [ ] Cetak dengan layout yang mempertahankan makna 14 kolom.
- [ ] Ekspor CSV sesuai filter; URL hanya disertakan jika pengguna memilihnya.
- [ ] Escape nilai berawalan formula pada CSV agar dibuka sebagai data, bukan formula.
- [ ] Uji pagination/export dataset besar, encoding UTF-8, koma, kutip, newline dan tanggal Indonesia.

**Verifikasi / gerbang**
- [ ] Cetak dan CSV sama dengan hasil filter; formula injection tidak dieksekusi; URL mengikuti pilihan ekspor.

### Tahap 9 — Hardening dan persetujuan production

**Pekerjaan**
- [ ] Jalankan seluruh acceptance criteria PRD AC-01–AC-12 pada salinan.
- [ ] Periksa permission deployment, allowlist, URL app, scopes, Script Properties dan log; pastikan tak ada secret/ID yang ter-commit.
- [ ] Pastikan kegagalan simpan tidak menampilkan sukses palsu dan error pengguna tidak membocorkan detail sensitif.
- [ ] Pemilik meninjau hasil, mengonfirmasi ID production, akses email, deployment mode dan waktu cutover.
- [ ] Set production properties/deployment hanya setelah konfirmasi eksplisit; lakukan smoke test baca dahulu.
- [ ] Aktifkan tulis production hanya setelah smoke test baca dan persetujuan terpisah.
- [ ] Sediakan langkah rollback deployment tanpa mengubah data spreadsheet; jangan otomatis memperbaiki data historis.

**Kriteria selesai v1**
- [ ] AC-01–AC-12 tervalidasi; tidak ada bug blocker/high yang diketahui.
- [ ] Production hanya diaktifkan setelah pemilik memberi persetujuan eksplisit untuk target dan hak akses.

## Progress log

Perbarui checkbox dan catatan singkat di sini saat tiap item selesai. Jangan tandai selesai hanya karena kode ditulis; gerbang verifikasi harus lulus.

| Tanggal | Tahap | Perubahan / hasil uji | Status | Blocker / keputusan |
| --- | --- | --- | --- | --- |
| 2026-10-13 | Perencanaan | Breakdown dibuat dari PRD, architecture, design dan keputusan sesi. Belum ada kode/deploy/sheet yang diubah. | Selesai | ID salinan dan akses perlu disediakan untuk Tahap 0. |
| 2026-10-13 | Tahap 0 | Audit konfigurasi dan diagnostik read-only project uji selesai. Salinan valid: Google Sheets native, tab/header cocok, akun terdaftar, data terdeteksi. Diagnostik sementara sudah dihapus setelah validasi. | Selesai | Tidak ada penulisan sheet atau deploy production. |
| 2026-10-13 | Tahap 1 | Helper konfigurasi/role server dipertahankan; UI username/password, mock sukses, dashboard/data/form palsu dihapus. UI kini memanggil `getAppStatus()` dan menampilkan status aman atau peran akun. Diagnostik spreadsheet sementara dihapus; cek sintaks JavaScript lulus. | Lokal; verifikasi akses menunggu | Belum push/deploy. Manifest tetap anonymous/deployer hingga mode deployment project uji dipastikan. Belum menguji akun READ/WRITE/non-allowlist di deployment. |
| 2026-10-13 | Tahap 2–3 | Menambahkan daftar surat hasil pencarian wajib, filter posisi, paginasi 50 baris, status data dilewati, detail baca-saja yang mengambil ulang snapshot dan tautan HTTPS aman. Data dirender dengan `textContent`; state pencarian tetap saat buka/tutup detail. | Implementasi lokal; belum diverifikasi live | Belum push/deploy. Uji akses dan data wajib dijalankan pada deployment project uji; uji kontrak lokal masih perlu dituntaskan. Tidak ada perubahan pada spreadsheet. |
| 2026-10-13 | Keputusan frontend | Vue 3 + Vite disetujui. Architecture diperbarui untuk memisahkan source UI, output HTML Service, build CI dan deployment satu ID tetap. | Keputusan; belum diterapkan | Migrasi source UI, konfigurasi/build Vite, lockfile, pengujian build, aturan clasp ignore/output, dan hardening GitHub Actions masih perlu dikerjakan. |
