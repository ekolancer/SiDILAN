const assert = require('node:assert/strict');
const { loadServer } = require('./helpers/load-server.cjs');

const context = loadServer({
  Date, JSON, Set, Map, Math, Number, String, Array, Object, RegExp,
  Utilities: { formatDate: () => '2026-10-01' },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }
});
const record = {
  agenda: '1', rowHint: 2, expectedHash: 'fresh', receivedDateKey: '2026-10-01',
  receivedDate: '2026-10-01', letterDate: '2026-10-01', letterNumber: '001',
  sender: 'Unit', subject: 'Contoh', disposition: '', dispositionTargets: '',
  letterPosition: 'Arsip', followupNote: ''
};
const sheet = { getLastRow: () => 2 };
let reads = 0;
let positions = 0;
context.SidilanAuth.requireRole_ = () => ({ config: {}, email: 'reader@example.org', role: 'WRITE' });
context.SidilanRepository.readRegister_ = () => { reads++; return { sheet, records: [record], warningCount: 0 }; };
context.SidilanRepository.collectPositions_ = () => { positions++; return ['', 'Arsip']; };
context.SidilanRepository.readOutgoingTrend_ = () => ({ unavailable: true, unreadableDates: 0 });
context.SidilanRepository.getValidatedSheet_ = () => sheet;
context.SidilanRepository.readRecordAtRow_ = () => record;
context.SidilanRepository.ensureUniqueAgenda_ = () => {};
context.SidilanRepository.updateFields_ = () => ({ ...record, subject: 'Baru' });

const startup = context.getStartupData({ page: 1 });
assert.equal(startup.success, true);
assert.equal(startup.initialData.success, true);
assert.equal(startup.list.total, 1);
assert.equal(startup.dashboard.total, 1);
assert.equal(reads, 1, 'startup must read register once');
assert.equal(positions, 1, 'startup must collect options once');
assert.equal(context.getStartupData({ page: 0 }).error, 'VALIDATION_ERROR');
assert.equal(reads, 1, 'invalid startup query must not read spreadsheet');

reads = 0;
positions = 0;
assert.equal(context.getSuratMasuk({ page: 2 }).page, 1);
assert.equal(reads, 1, 'pagination must fetch fresh register');
assert.equal(positions, 1, 'pagination must load current positions');

reads = 0;
positions = 0;
assert.equal(context.updateSuratMasuk({ rowHint: 2, agenda: '1', expectedHash: 'fresh', changes: { subject: 'Baru' } }).success, true);
assert.equal(reads, 0, 'non-position edit must not read entire register');
assert.equal(positions, 0, 'non-position edit must not load validations');

assert.equal(context.updateSuratMasuk({ rowHint: 2, agenda: '1', expectedHash: 'fresh', changes: { letterPosition: 'Tidak valid' } }).error, 'VALIDATION_ERROR');
assert.equal(reads, 1, 'position edit must fetch current register');
assert.equal(positions, 1, 'position edit must validate against current options');

record.subject = 'Perubahan luar';
reads = 0;
assert.equal(context.getSuratMasuk({ page: 1 }).records[0].subject, 'Perubahan luar');
assert.equal(reads, 1, 'new page must re-read external changes');
console.log('startup, pagination, edit read counts passed');
