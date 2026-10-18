const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { loadServer } = require('./helpers/load-server.cjs');
const headers = [
  'Nomor Agenda', 'Tanggal Di Terima', 'No. Surat', 'Tanggal Surat',
  'Asal Surat', 'Perihal', 'Uraian Berkas', 'Isi Disposisi',
  'Penujuan (Tujuan Dispo)', 'KET/Tanggal Paraf Dispo', 'Link Berkas',
  'Posisi Surat', 'Keterangan Tindak lanjut', 'Link Berkas TL dispo'
];

function environment({ email = 'writer@example.org', configured = true } = {}) {
  const rows = [headers.slice(), [
    '1', '2026-10-01', '123/ABC', '2026-09-30', 'Sekretariat', 'Undangan',
    'Surat undangan', 'Ditindaklanjuti', 'Bagian Umum', '', '', 'Arsip', '', ''
  ]];
  const writeRequests = [];
  let sheet;
  const getCell = (r, c) => (rows[r] || [])[c] ?? '';
  const spreadsheet = {
    getSheetByName(name) { return name === 'SuratMasuk' ? sheet : null; }
  };
  sheet = {
    getLastRow() { return rows.length; },
    getLastColumn() { return 14; },
    getSheetId() { return 123; },
    getRange(row, col, height = 1, width = 1) {
      const matrix = () => Array.from({ length: height }, (_, r) =>
        Array.from({ length: width }, (_, c) => getCell(row - 1 + r, col - 1 + c)));
      return {
        getValues: matrix,
        getDisplayValues: () => matrix().map(line => line.map(value => String(value))),
        getDisplayValue: () => String(getCell(row - 1, col - 1)),
        getFormulas: () => matrix().map(line => line.map(() => '')),
        getNotes: () => matrix().map(line => line.map(() => '')),
        getRichTextValues: () => matrix().map(line => line.map(() => null)),
        getDataValidations: () => matrix().map(line => line.map(() => null)),
        getMergedRanges: () => []
      };
    }
  };
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({
      SPREADSHEET_ID: configured ? 'fixture-sheet' : '', SHEET_NAME: 'SuratMasuk',
      READ_EMAILS: 'reader@example.org', WRITE_EMAILS: 'writer@example.org'
    }) }) },
    Session: { getActiveUser: () => ({ getEmail: () => email }), getScriptTimeZone: () => 'Asia/Jakarta' },
    SpreadsheetApp: {
      openById: id => { if (id !== 'fixture-sheet') throw Error('missing'); return spreadsheet; },
      DataValidationCriteria: { VALUE_IN_LIST: 'list' }, flush: () => {}
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      formatDate: (date, zone, format) => format === 'yyyy-MM'
        ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 19),
      computeDigest: (algo, value) => [...crypto.createHash(algo).update(value).digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url')
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    Sheets: { Spreadsheets: { batchUpdate({ requests }) {
      writeRequests.push(JSON.parse(JSON.stringify(requests)));
      for (const request of requests) {
        if (request.insertDimension) rows.splice(request.insertDimension.range.startIndex, 0, Array(14).fill(''));
        if (request.updateCells) {
          const { range, rows: updated } = request.updateCells;
          updated[0].values.forEach((value, col) => {
            const cell = value.userEnteredValue;
            rows[range.startRowIndex][range.startColumnIndex + col] = cell.numberValue ?? cell.stringValue ?? '';
          });
        }
      }
    } } },
    HtmlService: { createHtmlOutputFromFile: filename => ({
      file: filename, setTitle(title) { this.title = title; return this; },
      addMetaTag(name, value) { this[name] = value; return this; }
    }) }
  };
  vm.createContext(context);
  return { context, rows, writeRequests };
}

function load(modular, options) {
  const instance = environment(options);
  loadServer(instance.context, { original: !modular, reverse: modular });
  return instance;
}

function invoke(instance, name, ...args) {
  return JSON.parse(JSON.stringify(instance.context[name](...args)));
}

function sameAsOriginal(name, options, ...args) {
  const original = invoke(load(false, options), name, ...args);
  const modular = invoke(load(true, options), name, ...args);
  if (name === 'getDashboardStats') { delete original.loadedAt; delete modular.loadedAt; }
  if (name === 'getIncomingReport') { delete original.generatedAt; delete modular.generatedAt; }
  assert.deepEqual(modular, original, `public result changed: ${name}`);
  return modular;
}

assert.equal(sameAsOriginal('getAppStatus').role, 'WRITE');
assert.equal(sameAsOriginal('getAppStatus', { email: 'stranger@example.org' }).error, 'ACCESS_DENIED');
assert.equal(sameAsOriginal('getAppStatus', { configured: false }).error, 'CONFIGURATION_ERROR');
assert.equal(sameAsOriginal('getInitialData').success, true);
assert.equal(sameAsOriginal('getSuratMasuk', {}, { page: 1, pageSize: 10 }).records.length, 1);
assert.equal(sameAsOriginal('getSuratMasuk', {}, { page: 0 }).error, 'VALIDATION_ERROR');
assert.equal(sameAsOriginal('getSuratMasuk', { email: 'reader@example.org' }, { keyword: 'Undangan' }).total, 1);
assert.equal(sameAsOriginal('getIncomingReport', {}, { fromDate: '2026-10-01' }).total, 1);
assert.equal(sameAsOriginal('getIncomingReport', {}, { fromDate: '2026-11-01' }).total, 0);
assert.equal(sameAsOriginal('getDashboardStats').total, 1);
assert.equal(sameAsOriginal('saveSuratMasuk').error, 'FEATURE_NOT_AVAILABLE');

const listed = sameAsOriginal('getSuratMasuk', {}, { keyword: '' }).records[0];
assert.equal(sameAsOriginal('getSuratDetail', {}, {
  agenda: listed.agenda, rowHint: listed.rowHint, expectedHash: listed.expectedHash
}).record.subject, 'Undangan');
assert.equal(sameAsOriginal('updateSuratMasuk', {}, {
  agenda: listed.agenda, rowHint: listed.rowHint, expectedHash: 'stale', changes: { subject: 'Baru' }
}).error, 'DATA_CHANGED');
assert.equal(sameAsOriginal('createSuratMasuk', {}, {
  receivedDate: '2026-10-02', letterNumber: '123/ABC', sender: 'Sekretariat', subject: 'Lanjutan', letterPosition: 'Arsip'
}).error, 'DUPLICATE_WARNING');

const writes = [];
for (const modular of [false, true]) {
  const instance = load(modular);
  assert.equal(invoke(instance, 'updateSuratMasuk', {
    agenda: listed.agenda, rowHint: listed.rowHint, expectedHash: listed.expectedHash,
    changes: { subject: 'Surat diperbarui' }
  }).record.subject, 'Surat diperbarui');
  assert.equal(invoke(instance, 'createSuratMasuk', {
    receivedDate: '2026-10-02', letterNumber: '999/ABC', sender: 'Sekretariat',
    subject: 'Surat baru', letterPosition: 'Arsip'
  }).agenda, '2');
  writes.push(instance.writeRequests);
}
assert.deepEqual(writes[1], writes[0], 'Spreadsheet write requests changed');

assert.deepEqual(invoke(load(true), 'doGet'), invoke(load(false), 'doGet'));
console.log('Contract parity: read, filters, report, permissions, detail, create, update, and doGet passed.');
