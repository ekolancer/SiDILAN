// Errors: server Apps Script; loaded into the project global scope by clasp.
const SidilanErrors = (() => {
  function safeError_(error) {
    if (error && error.message === 'ACCESS_DENIED') {
      return { error: 'ACCESS_DENIED', message: 'Akses tidak diizinkan.' };
    }
    if (error && error.message === 'CONFIGURATION_ERROR') {
      return { error: 'CONFIGURATION_ERROR', message: 'Konfigurasi aplikasi atau header spreadsheet tidak sesuai. Hubungi pengelola.' };
    }
    if (error && error.message === 'FEATURE_NOT_AVAILABLE') {
      return { error: 'FEATURE_NOT_AVAILABLE', message: 'Fitur ini belum tersedia.' };
    }
    if (error && error.message === 'KEYWORD_REQUIRED') {
      return { error: 'KEYWORD_REQUIRED', message: 'Masukkan kata kunci pencarian.' };
    }
    if (error && error.message === 'VALIDATION_ERROR') {
      return { error: 'VALIDATION_ERROR', message: 'Parameter permintaan tidak valid.' };
    }
    if (error && error.message === 'DATA_CHANGED') {
      return { error: 'DATA_CHANGED', message: 'Data berubah sejak daftar dimuat. Muat ulang daftar.' };
    }
    if (error && error.message === 'NOT_FOUND') {
      return { error: 'NOT_FOUND', message: 'Surat tidak ditemukan. Muat ulang daftar.' };
    }
    if (error && error.message === 'SHEET_UNAVAILABLE') {
      return { error: 'SHEET_UNAVAILABLE', message: 'Spreadsheet tidak dapat dibaca oleh akun ini.' };
    }
    if (error && error.message === 'BUSY') {
      return { error: 'BUSY', message: 'Register sedang diproses pengguna lain. Coba lagi.' };
    }
    if (error && error.message === 'DUPLICATE_WARNING') {
      return { error: 'DUPLICATE_WARNING', message: 'Nomor surat serupa sudah tercatat.', candidates: error.candidates || [] };
    }
    if (error && error.message === 'NO_SAFE_ROW') {
      return { error: 'NO_SAFE_ROW', message: 'Tidak ditemukan baris aman untuk pencatatan baru. Hubungi pengelola.' };
    }
    if (error && error.message === 'DUPLICATE_AGENDA') {
      return { error: 'DUPLICATE_AGENDA', message: 'Nomor agenda tidak unik. Hubungi pengelola sebelum mengedit.' };
    }
    if (error && error.message === 'NO_CHANGES') {
      return { error: 'NO_CHANGES', message: 'Tidak ada perubahan untuk disimpan.' };
    }
    return { error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem.' };
  }

  return { safeError_ };
})();