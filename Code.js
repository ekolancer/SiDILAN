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
    const rawKeyword = query.keyword === undefined ? '' : query.keyword;
    if (typeof rawKeyword !== 'string' || rawKeyword.length > 200) throw new Error('VALIDATION_ERROR');
    const keyword = rawKeyword.trim();

    const selectedPositions = query && query.positions;
    if (selectedPositions !== undefined && (!Array.isArray(selectedPositions) || selectedPositions.length > 100 || selectedPositions.some(value => typeof value !== 'string'))) {
      throw new Error('VALIDATION_ERROR');
    }
    const pageValue = query.page === undefined ? 1 : Number(query.page);
    if (!Number.isFinite(pageValue) || pageValue < 1 || !Number.isInteger(pageValue)) throw new Error('VALIDATION_ERROR');
    const pageSize = query.pageSize === undefined ? 10 : Number(query.pageSize);
    if (![10, 50, 100].includes(pageSize)) throw new Error('VALIDATION_ERROR');

    const register = readRegister_(config);
    const selected = selectedPositions === undefined ? null : new Set(selectedPositions);
    const normalizedKeyword = keyword.toLocaleLowerCase();
    const matches = register.records.filter(record => matchesRegisterFilter_(record, normalizedKeyword, selected));
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
  FIELD_NAMES_.forEach((field, index) => {
    const value = values[index];
    fields[field] = (field === 'receivedDate' || field === 'letterDate')
      ? receivedDateKey_(value, displays[index]) || displays[index] || ''
      : displays[index] || '';
  });
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
    receivedDateKey: receivedDateKey_(values[1], displays[1]),
    links
  };
}

function receivedDateKey_(value, display) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 2958465) {
    const date = new Date((value - 25569) * 86400000);
    return date.getUTCFullYear() >= 1000 ? date.toISOString().slice(0, 10) : '';
  }
  const text = String(display == null ? '' : display).trim();
  if (isValidIsoDate_(text)) return text;
  const match = text.match(/^(\d{1,2})[\s/.-]+([\p{L}]+|\d{1,2})[\s/.-]+(\d{4})$/u);
  if (!match) return '';
  const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const month = /^\d+$/.test(match[2]) ? Number(match[2]) : months.indexOf(match[2].toLocaleLowerCase('id')) + 1;
  const key = `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return isValidIsoDate_(key) ? key : '';
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
    const { config } = requireRole_('READ');
    const register = readRegister_(config);
    const records = register.records;
    const month = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
    const statusCounts = { selesai: 0, dalamProses: 0, lewatBatasWaktu: 0 };
    const units = new Map();
    const datedMonths = records.map(record => record.receivedDateKey?.slice(0, 7)).filter(Boolean).sort();
    const monthKeys = [];
    if (datedMonths.length) {
      const [firstYear, firstMonth] = datedMonths[0].split('-').map(Number);
      const [lastYear, lastMonth] = datedMonths[datedMonths.length - 1].split('-').map(Number);
      for (let year = firstYear, monthNumber = firstMonth; year < lastYear || (year === lastYear && monthNumber <= lastMonth); monthNumber++) {
        if (monthNumber > 12) { year++; monthNumber = 1; }
        monthKeys.push(`${year}-${String(monthNumber).padStart(2, '0')}`);
      }
    }
    const incoming = Object.fromEntries(monthKeys.map(key => [key, 0]));
    let unclassifiedStatus = 0;
    let receivedThisMonth = 0;
    let unreadableDates = 0;
    let withDisposition = 0;
    let withFollowup = 0;
    records.forEach(record => {
      const date = record.receivedDateKey;
      if (!date) unreadableDates++;
      if (date && date.slice(0, 7) === month) receivedThisMonth++;
      if (date && Object.hasOwn(incoming, date.slice(0, 7))) incoming[date.slice(0, 7)]++;
      if (!isPlaceholder_(record.disposition)) withDisposition++;
      if (!isPlaceholder_(record.followupNote)) withFollowup++;
      const status = String(record.followupNote || '').trim().toLocaleLowerCase('id');
      if (status === 'selesai') statusCounts.selesai++;
      else if (status === 'dalam proses') statusCounts.dalamProses++;
      else if (status === 'lewat batas waktu') statusCounts.lewatBatasWaktu++;
      else unclassifiedStatus++;
      const targets = new Set(String(record.dispositionTargets || '').split(/[,;]/).map(value => value.trim()).filter(value => !isPlaceholder_(value)));
      targets.forEach(target => units.set(target, (units.get(target) || 0) + 1));
    });
    const outgoing = readOutgoingTrend_(monthKeys);
    return {
      success: true, total: records.length, receivedThisMonth, unreadableDates,
      withDisposition, withFollowup, statusCounts, unclassifiedStatus,
      unitCounts: [...units].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id')),
      trend: monthKeys.map(key => ({ month: key, incoming: incoming[key], outgoing: outgoing.counts?.[key] ?? null })),
      outgoingUnavailable: outgoing.unavailable, outgoingUnreadableDates: outgoing.unreadableDates,
      latest: records.slice(-5).reverse(), warningCount: register.warningCount,
      loadedAt: Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss")
    };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function readOutgoingTrend_(monthKeys) {
  const properties = PropertiesService.getScriptProperties().getProperties();
  const spreadsheetId = String(properties.OUTGOING_SPREADSHEET_ID || '').trim();
  const sheetName = String(properties.OUTGOING_SHEET_NAME || '').trim();
  if (!spreadsheetId || !sheetName) return { unavailable: true, unreadableDates: 0 };
  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet || !sheet.getLastColumn()) return { unavailable: true, unreadableDates: 0 };
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const index = headers.findIndex(header => normalizeHeader_(header) === normalizeHeader_('Tanggal Surat'));
    if (index < 0) return { unavailable: true, unreadableDates: 0 };
    const counts = Object.fromEntries(monthKeys.map(key => [key, 0]));
    let unreadableDates = 0;
    const rowCount = sheet.getLastRow() - 1;
    if (rowCount > 0) {
      const range = sheet.getRange(2, index + 1, rowCount, 1);
      const values = range.getValues();
      const displays = range.getDisplayValues();
      values.forEach(([value], row) => {
        if (isPlaceholder_(value) && isPlaceholder_(displays[row][0])) return;
        const date = receivedDateKey_(value, displays[row][0]);
        if (!date) unreadableDates++;
        else if (Object.hasOwn(counts, date.slice(0, 7))) counts[date.slice(0, 7)]++;
      });
    }
    return { counts, unavailable: false, unreadableDates };
  } catch (error) {
    return { unavailable: true, unreadableDates: 0 };
  }
}

function getIncomingReport(query) {
  try {
    const { config } = requireRole_('READ');
    const filter = validateReportQuery_(query);
    const register = readRegister_(config);
    const matched = register.records.filter(record => matchesRegisterFilter_(record, filter.keyword, filter.positions) &&
      (!filter.sender || record.sender === filter.sender) &&
      (!filter.dispositionTarget || String(record.dispositionTargets || '').split(/[,;]/).some(target => target.trim() === filter.dispositionTarget)));
    const unreadableDates = filter.fromDate || filter.toDate
      ? matched.filter(record => !record.receivedDateKey).length : 0;
    const records = matched.filter(record => {
      if (!filter.fromDate && !filter.toDate) return true;
      if (!record.receivedDateKey) return false;
      return (!filter.fromDate || record.receivedDateKey >= filter.fromDate) &&
        (!filter.toDate || record.receivedDateKey <= filter.toDate);
    });
    return {
      success: true, records, total: records.length, unreadableDates,
      senders: [...new Set(register.records.map(record => record.sender).filter(value => !isPlaceholder_(value)))].sort((a, b) => a.localeCompare(b, 'id')),
      targets: [...new Set(register.records.flatMap(record => String(record.dispositionTargets || '').split(/[,;]/).map(value => value.trim()).filter(value => !isPlaceholder_(value))))].sort((a, b) => a.localeCompare(b, 'id')),
      warningCount: register.warningCount,
      generatedAt: Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss"),
      filters: { keyword: filter.rawKeyword, positions: filter.positions ? [...filter.positions] : null,
        sender: filter.sender, dispositionTarget: filter.dispositionTarget, fromDate: filter.fromDate, toDate: filter.toDate }
    };
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function matchesRegisterFilter_(record, keyword, positions) {
  if (positions && !positions.has(record.letterPosition)) return false;
  return !keyword || [record.agenda, record.letterNumber, record.sender, record.subject, record.documentDescription]
    .some(value => String(value || '').toLocaleLowerCase().includes(keyword));
}

function validateReportQuery_(query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw new Error('VALIDATION_ERROR');
  const rawKeyword = query.keyword === undefined ? '' : query.keyword;
  if (typeof rawKeyword !== 'string' || rawKeyword.length > 200) throw new Error('VALIDATION_ERROR');
  const fromDate = query.fromDate === undefined ? '' : query.fromDate;
  const toDate = query.toDate === undefined ? '' : query.toDate;
  if (typeof fromDate !== 'string' || typeof toDate !== 'string' ||
      (fromDate && !isValidIsoDate_(fromDate)) || (toDate && !isValidIsoDate_(toDate)) ||
      (fromDate && toDate && fromDate > toDate)) throw new Error('VALIDATION_ERROR');
  const positions = query.positions;
  if (positions !== undefined && (!Array.isArray(positions) || positions.length > 100 ||
      positions.some(value => typeof value !== 'string'))) throw new Error('VALIDATION_ERROR');
  const sender = query.sender === undefined ? '' : query.sender;
  const dispositionTarget = query.dispositionTarget === undefined ? '' : query.dispositionTarget;
  if (typeof sender !== 'string' || sender.length > 5000 ||
      typeof dispositionTarget !== 'string' || dispositionTarget.length > 5000) throw new Error('VALIDATION_ERROR');
  return { rawKeyword: rawKeyword.trim(), keyword: rawKeyword.trim().toLocaleLowerCase(),
    positions: positions === undefined ? null : new Set(positions), sender: sender.trim(), dispositionTarget: dispositionTarget.trim(), fromDate, toDate };
}

function updateSuratMasuk(payload) {
  try {
    const { config } = requireRole_('WRITE');
    validateUpdatePayload_(payload);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('BUSY');
    try {
      const sheet = getValidatedSheet_(config);
      const row = Number(payload.rowHint);
      if (row > sheet.getLastRow()) throw new Error('NOT_FOUND');
      const current = readRecordAtRow_(sheet, row);
      if (!current) throw new Error('NOT_FOUND');
      if (current.agenda !== payload.agenda) throw new Error('DATA_CHANGED');
      ensureUniqueAgenda_(sheet, payload.agenda, row);
      if (current.expectedHash !== payload.expectedHash) throw new Error('DATA_CHANGED');

      if (payload.updateDescription !== undefined && typeof payload.updateDescription !== 'boolean') throw new Error('VALIDATION_ERROR');
      const changes = { ...payload.changes };
      if (payload.updateDescription === true) {
        const nextIdentity = { ...current, ...changes };
        const letterDate = nextIdentity.letterDate && isValidIsoDate_(nextIdentity.letterDate)
          ? formatDateId_(nextIdentity.letterDate)
          : nextIdentity.letterDate || 'belum tersedia';
        changes.documentDescription = `Surat Dari ${nextIdentity.sender} Nomor ${nextIdentity.letterNumber} Tanggal ${letterDate} Tentang ${nextIdentity.subject}.`;
      }
      const changedFields = Object.keys(changes).filter(field => String(changes[field]) !== String(current[field]));
      if (!changedFields.length) throw new Error('NO_CHANGES');
      validateChangedFields_(changes, current);
      const positions = collectPositions_(sheet, readRegister_(config).records);
      if (Object.hasOwn(changes, 'letterPosition') && !positions.includes(changes.letterPosition || '')) throw new Error('VALIDATION_ERROR');

      const updatedValues = changedFields.map(field => ({
        field,
        column: FIELD_NAMES_.indexOf(field),
        value: changes[field]
      }));
      const requests = updatedValues.map(({ field, column, value }) => {
        const cellValue = (field === 'receivedDate' || field === 'letterDate') && value
          ? { numberValue: parseIsoDate_(value) }
          : value === '' ? {} : { stringValue: String(value) };
        const cellData = { userEnteredValue: cellValue };
        const fields = ['userEnteredValue'];
        if ((field === 'receivedDate' || field === 'letterDate') && value) {
          cellData.userEnteredFormat = { numberFormat: { type: 'DATE', pattern: 'dd mmmm yyyy' } };
          fields.push('userEnteredFormat.numberFormat');
        }
        if (field === 'letterFileReference' || field === 'followupReference') {
          cellData.textFormatRuns = [];
          fields.push('textFormatRuns', 'userEnteredFormat.textFormat.link');
        }
        return { updateCells: {
          range: { sheetId: sheet.getSheetId(), startRowIndex: row - 1, endRowIndex: row, startColumnIndex: column, endColumnIndex: column + 1 },
          rows: [{ values: [cellData] }],
          fields: fields.join(',')
        } };
      });
      Sheets.Spreadsheets.batchUpdate({ requests }, config.spreadsheetId);
      SpreadsheetApp.flush();
      const updated = readRecordAtRow_(sheet, row);
      return { success: true, record: updated };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function validateUpdatePayload_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      !Number.isInteger(Number(payload.rowHint)) || Number(payload.rowHint) < 2 ||
      typeof payload.agenda !== 'string' || typeof payload.expectedHash !== 'string' ||
      !payload.changes || typeof payload.changes !== 'object' || Array.isArray(payload.changes)) {
    throw new Error('VALIDATION_ERROR');
  }
  const allowed = FIELD_NAMES_.filter(field => field !== 'agenda');
  const fields = Object.keys(payload.changes);
  if (!fields.length || fields.some(field => !allowed.includes(field)) ||
      fields.some(field => typeof payload.changes[field] !== 'string' || payload.changes[field].length > 5000)) {
    throw new Error('VALIDATION_ERROR');
  }
}

function validateChangedFields_(changes, current) {
  for (const [field, value] of Object.entries(changes)) {
    if (field === 'receivedDate' || field === 'letterDate') {
      if (value && !isValidIsoDate_(value)) throw new Error('VALIDATION_ERROR');
      if (field === 'receivedDate' && !value) throw new Error('VALIDATION_ERROR');
    }
    if (field === 'letterFileReference' && value && !isHttpsUrl_(value.trim())) throw new Error('VALIDATION_ERROR');
    if (field === 'followupReference' && value && /^https?:/i.test(value.trim()) && !isHttpsUrl_(value.trim())) throw new Error('VALIDATION_ERROR');
    if (['letterNumber', 'sender', 'subject'].includes(field) && (!value.trim() || value.length > 500)) throw new Error('VALIDATION_ERROR');
    if (field === 'documentDescription' && value.length > 5000) throw new Error('VALIDATION_ERROR');
  }
  if (Object.keys(changes).some(field => current[field] == null)) throw new Error('VALIDATION_ERROR');
}

function ensureUniqueAgenda_(sheet, agenda, row) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('NOT_FOUND');
  const matches = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
    .filter(([value]) => String(value).trim() === agenda).length;
  if (matches !== 1 || String(sheet.getRange(row, 1).getDisplayValue()).trim() !== agenda) throw new Error('DUPLICATE_AGENDA');
}

function createSuratMasuk(payload) {
  try {
    const { config } = requireRole_('WRITE');
    validateCreatePayload_(payload);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('BUSY');
    try {
      const register = readRegister_(config);
      if (!collectPositions_(register.sheet, register.records).includes(payload.letterPosition || '')) throw new Error('VALIDATION_ERROR');
      const duplicateCandidates = findDuplicateCandidates_(register.records, payload);
      if (duplicateCandidates.length && payload.confirmDuplicate !== true) {
        const warning = new Error('DUPLICATE_WARNING');
        warning.candidates = duplicateCandidates;
        throw warning;
      }
      const agenda = nextAgenda_(register.sheet, register.records);
      const templateRow = findSafeTemplateRow_(register.sheet, register.records);
      const row = templateRow || safeInsertRow_(register.sheet, register.records);
      if (!row) throw new Error('NO_SAFE_ROW');
      const values = buildNewRow_(payload, agenda);
      const sheetId = register.sheet.getSheetId();
      const requests = [];
      if (!templateRow) requests.push({ insertDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row },
        inheritFromBefore: true
      } });
      requests.push({ updateCells: {
        range: { sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 0, endColumnIndex: FIELD_NAMES_.length },
        rows: [{ values: values.map((value, index) => ({
          userEnteredValue: index === 1 || (index === 3 && value !== '')
            ? { numberValue: value }
            : value === '' ? {} : { stringValue: String(value) },
          ...(index === 1 || index === 3 && value !== '' ? { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd mmmm yyyy' } } } : {})
        })) }],
        fields: 'userEnteredValue,userEnteredFormat.numberFormat'
      } });
      Sheets.Spreadsheets.batchUpdate({ requests }, config.spreadsheetId);
      SpreadsheetApp.flush();
      return { success: true, agenda, rowHint: row };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { success: false, ...safeError_(error) };
  }
}

function validateCreatePayload_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('VALIDATION_ERROR');
  const textFields = ['letterNumber', 'sender', 'subject', 'letterDate', 'disposition', 'dispositionTargets', 'parafDateOrNote', 'letterFileReference', 'letterPosition', 'followupNote', 'followupReference'];
  if (textFields.some(field => payload[field] !== undefined && typeof payload[field] !== 'string')) throw new Error('VALIDATION_ERROR');
  if (typeof payload.receivedDate !== 'string' || !isValidIsoDate_(payload.receivedDate)) throw new Error('VALIDATION_ERROR');
  for (const field of ['letterNumber', 'sender', 'subject']) {
    const value = typeof payload[field] === 'string' ? payload[field].trim() : '';
    if (!value || value.length > 500) throw new Error('VALIDATION_ERROR');
  }
  if (['letterDate'].some(field => payload[field] && !isValidIsoDate_(payload[field]))) throw new Error('VALIDATION_ERROR');
  for (const field of ['disposition', 'dispositionTargets', 'parafDateOrNote', 'letterPosition', 'followupNote', 'followupReference']) {
    if ((payload[field] || '').length > 5000) throw new Error('VALIDATION_ERROR');
  }
  if (payload.letterFileReference && !isHttpsUrl_(payload.letterFileReference.trim())) throw new Error('VALIDATION_ERROR');
  if (payload.followupReference && /^https?:/i.test(payload.followupReference.trim()) && !isHttpsUrl_(payload.followupReference.trim())) throw new Error('VALIDATION_ERROR');
  if (payload.confirmDuplicate !== undefined && typeof payload.confirmDuplicate !== 'boolean') throw new Error('VALIDATION_ERROR');
}

function isValidIsoDate_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function findDuplicateCandidates_(records, payload) {
  const targetNumber = payload.letterNumber.trim().toLocaleLowerCase();
  const targetSender = payload.sender.trim().toLocaleLowerCase();
  return records.filter(record => {
    const number = record.letterNumber.trim().toLocaleLowerCase();
    return number && (number === targetNumber || number.includes(targetNumber) || targetNumber.includes(number)) &&
      record.sender.trim().toLocaleLowerCase() === targetSender;
  }).slice(0, 10).map(record => ({ agenda: record.agenda, letterNumber: record.letterNumber, sender: record.sender, subject: record.subject }));
}

function nextAgenda_(sheet, records) {
  const numericAgendas = records.map(record => /^\d+$/.test(record.agenda.trim()) ? Number(record.agenda.trim()) : 0);
  const occupied = new Set(records.map(record => String(record.agenda).trim()));
  let next = Math.max(0, ...numericAgendas) + 1;
  while (occupied.has(String(next))) next++;
  return String(next);
}

function findSafeTemplateRow_(sheet, records) {
  const lastRecordRow = records.reduce((max, record) => Math.max(max, record.rowHint), 1);
  const lastRow = sheet.getLastRow();
  if (lastRecordRow >= lastRow) return null;
  const width = Math.max(FIELD_NAMES_.length, sheet.getLastColumn());
  const rowCount = lastRow - lastRecordRow;
  const scan = sheet.getRange(lastRecordRow + 1, 1, rowCount, width);
  const values = scan.getValues();
  const formulas = scan.getFormulas();
  const notes = scan.getNotes();
  const mergedRanges = sheet.getRange(1, 1, lastRow, width).getMergedRanges();
  const occupiedAgenda = new Set(records.map(record => String(record.agenda).trim()));
  for (let index = 0; index < rowCount; index++) {
    const row = lastRecordRow + index + 1;
    if (mergedRanges.some(range => row >= range.getRow() && row <= range.getLastRow())) continue;
    const cells = values[index];
    const agenda = String(cells[0] == null ? '' : cells[0]).trim();
    if (!/^\d+$/.test(agenda) || !cells[6] || typeof cells[6] !== 'string' || occupiedAgenda.has(agenda)) continue;
    const hasUnsafeContent = cells.some((value, column) => value !== '' && column !== 0 && column !== 6) ||
      formulas[index].some(Boolean) || notes[index].some(Boolean);
    if (!hasUnsafeContent) return row;
  }
  return null;
}

function safeInsertRow_(sheet, records) {
  const lastRecordRow = records.reduce((max, record) => Math.max(max, record.rowHint), 1);
  if (lastRecordRow < 2) return 2;
  const width = Math.max(FIELD_NAMES_.length, sheet.getLastColumn());
  const mergedRanges = sheet.getRange(1, 1, sheet.getLastRow(), width).getMergedRanges();
  const insertAfter = Math.max(...records.map(record => record.rowHint));
  if (mergedRanges.some(range => insertAfter >= range.getRow() && insertAfter <= range.getLastRow())) return null;
  return insertAfter + 1;
}

function buildNewRow_(payload, agenda) {
  const receivedDate = parseIsoDate_(payload.receivedDate);
  const letterDate = payload.letterDate ? parseIsoDate_(payload.letterDate) : '';
  const descriptionDate = payload.letterDate ? formatDateId_(payload.letterDate) : 'belum tersedia';
  const description = `Surat Dari ${payload.sender.trim()} Nomor ${payload.letterNumber.trim()} Tanggal ${descriptionDate} Tentang ${payload.subject.trim()}.`;
  return [agenda, receivedDate, payload.letterNumber.trim(), letterDate, payload.sender.trim(), payload.subject.trim(), description,
    payload.disposition || '', payload.dispositionTargets || '', payload.parafDateOrNote || '', payload.letterFileReference || '',
    payload.letterPosition || '', payload.followupNote || '', payload.followupReference || ''];
}

function parseIsoDate_(value) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000 + 25569;
}

function formatDateId_(value) {
  const [year, month, day] = value.split('-').map(Number);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${day} ${months[month - 1]} ${year}`;
}
