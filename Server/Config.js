// Config: server Apps Script; loaded into the project global scope by clasp.
const SidilanConfig = (() => {
  const APP_SHEET_NAME = 'SuratMasuk';
  const HEADER_ROW_ = [
    'Nomor Agenda', 'Tanggal Di Terima', 'No. Surat', 'Tanggal Surat',
    'Asal Surat', 'Perihal', 'Uraian Berkas', 'Isi Disposisi',
    'Penujuan (Tujuan Dispo)', 'KET/Tanggal Paraf Dispo', 'Link Berkas',
    'Posisi Surat', 'Keterangan Tindak lanjut', 'Link Berkas TL dispo'
  ];
  const FIELD_NAMES_ = [
    'agenda', 'receivedDate', 'letterNumber', 'letterDate', 'sender', 'subject',
    'documentDescription', 'disposition', 'dispositionTargets', 'parafDateOrNote',
    'letterFileReference', 'letterPosition', 'followupNote', 'followupReference'
  ];

  function getRuntimeConfig_() {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const spreadsheetId = (properties.SPREADSHEET_ID || '').trim();
    const sheetName = (properties.SHEET_NAME || '').trim();
    const readEmails = parseEmailList_(properties.READ_EMAILS || '');
    const writeEmails = parseEmailList_(properties.WRITE_EMAILS || '');

    if (!spreadsheetId || sheetName !== APP_SHEET_NAME || !readEmails.length || !writeEmails.length) {
      throw new Error('CONFIGURATION_ERROR');
    }
    return { spreadsheetId, sheetName, readEmails, writeEmails };
  }

  function parseEmailList_(value) {
    const emails = value.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    if (emails.some(email => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email))) {
      throw new Error('CONFIGURATION_ERROR');
    }
    return [...new Set(emails)];
  }

  return { APP_SHEET_NAME, HEADER_ROW_, FIELD_NAMES_, getRuntimeConfig_, parseEmailList_ };
})();
