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
console.log('read contract checks passed');
