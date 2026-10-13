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

function requireRole_(requiredRole) {
  if (requiredRole !== 'READ' && requiredRole !== 'WRITE') throw new Error('ACCESS_DENIED');
  const config = getRuntimeConfig_();
  const email = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) throw new Error('ACCESS_DENIED');

  const isWriter = config.writeEmails.includes(email);
  const isReader = config.readEmails.includes(email) || isWriter;
  if (!isReader || (requiredRole === 'WRITE' && !isWriter)) throw new Error('ACCESS_DENIED');
  return { config, email, role: isWriter ? 'WRITE' : 'READ' };
}

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
  return { error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem.' };
}

function getAppStatus() {
  try {
    const { email, role } = requireRole_('READ');
    return { success: true, email, role };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function getInitialData() {
  try {
    const { config, email, role } = requireRole_('READ');
    const register = readRegister_(config);
    return { success: true, email, role, positions: collectPositions_(register.sheet, register.records), warningCount: register.warningCount };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function getSuratMasuk(query) {
  try {
    const { config } = requireRole_('READ');
    if (!query || typeof query !== 'object' || Array.isArray(query)) throw new Error('VALIDATION_ERROR');
    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : '';
    if (!keyword) throw new Error('KEYWORD_REQUIRED');
    if (keyword.length > 200) throw new Error('VALIDATION_ERROR');

    const selectedPositions = query && query.positions;
    if (selectedPositions !== undefined && (!Array.isArray(selectedPositions) || selectedPositions.length > 100 || selectedPositions.some(value => typeof value !== 'string'))) {
      throw new Error('VALIDATION_ERROR');
    }
    const pageValue = query.page === undefined ? 1 : Number(query.page);
    if (!Number.isFinite(pageValue) || pageValue < 1 || !Number.isInteger(pageValue)) throw new Error('VALIDATION_ERROR');

    const register = readRegister_(config);
    const selected = selectedPositions === undefined ? null : new Set(selectedPositions);
    const normalizedKeyword = keyword.toLocaleLowerCase();
    const matches = register.records.filter(record => {
      if (selected && !selected.has(record.letterPosition)) return false;
      return [record.agenda, record.letterNumber, record.sender, record.subject, record.documentDescription]
        .some(value => value.toLocaleLowerCase().includes(normalizedKeyword));
    });
    const pageSize = 50;
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    const page = Math.min(pageValue, pageCount);
    return {
      success: true,
      records: matches.slice((page - 1) * pageSize, page * pageSize),
      positions: collectPositions_(register.sheet, register.records),
      total: matches.length,
      page,
      pageSize,
      warningCount: register.warningCount
    };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function getSuratDetail(reference) {
  try {
    const { config } = requireRole_('READ');
    if (!reference || typeof reference !== 'object') throw new Error('VALIDATION_ERROR');
    const rowHint = Number(reference.rowHint);
    if (!Number.isInteger(rowHint) || rowHint < 2 || typeof reference.agenda !== 'string' || typeof reference.expectedHash !== 'string') {
      throw new Error('VALIDATION_ERROR');
    }

    const sheet = getValidatedSheet_(config);
    if (rowHint > sheet.getLastRow()) throw new Error('NOT_FOUND');
    const record = readRecordAtRow_(sheet, rowHint);
    if (!record || record.agenda !== reference.agenda) throw new Error('DATA_CHANGED');
    if (record.expectedHash !== reference.expectedHash) throw new Error('DATA_CHANGED');
    return { success: true, record };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function readRegister_(config) {
  const sheet = getValidatedSheet_(config);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { sheet, records: [], warningCount: 0 };

  const values = sheet.getRange(2, 1, lastRow - 1, FIELD_NAMES_.length).getValues();
  const displays = sheet.getRange(2, 1, lastRow - 1, FIELD_NAMES_.length).getDisplayValues();
  const formulas = sheet.getRange(2, 1, lastRow - 1, FIELD_NAMES_.length).getFormulas();
  const richTextValues = sheet.getRange(2, 1, lastRow - 1, FIELD_NAMES_.length).getRichTextValues();
  const records = [];
  let warningCount = 0;

  values.forEach((row, index) => {
    try {
      if (!row.slice(1, 6).some(value => !isPlaceholder_(value))) return;
      records.push(buildRecord_(index + 2, row, displays[index], formulas[index], richTextValues[index]));
    } catch (error) {
      warningCount++;
    }
  });
  return { sheet, records, warningCount };
}

function getValidatedSheet_(config) {
  let spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  } catch (error) {
    throw new Error('SHEET_UNAVAILABLE');
  }
  const sheet = spreadsheet.getSheetByName(config.sheetName);
  if (!sheet) throw new Error('CONFIGURATION_ERROR');
  const headers = sheet.getRange(1, 1, 1, HEADER_ROW_.length).getDisplayValues()[0];
  if (headers.some((header, index) => normalizeHeader_(header) !== normalizeHeader_(HEADER_ROW_[index]))) {
    throw new Error('CONFIGURATION_ERROR');
  }
  return sheet;
}

function buildRecord_(rowHint, values, displays, formulas, richTextValues) {
  const fields = {};
  FIELD_NAMES_.forEach((field, index) => { fields[field] = displays[index] || ''; });
  const links = {
    letterFileReference: extractLinks_(richTextValues[10], displays[10], formulas[10]),
    followupReference: extractLinks_(richTextValues[13], displays[13], formulas[13])
  };
  const snapshotValues = values.map(value => value instanceof Date
    ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss")
    : value);
  const snapshot = JSON.stringify({ values: snapshotValues, formulas, links });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, snapshot, Utilities.Charset.UTF_8);
  return {
    ...fields,
    rowHint,
    expectedHash: Utilities.base64EncodeWebSafe(digest),
    links
  };
}

function readRecordAtRow_(sheet, rowNumber) {
  const range = sheet.getRange(rowNumber, 1, 1, FIELD_NAMES_.length);
  const values = range.getValues()[0];
  if (!values.slice(1, 6).some(value => !isPlaceholder_(value))) return null;
  return buildRecord_(rowNumber, values, range.getDisplayValues()[0], range.getFormulas()[0], range.getRichTextValues()[0]);
}

function collectPositions_(sheet, records) {
  const positions = [''];
  const add = value => {
    const position = String(value == null ? '' : value);
    if (!positions.includes(position)) positions.push(position);
  };
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const range = sheet.getRange(2, 12, lastRow - 1, 1);
    range.getDataValidations().forEach(([rule]) => {
      if (rule && rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
        const values = rule.getCriteriaValues()[0] || [];
        values.forEach(add);
      }
    });
  }
  records.forEach(record => add(record.letterPosition));
  return positions;
}

function extractLinks_(richText, displayedValue, formula) {
  if (richText) {
    const wholeLink = richText.getLinkUrl();
    if (wholeLink && isHttpsUrl_(wholeLink)) return [{ label: displayedValue, url: wholeLink }];
    const runLinks = richText.getRuns().reduce((links, run) => {
      const url = run.getLinkUrl();
      if (url && isHttpsUrl_(url)) links.push({ label: run.getText(), url });
      return links;
    }, []);
    if (runLinks.length) return runLinks;
  }
  const formulaLink = typeof formula === 'string' && formula.match(/^=HYPERLINK\(\s*"(https:\/\/[^"\s<>]+)"\s*,\s*"([^"]*)"\s*\)$/i);
  if (formulaLink) return [{ label: formulaLink[2] || displayedValue, url: formulaLink[1] }];
  return isHttpsUrl_(displayedValue) ? [{ label: displayedValue, url: displayedValue }] : [];
}

function isHttpsUrl_(value) {
  return typeof value === 'string' && /^https:\/\/[^\s<>]+$/i.test(value);
}

function isPlaceholder_(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string') return false;
  return ['', '-', '–', '—', 'belum diisi', 'n/a', 'na'].includes(value.trim().toLocaleLowerCase());
}

function normalizeHeader_(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SiDILAN - Monitoring Surat')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// FUNGSI DATA SURAT MASUK
// ==========================================
function saveSuratMasuk() {
  try {
    requireRole_('WRITE');
    return { success: false, ...safeError_(new Error('FEATURE_NOT_AVAILABLE')) };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function getDashboardStats() {
  try {
    requireRole_('READ');
    return { success: false, ...safeError_(new Error('FEATURE_NOT_AVAILABLE')) };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}
