const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'Code.js'), 'utf8');
const context = { console, Date, JSON, Set, Math, Number, String, Array, Object, RegExp };
vm.createContext(context);
vm.runInContext(source, context);

const expectedHeader = vm.runInContext('HEADER_ROW_', context);
const header = [' Nomor\nAgenda ', 'Tanggal Di Terima', 'No. Surat', 'Tanggal Surat', 'Asal Surat', 'Perihal', ...expectedHeader.slice(6)];
assert.equal(header.some((value, index) => context.normalizeHeader_(value) !== context.normalizeHeader_(expectedHeader[index])), false);
assert.equal(['', '-', 'Belum diisi', 'n/a'].every(context.isPlaceholder_), true);
assert.equal(context.isPlaceholder_('0'), false);
assert.deepEqual(JSON.parse(JSON.stringify(context.extractLinks_(null, 'Dokumen', '=HYPERLINK("https://example.com/file","Dokumen")'))), [{ label: 'Dokumen', url: 'https://example.com/file' }]);
assert.deepEqual(JSON.parse(JSON.stringify(context.extractLinks_(null, 'javascript:alert(1)', ''))), []);
assert.deepEqual(JSON.parse(JSON.stringify(context.extractLinks_(null, 'https://example.com/file', ''))), [{ label: 'https://example.com/file', url: 'https://example.com/file' }]);

const unavailable = { openById() { throw new Error('permission details must not escape'); } };
context.SpreadsheetApp = unavailable;
context.PropertiesService = { getScriptProperties: () => ({ getProperties: () => ({ SPREADSHEET_ID: 'test-id', SHEET_NAME: 'SuratMasuk', READ_EMAILS: 'reader@example.com', WRITE_EMAILS: 'writer@example.com' }) }) };
context.Session = { getActiveUser: () => ({ getEmail: () => 'reader@example.com' }) };
const result = context.getSuratMasuk({ keyword: 'test' });
assert.deepEqual(JSON.parse(JSON.stringify(result)), { success: false, error: 'SHEET_UNAVAILABLE', message: 'Spreadsheet tidak dapat dibaca oleh akun ini.' });
assert.deepEqual(JSON.parse(JSON.stringify(context.getSuratMasuk({}))), { success: false, error: 'SHEET_UNAVAILABLE', message: 'Spreadsheet tidak dapat dibaca oleh akun ini.' });
assert.equal(context.getSuratMasuk({ keyword: 'x', pageSize: 20 }).error, 'VALIDATION_ERROR');

const validCreate = {
  receivedDate: '2026-10-14', letterNumber: '001/ABC', sender: 'Unit Uji', subject: 'Surat uji',
  letterDate: '2026-10-13', disposition: '', dispositionTargets: '', parafDateOrNote: '',
  letterFileReference: '', letterPosition: '', followupNote: '', followupReference: ''
};
context.validateCreatePayload_(validCreate);
assert.throws(() => context.validateCreatePayload_({ ...validCreate, receivedDate: '2026-02-30' }), /VALIDATION_ERROR/);
assert.throws(() => context.validateCreatePayload_({ ...validCreate, letterFileReference: 'javascript:alert(1)' }), /VALIDATION_ERROR/);
assert.throws(() => context.validateCreatePayload_({ ...validCreate, subject: '   ' }), /VALIDATION_ERROR/);
const newRow = context.buildNewRow_(validCreate, '355');
assert.equal(newRow[0], '355');
assert.equal(newRow[1], 46309);
assert.equal(newRow[2], '001/ABC');
assert.equal(newRow[3], 46308);
assert.equal(newRow[6], 'Surat Dari Unit Uji Nomor 001/ABC Tanggal 13 Oktober 2026 Tentang Surat uji.');
assert.equal(context.receivedDateKey_(newRow[1], ''), '2026-10-14');
assert.equal(context.receivedDateKey_(newRow[3], ''), '2026-10-13');
assert.equal(context.findDuplicateCandidates_([{ agenda: '354.a', letterNumber: '001/ABC', sender: 'Unit Uji', subject: 'Surat uji' }], validCreate).length, 1);

const validUpdate = { rowHint: 12, agenda: '354.a', expectedHash: 'snapshot-hash', changes: { followupNote: 'Tindak lanjut baru' } };
context.validateUpdatePayload_(validUpdate);
assert.throws(() => context.validateUpdatePayload_({ ...validUpdate, changes: { agenda: '1' } }), /VALIDATION_ERROR/);
assert.throws(() => context.validateChangedFields_({ sender: ' ' }, { sender: 'Asal lama' }), /VALIDATION_ERROR/);
assert.throws(() => context.validateChangedFields_({ letterFileReference: 'javascript:alert(1)' }, { letterFileReference: '' }), /VALIDATION_ERROR/);
const viewerUpdate = context.updateSuratMasuk(validUpdate);
assert.equal(JSON.parse(JSON.stringify(viewerUpdate)).error, 'ACCESS_DENIED');
console.log('read, create and edit contract checks passed');
