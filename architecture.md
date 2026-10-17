# Architecture — SiDILAN v1

**Versi:** 1.2 · 13 Oktober 2026  
**Platform:** Google Apps Script V8, HTML Service dan spreadsheet yang sudah digunakan  
**Cakupan:** Baca, tambah dan edit pencatatan surat masuk  
**Dokumen terkait:** [PRD.md](PRD.md), [design.md](design.md)  
**Status:** Vue 3 + Vite disepakati; migrasi UI/build belum diterapkan

## 1. Arsitektur minimum

Aplikasi menggunakan Vue 3 untuk UI, Vite untuk build frontend, dan Google Apps Script sebagai web app/backend. Vite membangun aset statis yang disajikan HTML Service; komponen Vue memanggil fungsi server melalui `google.script.run`. Backend membaca dan memperbarui tab SuratMasuk pada spreadsheet yang sama.

| Komponen | Tanggung jawab |
| --- | --- |
| Vue 3 | Form, daftar/detail, dashboard dan preview rekap; tidak mengakses spreadsheet langsung |
| Vite | Build aset frontend menjadi HTML/CSS/JavaScript yang kompatibel dengan HTML Service |
| HTML Service | Menyajikan hasil build dari Apps Script |
| Apps Script | Pemeriksaan akses, validasi, pencarian, penentuan agenda dan penyimpanan |
| Spreadsheet saat ini | Sumber data utama dengan 14 kolom A:N |
| Google Drive saat ini | Lokasi berkas yang ditautkan pada register; izin berkas mengikuti konfigurasi yang sudah berlaku |

Satu proyek Apps Script terhubung ke ID spreadsheet tetap. Tidak ada database baru, pemisahan register menjadi tabel Letters/Dispositions/Assignments, proses migrasi, mesin status, request ledger permanen atau worker latar belakang untuk v1. Build Vite berjalan di CI sebelum `clasp push`; hasil build yang disinkronkan adalah satu-satunya UI yang diunggah. URL web app tetap dilayani Apps Script, bukan server Vite terpisah.

## 2. Koneksi spreadsheet

Konfigurasi pengelola di Script Properties:

| Kunci | Isi |
| --- | --- |
| SPREADSHEET_ID | ID spreadsheet yang sekarang digunakan |
| SHEET_NAME | SuratMasuk, setelah dicocokkan dengan tab live |
| READ_EMAILS | Email Google yang boleh membaca |
| WRITE_EMAILS | Email Google yang boleh menambah/mengedit |
| OUTGOING_SPREADSHEET_ID | Opsional; ID spreadsheet terpisah untuk seri Surat Keluar pada tren Dashboard |
| OUTGOING_SHEET_NAME | Opsional; nama sheet pada spreadsheet Surat Keluar dengan header `Tanggal Surat` |

Target URL yang diberikan pengguna: [spreadsheet surat masuk](https://docs.google.com/spreadsheets/d/18zKxtYJxPVhdMWzSadat4GEwXqSjp3ZV/edit?gid=839241284#gid=839241284).

Server menggunakan `SpreadsheetApp.openById`, bukan active spreadsheet atau ID yang dikirim browser. Tren Surat Keluar dibaca secara terpisah dan hanya agregat bulanan yang dikirim ke UI; tanpa dua properti opsional atau akses baca sheet, seri keluar ditandai belum tersedia dan tidak diasumsikan nol. Header A:N diperiksa terhadap mapping yang ditetapkan; perubahan header yang tidak kompatibel menghasilkan error konfigurasi sebelum write. Aplikasi tidak mengganti nama header untuk membuatnya cocok.

Workbook XLSX yang diperiksa adalah referensi struktur. File tersebut tidak diimpor sebagai database produksi. Spreadsheet live perlu diverifikasi aksesnya, format native Google Sheets dan tab tujuan; sheetId Excel tidak dianggap sama dengan gid Google. Jika target belum kompatibel, penyesuaian target harus dibahas dengan pemilik sebelum implementasi menulis data.

Tab Users dan kolom lain di luar A:N tidak digunakan sebagai field aplikasi atau ditimpa. Pemeriksaan keamanan lokasi baris boleh membaca keberadaan catatan di kolom lain agar baris tersebut dilewati. Tidak menambah kolom tersembunyi, ID baru, tanggal SLA, status workflow atau tabel akun sebagai syarat v1.

## 3. Akses Google

Pilihan awal: deployment **execute as user accessing the web app**. Pengguna mempunyai akses Google Sheets yang diperlukan, walaupun pencatatan sehari-hari dilakukan lewat UI. Backend mengambil identitas aktif dari Google dan memeriksa daftar READ/WRITE pada setiap fungsi publik; email/role dari payload bukan sumber izin.

- Pembaca boleh query, detail, dashboard dan rekap; fungsi tambah/edit ditolak.
- Pencatat pada WRITE_EMAILS otomatis boleh membaca, menambah dan mengedit register.
- Akun tanpa daftar akses atau identitas aktif yang kosong ditolak.
- Kegagalan izin spreadsheet dijelaskan kepada pengguna, tanpa mencoba membagikan file otomatis.
- Password teks biasa pada tab Users tidak digunakan atau dikirim ke browser.
- Konfigurasi dan deployment hanya dikelola editor proyek yang dipercaya.

Mode execute as user menggunakan izin Google akun masing-masing. Akses aplikasi tidak membatasi kemampuan seseorang yang juga memiliki hak edit langsung pada spreadsheet. V1 tidak memberikan pengamanan per surat atau klasifikasi akses baru.

Bila organisasi memilih execute as deployer kemudian, uji identitas email aktif dan pembatasan akses pada domain yang sesungguhnya dahulu. Jangan mengganti identitas pengguna dengan `getEffectiveUser()` atau membuat login email/PIN bersama. Pilihan deployment final ditentukan dari akun yang tersedia, tanpa menambah sistem autentikasi sendiri.

## 4. Model data: 14 kolom yang sama

| Kolom | Nama pada payload | Jenis baca/tulis |
| --- | --- | --- |
| A | agenda | String identitas register; nomor lama termasuk suffix |
| B | receivedDate | Tanggal atau teks tanggal lama |
| C | letterNumber | Teks |
| D | letterDate | Tanggal/null/teks lama |
| E | sender | Teks |
| F | subject | Teks |
| G | documentDescription | Nilai/formula lama; string uraian untuk pencatatan baru |
| H | disposition | Teks multiline |
| I | dispositionTargets | Teks multiline, boleh tujuan majemuk |
| J | parafDateOrNote | Tanggal atau catatan |
| K | letterFileReference | URL/hyperlink/teks lama |
| L | letterPosition | Teks sesuai pilihan yang berlaku |
| M | followupNote | Teks multiline |
| N | followupReference | URL atau catatan lama |

Setiap record respons juga membawa `rowHint` dan `expectedHash`, yang dihitung saat membaca. Keduanya adalah informasi teknis sementara di browser, bukan kolom baru. RowHint membantu pencarian, tetapi server selalu memastikan agenda dan isi baris sesuai sebelum write.

Agenda lama diperlakukan sebagai teks; tidak dikonversi menjadi UUID atau format SM/tahun. Agenda baru melanjutkan angka pada register nyata. A tidak dapat diubah dari form edit biasa. Jika agenda ganda ditemukan, baris tetap dapat dilihat tetapi edit diblokir sampai identitasnya diselesaikan pada spreadsheet; server tidak memilih baris pertama diam-diam.

## 5. Pembacaan yang menjaga data lama

Baca A:N pada range terisi dengan operasi batch: value, formula dan rich text/hyperlink yang dibutuhkan. Hindari pemanggilan sel satu per satu. Data dibentuk di memori, kemudian dicari, difilter, diurutkan dan dipaginasi sebelum respons. Tidak melakukan sort baris fisik spreadsheet.

Klasifikasi baris:

- Baris memiliki satu atau beberapa field identitas B:F → kandidat pencatatan; tampilkan meskipun belum lengkap.
- Baris hanya agenda/uraian template tanpa B:F → bukan surat.
- Baris anotasi seperti nama pada A tanpa identitas B:F → bukan surat.
- Gabungan sel/catatan tidak dibersihkan atau diisi forward-fill otomatis.

Snapshot unggahan memiliki 677 kandidat, 490 template dan satu anotasi. Angka ini adalah kontrol pemeriksaan pada salinan uji, bukan batas row hardcoded. Data live dapat bertambah.

Normalisasi untuk tampilan hanya dilakukan di memori:

- Date dari SpreadsheetApp menjadi string ISO/tampilan Indonesia sebelum dikirim melalui RPC; objek Date tidak dikirim langsung.
- Teks tanggal Indonesia dibaca dengan parser eksplisit. Placeholder atau teks tidak dikenali tetap tersedia sebagai raw text.
- K/N menggunakan target rich text atau formula hyperlink bila tersedia dan dapat dibaca, lalu URL literal sebagai fallback. Formula lama tidak dieksekusi sebagai JavaScript.
- Jika N berisi nama/catatan, respons menyatakan jenis TEXT; tidak membuat file atau penugasan dari nilainya.
- I tetap teks majemuk; tidak memerlukan dictionary unit, resolusi penerima atau daftar akses berdasarkan tujuan.
- Pilihan L berasal dari validasi tab live jika ada, ditambah nilai tersimpan untuk menampilkan nilai lama. Tidak mengubah label lama hanya untuk menyamakan ejaan.

G449 yang salah referensi, merge I651:J651, tanggal kosong/placeholder dan potensi ganda tetap menjadi kondisi sumber. Membuka aplikasi tidak memperbaiki atau mengubahnya.

## 6. Penambahan pencatatan

1. Periksa akses WRITE serta tanggal diterima, nomor surat, asal dan perihal.
2. Ambil `LockService.getScriptLock()` dengan timeout pendek.
3. Baca ulang kandidat nyata dan agenda yang sudah digunakan. Hitung kelanjutan agenda dari nomor numerik pada pencatatan nyata; abaikan suffix dan angka cadangan template untuk nilai maksimum, tetapi tetap cek keunikan keseluruhan.
4. Pilih baris template pertama yang aman sesudah pencatatan terakhir: hanya agenda/uraian template, B:F kosong, tidak merged dan tidak memuat catatan/data lain yang akan tertimpa.
5. Jika agenda cadangan baris tersebut konsisten, isi baris itu. Jika tidak cocok atau tidak ada baris aman, sisipkan baris baru setelah pencatatan terakhir sebelum bagian template, sehingga template/anotasi tidak ditimpa.
6. Tulis A:N sesuai form melalui batchUpdate yang sama dengan prinsip pada bagian edit: stringValue untuk teks dan nilai tanggal bertipe benar. Jika perlu insert baris, sertakan insertDimension dan penulisan pada batch yang sama. Agenda dihasilkan server; G berupa uraian identitas dengan tanggal terformat. Format baris baru mengikuti register.
7. Selesaikan write, lepaskan lock melalui finally, dan kembalikan agenda/baris aktual untuk readback.

Usulan ini tidak memakai getLastRow sebagai penentu agenda atau lokasi append karena spreadsheet memiliki banyak template. Keberadaan header ulang, anotasi, data di kolom lain atau merged range diperiksa saat memilih lokasi. Penambahan lewat aplikasi diserialkan oleh satu ScriptLock pada satu proyek.

Nomor agenda pada template yang tersisa tidak dihitung ulang massal. Jika aturan organisasi berbeda, cukup sesuaikan fungsi pembentukan agenda sebelum rilis.

## 7. Edit tanpa menimpa sel lain

Payload edit mengirim agenda, rowHint, expectedHash dan **field yang berubah saja**. Server menggunakan allowlist mapping A:N dan menolak perubahan A atau kolom di luar cakupan.

Di bawah ScriptLock:

1. Resolusikan baris berdasarkan agenda dan pastikan masih merupakan pencatatan surat.
2. Baca ulang value/formula/target hyperlink baris tersebut.
3. Hitung hash deterministik isi baris, termasuk formula dan hyperlink yang relevan. Jika berbeda dari hash saat form dibuka, kembalikan konflik sebelum write.
4. Validasi field yang berubah. Teks lama pada field lain tidak diubah atau dituntut lengkap.
5. Kirim satu `Sheets.Spreadsheets.batchUpdate` melalui Advanced Sheets Service untuk memperbarui sel yang berubah. Gunakan `updateCells` dengan field mask terbatas; gaya sel lain dan semua kolom yang tidak berubah tidak disentuh.
6. Baca ulang hasil dan kirim data terbaru.

Advanced Sheets Service hanya dipakai agar perubahan beberapa sel dapat diterapkan dalam satu request. Ini tidak menambah tabel atau workflow. Teks pengguna ditulis sebagai `userEnteredValue.stringValue`, sehingga input seperti `=...` tidak menjadi formula. Tanggal input baru menggunakan nilai tanggal numerik dan format tanggal yang sesuai. Pada sel tautan yang memang diganti, metadata tautan lama disesuaikan agar tidak membuka URL lama.

Mengedit H/L/M tidak menulis ulang seluruh A:N. Formula G, hyperlink K, agenda, tanggal dan formatting tetap utuh bila tidak diedit. G lama hanya diganti jika pengguna memilih pembaruan uraian.

Sel merged yang tidak dapat ditulis aman ditolak dengan penjelasan khusus untuk field terkait. Mengedit field lain pada baris tersebut masih boleh; aplikasi tidak membongkar merge sumber secara otomatis.

**Batas concurrency:** ScriptLock mengendalikan writer di proyek Apps Script yang sama, bukan edit manual Google Sheets atau proyek lain. Hash mendeteksi perubahan yang sudah terjadi saat baris dibaca ulang, tetapi bukan transaksi compare-and-swap terhadap editor manual. Hindari edit simultan pada surat yang sama melalui grid dan aplikasi. V1 tidak mengklaim isolasi penuh terhadap semua writer.

## 8. Penanganan klik ganda dan respons terputus

Saat simpan berlangsung, tombol dinonaktifkan dan satu halaman hanya menjalankan satu mutasi pada satu waktu. Form tidak menutup sebelum respons berhasil.

Jika respons terputus, UI menampilkan hasil belum diketahui dan memuat ulang register sebelum menawarkan ulang simpan. Create tidak di-retry otomatis; cocokkan kandidat baru melalui nomor surat, tanggal, asal dan perihal terlebih dahulu. Jika masih ambigu, petugas memeriksa hasil.

V1 tidak menyediakan jaminan exactly-once lintas koneksi tanpa ledger/ID persisten. Pencegahan klik ganda, lock dan pemeriksaan ulang merupakan perlindungan yang cukup untuk scope awal, dengan batas ini dinyatakan jelas.

## 9. Fungsi publik

| Fungsi | Tanggung jawab |
| --- | --- |
| doGet(e) | Menghasilkan shell HTML tanpa mutasi |
| getInitialData() | Identitas, kemampuan READ/WRITE dan pilihan posisi |
| listIncomingLetters(query) | Pencarian/filter/paginasi, maksimal 100 baris per halaman |
| getIncomingLetter(reference) | Detail dan hash terkini |
| createIncomingLetter(payload) | Tambah pada tab yang sama |
| updateIncomingLetter(payload) | Edit field yang berubah |
| getDashboard(query) | Ringkasan sesuai definisi PRD |
| getIncomingReport(query) | Data preview cetak/CSV sesuai filter |

Helper internal diberi akhiran underscore agar tidak dipanggil melalui google.script.run. Semua fungsi publik tetap memeriksa akses; menyembunyikan tombol tidak cukup.

DTO hanya menggunakan string, number, boolean, null, object dan array yang legal untuk RPC. Panggilan dependen dijalankan berurutan dengan success/failure handler. Error minimum: ACCESS_DENIED, VALIDATION_ERROR, NOT_FOUND, AMBIGUOUS_AGENDA, DATA_CHANGED, BUSY dan SHEET_UNAVAILABLE.

Respons tidak membawa password, token OAuth, konfigurasi akses atau stack trace. Frontend tidak mengirim ID spreadsheet sebagai target write.

## 10. Dokumen dan ekspor

Lampiran v1 menggunakan tautan yang sudah ada atau ditempel pengguna. Tidak mengunggah, menyalin, memindahkan atau membagikan ulang berkas secara otomatis. Aplikasi membuka URL HTTPS yang aman; javascript/data URL tidak menjadi tautan aktif.

Izin Drive tetap berlaku. Akses membaca register tidak otomatis memberi izin membuka file. Jangan mempublikasikan folder atau mengganti permission untuk mengatasi error akses.

CSV mempertahankan 14 kolom dan quoting yang benar, dengan mitigasi awal formula seperti =, +, -, @ serta kontrol leading. Ekspor tautan berkas mengikuti pilihan pengguna. Cetak memakai HTML print; generator PDF khusus tidak diperlukan.

## 11. Struktur kode dan konfigurasi rilis

Struktur frontend yang disepakati:

| File / direktori | Isi |
| --- | --- |
| `src/main.js` | Inisialisasi Vue dan mount aplikasi |
| `src/App.vue` | Shell UI, navigasi dan koordinasi inisialisasi antarfitur |
| `src/components/views/` | Tampilan dashboard, daftar, detail, form dan rekap; menerima model reaktif dari composable |
| `src/composables/` | State dan alur terpisah untuk surat, dashboard dan rekap |
| `src/lib/letterFields.js` | Definisi kolom register, grup field dan format tampilan bersama |
| `src/services/appsScript.js` | Wrapper Promise dan API bernama untuk `google.script.run` |
| `src/style.css` | Token, CSS aplikasi, responsif dan cetak |
| `Code.js` | `doGet` serta fungsi publik/internal Apps Script |
| `Index.html` | Shell HTML Service hasil build Vite; bukan sumber UI yang diedit manual |
| `vite.config.js` | Build satu entry HTML dan pengaturan aset kompatibel HTML Service |
| `.claspignore` | Mengecualikan source frontend, dependency, test dan file build perantara dari upload |
| `appsscript.json` | V8, timezone Asia/Jakarta, scope dan Advanced Sheets Service |

Source Vue/Vite dikelola terpisah dari file Apps Script yang didorong. Build menghasilkan HTML/CSS/JavaScript statis tanpa server Node saat runtime. Pipeline GitHub Actions menjalankan `npm ci`, build dan pengujian, lalu menyiapkan hanya output Apps Script sebelum `clasp push` dan update deployment tetap. Build lokal tidak boleh mengubah source yang tidak terkait; hasil final diperiksa sebelum push. Scope dipilih minimum untuk spreadsheet dan identitas yang diperlukan; membuka tautan Drive di browser tidak membutuhkan kemampuan server mengubah izin Drive.

Uji dengan salinan spreadsheet yang mempertahankan struktur/sampel. Target produksi tetap spreadsheet yang sekarang digunakan; salinan uji bukan database baru yang perlu dimigrasikan. Atur script dan spreadsheet pada timezone Asia/Jakarta setelah memastikan perubahan timezone target disetujui pemilik.

Deployment produksi memakai versi tertentu dan URL /exec. /dev hanya untuk pengujian pengembang. Pengelola memastikan akses akun dan hak spreadsheet sebelum rilis. Backup/copy manual spreadsheet sebelum rilis dianjurkan sebagai langkah operasi; sistem backup otomatis baru bukan fitur wajib v1.

## 12. Pipeline build dan rilis

- Source Vue/Vite menjadi sumber UI; jangan mengedit hasil build `Index.html` secara manual.
- CI memasang dependency dari lockfile dengan `npm ci`, menjalankan test, lalu membuat output production tanpa development server.
- Build harus menghasilkan entry `Index.html` dan inline atau salin aset ke format yang disajikan HTML Service; tidak boleh menyisakan referensi `/src`, Vite dev client, import map/runtime server, atau URL asset yang tidak tersedia pada Apps Script.
- Pipeline mengunggah `Code.js`, `Index.html`, `appsscript.json` dan file `.gs` yang diperlukan saja. `node_modules`, source UI, test dan dokumentasi tidak dikirim sebagai file script.
- Hanya setelah test/build lulus, CI menjalankan `clasp push --force`, membuat versi dan memperbarui deployment ID tetap dari secret. Jika ID tidak tersedia, pipeline harus gagal alih-alih membuat deployment duplikat.
- Perubahan permission, Script Properties, spreadsheet target dan pengaturan deployment tidak dilakukan oleh build.

## 13. Pemeriksaan sebelum rilis

- Build Vue production berjalan deterministik dari lockfile dan output kompatibel dengan HTML Service.
- Baca data lama dan cocokkan 677 kandidat pada snapshot; template/anotasi tidak dihitung.
- Tambah pada salinan uji tanpa menimpa template, anotasi, merge atau data di kolom lain.
- Dua create bersamaan melalui aplikasi menghasilkan agenda berbeda.
- Edit posisi/catatan mempertahankan formula G dan hyperlink K; agenda 354.a tetap teks.
- Tanggal numerik, teks Indonesia, nilai kosong/placeholder dan catatan N tetap terbaca.
- Konflik setelah edit manual yang sudah selesai terdeteksi; user diminta memuat ulang.
- Akun READ tidak dapat memanggil create/update; akun tanpa akses ditolak.
- Input formula/HTML tidak dieksekusi; tautan aman dan CSV/cetak dapat dipakai.
- Dashboard tidak menganggap posisi/isi tindak lanjut sebagai bukti penyelesaian.
- Form desktop/mobile dan kegagalan koneksi/simpan diperiksa.

## 14. Batas v1 dan arah berikutnya

Workflow kompleks, tabel persetujuan, penugasan PIC, tenggat, audit permanen, upload langsung dan penyimpanan baru tidak diperlukan untuk menjalankan pencatatan v1. Penambahan fitur tersebut kelak harus berdasarkan kebutuhan yang disepakati.

V2 menambahkan surat keluar dan integrasi WhatsApp. Tidak membuat endpoint webhook, antrean pengiriman atau token WA pada v1.

## 15. Referensi resmi

Diakses 13 Oktober 2026. Struktur dan pilihan implementasi di atas merupakan rancangan SiDILAN.

- [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web) — mode eksekusi dan deployment.
- [HTML Service: Communicate with Server Functions](https://developers.google.com/apps-script/guides/html/communication) — RPC async dan tipe payload.
- [Session](https://developers.google.com/apps-script/reference/base/session) — identitas dan timezone.
- [LockService](https://developers.google.com/apps-script/reference/lock/lock-service) — scope penguncian.
- [Sheets spreadsheets.batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate) — penulisan sel terpilih dalam satu request.
