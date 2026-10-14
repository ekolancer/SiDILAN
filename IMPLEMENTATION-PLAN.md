# SiDILAN v1 — Rencana Implementasi

**Basis:** [PRD.md](./PRD.md), [architecture.md](./architecture.md), [design.md](./design.md) dan keputusan sesi per 13 Oktober 2026.  
**Status (14 Oktober 2026):** Tahap 0–5 disetujui pemilik. Kode Tahap 6–8 kini tersedia lokal: edit parsial, dashboard, rekap/cetak/CSV. Uji kontrak dan build lokal lulus, tetapi uji terpadu terhadap spreadsheet salinan belum dijalankan. Hardening kode/CI Tahap 9 diterapkan sebagian; acceptance criteria AC-01–AC-12 dan production belum disetujui. Jangan push ke `main` sebelum target deployment dipastikan tetap project uji.

**Strategi:** Bertahap, setiap tahap punya gerbang verifikasi. Semua uji tulis menggunakan salinan spreadsheet; production tidak disentuh sebelum validasi dan persetujuan. Keberhasilan build/deploy dan tampilan pada akun allowlist bukan persetujuan gerbang baca.

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
- Deployment dari GitHub Actions sudah berjalan pada project yang dikonfigurasi; sebelum rilis berikutnya, verifikasi ulang ID spreadsheet salinan, izin deployment, dan `DEPLOYMENT_ID` karena keberhasilan workflow tidak membuktikan target aman. Tidak deploy production tanpa persetujuan eksplisit.

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
- [x] Manifest source diselaraskan ke `USER_ACCESSING`/`ANYONE` agar email aktif tersedia bagi pengguna Google dan allowlist server tetap berlaku; konfigurasi deployment setelah CI push harus diverifikasi sebelum rilis.

**Verifikasi / gerbang**
- [x] Akun allowlist kedua berhasil membuka aplikasi setelah deployment diubah ke execute-as-user, izin viewer spreadsheet ditambahkan, dan akun menyetujui otorisasi Apps Script.
- [ ] Pastikan email non-allowlist ditolak oleh endpoint server pada deployment uji.
- [ ] Viewer ditolak pada semua operasi tulis meski memanggil fungsi server langsung (butuh uji deployment).
- [x] Akun editor/WRITE lolos pemeriksaan izin; UI menampilkan role Pencatat.
- [x] Email/role dari browser tidak menentukan hak; server membaca identitas dan allowlist Script Properties.
- [x] Uji kontrak lokal dan build HTML Service lulus; workflow GitHub Actions pada commit perbaikan entry Vite berhasil push/deploy.
- [x] Verifikasi akun allowlist READ/WRITE pada deployment uji; akun kedua dapat masuk setelah execute-as-user, grant Viewer spreadsheet, dan persetujuan OAuth.
- [ ] Verifikasi akun non-allowlist ditolak; belum ada hasil uji yang dilaporkan.

### Tahap 2 — Pembacaan aman dan kontrak data

**Tujuan:** baca data campuran A:N di memori tanpa mengubah spreadsheet.

**Pekerjaan**
- [x] Buka spreadsheet melalui `SPREADSHEET_ID` server-side dan periksa tab/header sebelum membaca; verifikasi ulang pada deployment uji masih diperlukan.
- [x] Baca A:N secara batch untuk nilai, tampilan, formula, dan rich text; baca validasi posisi secara batch.
- [x] Bentuk record 14 kolom dengan `rowHint` dan hash snapshot sementara, tanpa menambah kolom sumber.
- [x] Kirim tanggal sebagai string tampilan (bukan objek `Date`) dan pertahankan teks tanggal mentah. Parser tanggal Indonesia/normalisasi tanggal khusus belum ada.
- [x] Ekstrak URL HTTPS dari rich text/formula `HYPERLINK` sederhana/URL literal tanpa mengeksekusi formula sebagai JavaScript.
- [ ] Uji bahwa agenda angka/teks/suffix, nol depan nomor surat, tujuan majemuk, formula, tanggal dan label hyperlink tetap benar pada data salinan; nilai tampilan digunakan di respons.
- [x] Ambil pilihan posisi dari validasi tab dan nilai posisi tersimpan; belum diuji untuk seluruh bentuk validasi live.
- [x] Klasifikasikan kandidat hanya bila salah satu B:F terisi bukan placeholder; baris agenda/uraian template dan anotasi A saja tidak ikut, tanpa forward-fill merge.
- [x] Hitung kegagalan pemrosesan per record dan kembalikan `warningCount`; uji baris rusak/global error pada salinan belum selesai.

**Verifikasi / gerbang**
- [ ] Uji kasus angka/teks/suffix agenda, tanggal numerik/teks, hyperlink berlabel, tujuan majemuk, nilai kosong/placeholder, formula, posisi lama, template/anotasi dan merge.
- [ ] Membuka atau membaca aplikasi tidak mengubah nilai, formula, formatting, hyperlink, merge, atau validasi sheet.
- [x] Kode pembacaan tidak memakai angka profil snapshot sebagai konstanta.

### Tahap 3 — Daftar, pencarian, filter, detail

**Tujuan:** kirim slice baca yang bisa digunakan viewer/editor.

**Pekerjaan**
- [x] Bangun daftar dengan paginasi server 50 record, urutan baris sumber, total hasil dan navigasi halaman.
- [x] Wajibkan kata kunci; trim tepi. Jika kosong tampilkan **“Masukkan kata kunci pencarian”** dan jangan query seluruh register.
- [x] Cari parsial tanpa membedakan kapital di A, C, E, F, G.
- [x] Tambahkan filter posisi multi-select, default semua posisi live/nilai historis; gabungkan pencarian dan filter sebelum paginasi. Perilaku filter perlu diuji di browser lintas perangkat.
- [x] Tampilkan status kosong, hasil nihil, loading, kegagalan RPC dan hitungan record dilewati; verifikasi kejelasan semua pesan belum selesai.
- [x] Buka detail dalam panel tanpa kehilangan kata kunci/filter/halaman; baca ulang baris dan periksa agenda serta hash snapshot.
- [x] Tampilkan field A:N di detail dengan multiline/placeholder; K/N menampilkan catatan atau tautan HTTPS baru dengan `noopener noreferrer`.
- [x] Render data sheet melalui interpolasi Vue, bukan sebagai markup HTML.
- [x] Hapus navigasi/form placeholder yang belum berfungsi; UI saat ini hanya daftar dan detail baca-saja.

**Verifikasi / gerbang**
- [ ] Pencarian wajib, hasil nihil/reset, multi-filter, paginasi, detail, kembali dengan state utuh teruji.
- [ ] Nilai HTML berbahaya tampil sebagai teks, tidak dieksekusi.
- [ ] Perubahan/hilangnya record saat daftar dimuat memicu pesan dan aksi muat ulang, bukan menampilkan detail yang salah.
- [ ] Uji desktop dan mobile; aksesibilitas dasar: label kontrol, fokus keyboard, kontras dan status yang diumumkan.

### Tahap 4 — Uji integrasi baca dan rilis tahap baca

**Tujuan:** nyatakan slice pertama siap sebelum mengaktifkan penulisan.

**Pekerjaan**
- [x] Jalankan skenario baca pada salinan dengan akun allowlist; akun kedua berhasil setelah grant Viewer dan persetujuan otorisasi Apps Script.
- [x] Pemilik mengonfirmasi data daftar/detail cocok dengan spreadsheet pada pengujian.
- [x] Pemilik menyatakan Tahap 4 sudah OK pada 2026-10-14.
- [x] Pemilik menyetujui slice baca sebagai selesai dan melanjutkan ke Tahap 5.
- [ ] Catat hasil spesifik uji non-allowlist, viewer-write-denial, dan audit aksesibilitas ketika hasil terinci tersedia.

**Kriteria selesai**
- [x] Data pada salinan tervalidasi oleh pemilik.
- [x] Pemilik menyetujui slice baca sebagai selesai pada 2026-10-14.
- [ ] Arsip hasil terinci untuk penolakan non-allowlist, viewer-write-denial, dan aksesibilitas.

### Tahap 5 — Tambah surat masuk

**Prasyarat:** Tahap 4 disetujui; project dan spreadsheet tetap salinan uji.

**Pekerjaan**
- [x] Form tambah dengan validasi UI dan validasi server untuk tanggal diterima B, nomor surat C, asal E, perihal F.
- [x] Simpan nomor surat sebagai teks; dukung field opsional D, H–N dan tanggal WIB.
- [x] Buat G dari identitas untuk record baru; tanggal surat kosong ditandai belum tersedia.
- [x] Deteksi nomor surat mirip dengan asal sama; tampilkan kandidat dan perlu konfirmasi eksplisit untuk lanjut.
- [x] Ambil `LockService`; baca ulang register dan agenda; hitung agenda numerik selanjutnya sambil menghindari agenda yang sudah digunakan.
- [ ] Pilih template hanya jika aman terhadap A:N, formula, merge, catatan dan data kolom lain. Guard lokal memeriksa isi, formula, note dan merge; verifikasi terhadap template salinan masih wajib. Insert fallback belum diterapkan; jika tidak ada baris template aman, operasi ditolak.
- [x] Tulis satu baris A:N menggunakan satu `Sheets.Spreadsheets.batchUpdate`, mempertahankan format dan menulis teks sebagai string literal.
- [x] Cegah submit ganda per UI dan validasi ulang server.
- [ ] Respons putus/ambigu harus diikuti pemeriksaan register; verifikasi pesan dan UX kegagalan RPC masih perlu.


**Verifikasi / gerbang**
- [ ] Uji field wajib, tanggal, nol depan, agenda berikutnya, suffix, template aman, duplikat, klik ganda dan kegagalan simpan.
- [ ] Bandingkan sebelum/sesudah: hanya baris target yang berubah; formula, hyperlink, formatting dan anotasi lain tetap.
- [ ] Uji concurrency dua editor; agenda ganda tidak tercipta.

### Tahap 6 — Edit dan pembaruan cepat

**Prasyarat:** pemilik menyatakan Tahap 5 lulus pada spreadsheet salinan (2026-10-14); detail hasil uji tidak disertakan dalam sesi ini.

**Pekerjaan**
- [x] Form edit detail untuk WRITE mendukung field B:F dan H:N yang relevan; A tetap tidak dapat diedit. G tidak diedit langsung.
- [x] Saat buka edit, UI menyimpan snapshot nilai baseline dan mengirim hash server untuk seluruh A:N.
- [x] Saat simpan, server mengambil lock, memvalidasi agenda/baris unik dan hash seluruh baris; konflik menolak sebelum write.
- [x] Validasi server dilakukan pada field yang dikirim saja; validasi tanggal, URL HTTPS, batas panjang dan field identitas wajib saat diubah.
- [x] Tulis hanya sel berubah dengan satu batch request per sel; tanggal ditulis sebagai serial numerik, teks sebagai string literal. Formula/format sel lain tidak ditulis oleh field mask `userEnteredValue`.
- [x] Pembaruan cepat H/I/J/L/M memakai form ringkas dengan endpoint/konflik/hak server yang sama.
- [x] Bila identitas berubah, tersedia pilihan eksplisit untuk membangun ulang G; tanpa pilihan itu G dipertahankan.
- [x] L hanya menerima posisi dari validasi live/nilai tersimpan; nilai historis tetap dipertahankan bila field tidak diedit.
- [ ] Verifikasi integrasi pada salinan untuk konflik aktual, perubahan formula/hyperlink, baris dipindah/hilang, agenda duplikat, edit parsial, dan hasil readback. Belum ada mutasi spreadsheet yang dijalankan dari sesi ini.

**Verifikasi / gerbang**
- [x] Kontrak lokal menolak payload field A/field tak dikenal, identitas kosong, URL aktif non-HTTPS; akses WRITE diuji lewat helper role.
- [x] `npm test`, `npm run test:build`, `node --check Code.js`, `git diff --check` lulus.
- [ ] Konflik tidak melakukan penulisan parsial atau overwrite diam-diam pada integrasi spreadsheet salinan.

### Tahap 7 — Dashboard

**Prasyarat:** klasifikasi record tahap 2 tervalidasi.

**Pekerjaan**
- [x] Backend menghitung surat nyata, diterima bulan berjalan WIB, distribusi posisi asli, memiliki H, memiliki M dari `readRegister_` yang juga digunakan daftar.
- [x] Tanggal B tak terbaca tidak ditebak; hitung terpisah untuk ringkasan.
- [x] Tidak ada label Selesai/Terlambat/SLA di respons backend.
- [x] Backend tidak memakai angka demo/hardcoded.
- [x] UI dashboard memuat angka, distribusi posisi, tanggal tak terbaca dan daftar terbaru melalui RPC live.
- [ ] Bandingkan angka dashboard dengan spreadsheet salinan, termasuk record parsial dan tanggal tak terbaca.

**Verifikasi / gerbang**
- [ ] Cocokkan tiap angka dashboard dengan hasil query/rekap dari dataset uji, termasuk record parsial dan tanggal tak terbaca.

### Tahap 8 — Rekap, cetak, CSV, responsif

**Pekerjaan**
- [x] Backend memakai helper pencarian/filter yang sama dengan daftar; rekap menambah filter periode berdasarkan tanggal diterima B.
- [x] Backend menghitung tanggal tak terbaca saat filter periode diterapkan; hasilnya tidak dipaksa masuk periode.
- [x] UI rekap memberi preview 14 kolom dan layout cetak landscape dengan header tabel berulang.
- [x] UI mengekspor CSV dari seluruh hasil filter dengan pilihan eksplisit untuk menyertakan URL HTTPS tautan.
- [x] Helper CSV menetralkan awalan formula `=`, `+`, `-`, `@` termasuk whitespace/kontrol; tes quoting/koma/newline dan BOM UTF-8 lulus.
- [ ] Uji ekspor dataset besar, hasil cetak pada browser, tanggal Indonesia, dan kesesuaian filter dengan spreadsheet salinan. Ekspor memakai seluruh hasil filter, bukan hanya halaman daftar yang sedang tampil.

**Verifikasi / gerbang**
- [ ] Cetak dan CSV sama dengan hasil filter; formula injection tidak dieksekusi; URL mengikuti pilihan ekspor.

### Tahap 9 — Hardening dan persetujuan production

**Pekerjaan**
- [ ] Jalankan seluruh acceptance criteria PRD AC-01–AC-12 pada salinan setelah kode Tahap 6–8 siap; tes kontrak/build lokal tidak cukup untuk menandai lulus. Secara khusus uji AC-05/08 terhadap konflik dan preservasi hyperlink setelah perubahan link dan regenerasi G.
- [ ] Periksa permission deployment, allowlist, URL app, scopes, Script Properties dan log sebelum deploy. Manifest lokal diselaraskan ke `USER_ACCESSING`/`ANYONE` dan CI menolak `DEPLOYMENT_ID` kosong sebelum push; konfigurasi aktual URL `/exec` tetap harus diaudit manual. Pemeriksaan file tracked lokal tidak menemukan berkas kredensial.
- [x] Respons server hanya memakai kode/pesan `safeError_`; cabang RPC failure UI menampilkan pesan umum tanpa exception mentah. Hasil simpan ambigu tetap meminta cek daftar sebelum mengulang.
- [ ] Uji simulasi respons putus dan error Apps Script pada deployment uji untuk memastikan tidak ada sukses palsu atau data sensitif.
- [ ] Pemilik meninjau hasil, mengonfirmasi ID production, akses email, deployment mode dan waktu cutover.
- [ ] Set production properties/deployment hanya setelah konfirmasi eksplisit; lakukan smoke test baca dahulu.
- [ ] Aktifkan tulis production hanya setelah smoke test baca dan persetujuan terpisah.
- [x] Langkah rollback versi deployment uji dicatat di `README-CICD.md`; rollback kode tidak membatalkan data yang telanjur berubah dan tidak memperbaiki data historis otomatis.

**Kriteria selesai v1**
- [ ] AC-01–AC-12 tervalidasi; tidak ada bug blocker/high yang diketahui.
- [ ] Production hanya diaktifkan setelah pemilik memberi persetujuan eksplisit untuk target dan hak akses.

## Progress log

Perbarui checkbox dan catatan singkat di sini saat tiap item selesai. Jangan tandai selesai hanya karena kode ditulis; gerbang verifikasi harus lulus.

| Tanggal | Tahap | Perubahan / hasil uji | Status | Blocker / keputusan |
| --- | --- | --- | --- | --- |
| 2026-10-13 | Perencanaan | Breakdown dibuat dari PRD, architecture, design dan keputusan sesi. Belum ada kode/deploy/sheet yang diubah. | Selesai | ID salinan dan akses perlu disediakan untuk Tahap 0. |
| 2026-10-13 | Tahap 0 | Audit konfigurasi dan diagnostik read-only project uji selesai. Salinan valid: Google Sheets native, tab/header cocok, akun terdaftar, data terdeteksi. Diagnostik sementara sudah dihapus setelah validasi. | Selesai | Tidak ada penulisan sheet atau deploy production. |
| 2026-10-13 | Tahap 1 | Server memakai Script Properties, identitas Google aktif, dan allowlist READ/WRITE; UI login lama dihapus. Pengguna melaporkan halaman terbuka dengan label Pencatat, akun lain belum berhasil masuk. | Kode/deployment ada; verifikasi lintas akun tertahan | Penyebab kegagalan akun lain belum diketahui. Manifest tetap `USER_DEPLOYING`/`ANYONE_ANONYMOUS`; mode dan izin deployment perlu ditinjau. |
| 2026-10-13 | Tahap 2–3 | Backend batch-read A:N; UI daftar, pencarian, filter posisi, paginasi 50 dan detail baca-saja dibuat. Uji kontrak Node lulus; UI dilaporkan tampil pada satu akun. | Kode terpasang; integrasi baca belum lulus | Cocokkan data dan edge case terhadap salinan; uji akses, HTML berbahaya, konflik detail, dan desktop/mobile. Jangan aktifkan tulis. |
| 2026-10-13 | Frontend dan CI | UI dimigrasikan ke Vue 3/Vite; source `app.html` dipakai sebagai entry agar build Linux tidak mencari `index.html`; build menghasilkan `Index.html` tunggal untuk HTML Service. GitHub Actions menjalankan `npm test`, `npm run test:build`, lalu memperbarui deployment ID tetap. Run perbaikan build berhasil. | Build/deploy berhasil; uji runtime terbatas | Build sukses tidak membuktikan seluruh perilaku baca benar. Komponen UI bergaya shadcn-vue yang dipakai saat ini Button/Input/Select; fitur tambah/edit belum ada. |
| 2026-10-14 | Gerbang Tahap 4 | Pemilik menyatakan Tahap 4 sudah OK setelah akun allowlist kedua berhasil masuk dan data cocok dengan spreadsheet. | Disetujui pemilik; detail uji tidak diarsipkan | Jangan menafsirkan persetujuan ini sebagai persetujuan production. Semua uji tulis berikut tetap hanya pada salinan. |
| 2026-10-14 | Tahap 5 | Pemilik menyatakan Tahap 5 lulus pada spreadsheet salinan dan meminta Tahap 6. | Disetujui pemilik | Detail hasil uji tidak tercatat pada sesi ini; tidak ada write spreadsheet dari sesi ini. |
| 2026-10-14 | Tahap 6 lokal | Implementasi update parsial, hash konflik A:N, unique agenda guard, validasi dirty fields, batch write terbatas, edit penuh/quick H/I/J/L/M, dan pilihan rebuild G. Uji kontrak dan build lulus. | Implementasi lokal; gerbang belum lulus | Uji integrasi konflik/readback, preservasi formula/hyperlink/format pada spreadsheet salinan belum dilakukan; belum deploy. |
| 2026-10-14 | Tahap 7–8 lokal | Backend dashboard/rekap dari register yang sama, parser tanggal numerik/teks Indonesia, UI ringkasan, filter periode, preview 14 kolom, cetak landscape dan CSV aman dengan opsi URL. Uji kontrak/CSV/build lulus. | Kode siap uji salinan; gerbang belum lulus | Hitungan data nyata, mobile/desktop, cetak, dataset besar dan kesesuaian filter harus diuji pada salinan. |
| 2026-10-14 | Tahap 9 parsial | Manifest execute-as-user/akun Google, penolakan CI bila deployment ID kosong, minimisasi izin workflow, rollback terdokumentasi, pesan error UI umum, dan perbaikan G pada update identitas dilakukan lokal. Kontrak dummy untuk konflik/write terbatas/CSV serta build lulus; dependency runtime tanpa advisory high. | Hardening lokal; rilis production belum disetujui | AC-01–AC-12, permission/deployment aktual, smoke test baca/tulis dan persetujuan terpisah tetap wajib. Tidak ada push/deploy/sheet write dari sesi ini. |
