# SiDILAN — modul server Apps Script

Paket ini memecah `Code.js` yang diberikan menjadi file server kecil berdasarkan tanggung jawabnya. Nama dan bentuk respons fungsi yang dipanggil frontend tetap dipertahankan. Spreadsheet `SuratMasuk` tetap menjadi sumber data.

| File | Tanggung jawab |
| --- | --- |
| `Server/Api.js` | `doGet` dan sembilan fungsi global untuk `google.script.run` |
| `Server/Config.js` | Properti aplikasi dan pemetaan 14 kolom surat masuk |
| `Server/Auth.js`, `Server/Errors.js` | Pemeriksaan akses dan respons kesalahan |
| `Server/Repository.js` | Baca/tulis Spreadsheet, validasi header, pembentukan record, posisi baris |
| `Server/IncomingRead.js` | Status aplikasi, daftar, dan detail surat masuk |
| `Server/IncomingCreate.js` | Validasi dan pencatatan surat masuk baru |
| `Server/IncomingUpdate.js` | Validasi dan perubahan surat masuk |
| `Server/Filters.js`, `Server/Reports.js` | Penyaringan, statistik, dan laporan |
| `Server/Utils.js` | Tanggal, URL, dan normalisasi nilai |

Setiap modul menyimpan fungsi internal di dalam IIFE dan membuka antarmuka bernama `Sidilan...`. `Api.js` mempertahankan fungsi global agar pemanggilan frontend yang sudah ada tetap berlaku. Semua rujukan antarmodul terjadi saat fungsi dipanggil, sehingga tidak bergantung pada urutan eksekusi file saat inisialisasi. Server Apps Script memakai ruang nama global bersama dan tidak mendukung `import`/`export` ES6 secara langsung.

## Integrasi ke repo Apps Script

1. Salin hanya isi folder `Server/` ke folder sumber Apps Script yang digunakan oleh repo. File `.js` ini mengikuti format sumber lokal `clasp`; bila Anda menambah file langsung di editor Apps Script, gunakan file script `.gs` dengan isi yang sama.
2. Hapus atau kecualikan `Code.js` lama dari proses `clasp push`. Jika ikut dikirim, nama fungsi publiknya akan terdefinisi dua kali.
3. Pertahankan `Index.html`, `appsscript.json`, Script Properties (`SPREADSHEET_ID`, `SHEET_NAME`, `READ_EMAILS`, `WRITE_EMAILS`), dan layanan lanjutan Google Sheets pada project yang sudah ada. File-file tersebut tidak disertakan karena tidak tersedia pada lampiran.
4. Sesuaikan `.claspignore` yang **sudah ada** berdasarkan isi repo sebenarnya. Pastikan `Server/*.js` dan file UI/manifest yang diperlukan masuk, sedangkan `tests/`, fixture, dan file tooling lokal tidak ikut dikirim. Jalankan `clasp status` dan tinjau daftar file sebelum `clasp push`.
5. Jalankan pemeriksaan lokal sebelum mengganti deployment. Buat versi deployment baru setelah uji pada salinan spreadsheet atau lingkungan staging dengan akses yang sama.

Paket ini bukan pengganti penuh repo karena lampiran hanya berisi `Code.js`. Tidak ada perubahan pada spreadsheet atau deployment aktif.

## Uji kontrak

Jalankan `node tests/contract.test.cjs` dari folder paket. Test memuat semua modul di VM Node dengan urutan terbalik dan membandingkan hasilnya dengan `tests/fixtures/Code.original.js`. Skenario mencakup izin akses, konfigurasi, daftar, pencarian, laporan, detail, peringatan duplikat, penambahan dan perubahan data, bentuk permintaan tulis Sheets API, serta `doGet`. Ini simulasi perilaku, sehingga integrasi dengan `Index.html`, manifest, izin akun Google, dan spreadsheet asli tetap perlu diuji pada project Apps Script lengkap.

Pembacaan tren surat keluar pada dashboard masih ada karena fungsi tersebut sudah berada dalam kode asal; ini tidak menambahkan fitur pengelolaan surat keluar ataupun WhatsApp ke v1.
