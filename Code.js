// ==========================================
// KONFIGURASI DATABASE
// Ganti string di bawah dengan ID Spreadsheet Anda
// ==========================================
const SPREADSHEET_MASUK_ID = '18zKxtYJxPVhdMWzSadat4GEwXqSjp3ZV'; // Berisi tab SuratMasuk & Users
const SPREADSHEET_KELUAR_ID = '18zKxtYJxPVhdMWzSadat4GEwXqSjp3ZV'; // Berisi tab SuratKeluar

// Fungsi utama untuk me-render HTML
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SiDILAN - Monitoring Surat')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// FUNGSI AUTENTIKASI
// ==========================================
function checkLogin(username, password) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_MASUK_ID).getSheetByName('Users');
    if (!sheet) return { success: false, message: 'Sheet Users tidak ditemukan.' };
    
    const data = sheet.getDataRange().getValues();
    
    // Mulai dari baris 1 (mengabaikan header di baris 0)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username && data[i][1] === String(password)) {
        return {
          success: true,
          user: {
            username: data[i][0],
            name: data[i][2],
            role: data[i][3]
          }
        };
      }
    }
    return { success: false, message: 'Username atau password salah.' };
  } catch (error) {
    return { success: false, message: 'Error sistem: ' + error.message };
  }
}

// ==========================================
// FUNGSI DATA SURAT MASUK
// ==========================================
function getSuratMasuk() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_MASUK_ID).getSheetByName('SuratMasuk');
    if (!sheet) return JSON.stringify([]);
    const data = sheet.getDataRange().getValues();
    
    // Konversi array 2D ke array of objects
    const headers = data[0];
    const rows = data.slice(1);
    const result = rows.map((row, index) => {
      let obj = { id: index + 2 }; // Simpan nomor baris untuk update/delete
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
    
    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

function saveSuratMasuk(dataObj) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_MASUK_ID).getSheetByName('SuratMasuk');
    const rowData = [
      dataObj.nomorAgenda || '',
      dataObj.tglDiterima || '',
      dataObj.noSurat || '',
      dataObj.tglSurat || '',
      dataObj.asalSurat || '',
      dataObj.perihal || '',
      dataObj.uraian || '',
      dataObj.isiDisposisi || '',
      dataObj.tujuanDispo || '',
      dataObj.ketParaf || '',
      dataObj.linkBerkas || '',
      dataObj.posisiSurat || '',
      dataObj.ketTindakLanjut || '',
      dataObj.linkBerkasTL || ''
    ];
    sheet.appendRow(rowData);
    return { success: true, message: 'Data Surat Masuk berhasil ditambahkan!' };
  } catch (error) {
    return { success: false, message: 'Gagal menyimpan: ' + error.message };
  }
}

// ==========================================
// FUNGSI DASHBOARD STATS
// ==========================================
function getDashboardStats() {
  try {
    let masukCount = 0;
    let keluarCount = 0;
    
    const sheetMasuk = SpreadsheetApp.openById(SPREADSHEET_MASUK_ID).getSheetByName('SuratMasuk');
    if (sheetMasuk) {
      masukCount = Math.max(0, sheetMasuk.getLastRow() - 1);
    }
    
    const sheetKeluar = SpreadsheetApp.openById(SPREADSHEET_KELUAR_ID).getSheetByName('SuratKeluar');
    if (sheetKeluar) {
      keluarCount = Math.max(0, sheetKeluar.getLastRow() - 1);
    }
    
    return JSON.stringify({
      suratMasuk: masukCount,
      suratKeluar: keluarCount,
      total: masukCount + keluarCount,
      perluTindakLanjut: Math.floor(masukCount * 0.3) // Dummy stat untuk demo
    });
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}