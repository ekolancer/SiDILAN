const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { Date, JSON, Set, Map, Math, Number, String, Array, Object, RegExp, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8'), context);

const config = { spreadsheetId: 'copy', sheetName: 'SuratMasuk' };
const records = [
  { agenda: '1', receivedDate: '14 Oktober 2026', receivedDateKey: '2026-10-14', letterNumber: '001', sender: 'Unit', subject: 'Permintaan', documentDescription: '', disposition: 'Tindak', followupNote: '', letterPosition: '', rowHint: 2 },
  { agenda: '2', receivedDate: 'teks tak dikenal', receivedDateKey: '', letterNumber: '002', sender: 'Lain', subject: 'Laporan', documentDescription: '', disposition: '', followupNote: 'Diproses', letterPosition: 'Baru Masuk', rowHint: 3 },
  { agenda: '3', receivedDate: '13 September 2026', receivedDateKey: '2026-09-13', letterNumber: '003', sender: 'Unit', subject: 'Permintaan lama', documentDescription: '', disposition: '', followupNote: '', letterPosition: 'Baru Masuk', rowHint: 4 }
];
context.requireRole_ = role => ({ config, role });
context.readRegister_ = () => ({ records, warningCount: 1 });
context.Utilities = { formatDate: (_date, _zone, format) => format === 'yyyy-MM' ? '2026-10' : '2026-10-14T10:00:00' };
const own = value => JSON.parse(JSON.stringify(value));

const dashboard = own(context.getDashboardStats());
assert.equal(dashboard.success, true);
assert.equal(dashboard.total, 3);
assert.equal(dashboard.receivedThisMonth, 1);
assert.equal(dashboard.unreadableDates, 1);
assert.equal(dashboard.withDisposition, 1);
assert.equal(dashboard.withFollowup, 1);
assert.deepEqual(dashboard.positions, [{ label: '', count: 1 }, { label: 'Baru Masuk', count: 2 }]);
assert.equal(dashboard.latest[0].agenda, '3');

const report = own(context.getIncomingReport({ keyword: 'permintaan', positions: [''], fromDate: '2026-10-01', toDate: '2026-10-31' }));
assert.equal(report.success, true);
assert.equal(report.total, 1);
assert.equal(report.records[0].agenda, '1');
assert.equal(own(context.getIncomingReport({ keyword: '', fromDate: '2026-10-01' })).unreadableDates, 1);
assert.equal(own(context.getIncomingReport({ keyword: '' })).total, 3);
assert.equal(own(context.getIncomingReport({ keyword: '', positions: [] })).total, 0);
assert.equal(own(context.getIncomingReport({ keyword: '', fromDate: '2026-02-30' })).error, 'VALIDATION_ERROR');
assert.equal(own(context.getIncomingReport({ keyword: '', fromDate: '2026-11-01', toDate: '2026-10-01' })).error, 'VALIDATION_ERROR');
assert.equal(context.matchesRegisterFilter_(records[0], 'permintaan', new Set([''])), true);
assert.equal(context.matchesRegisterFilter_(records[0], 'permintaan', new Set(['Baru Masuk'])), false);
assert.equal(context.receivedDateKey_(46309, '14 Oktober 2026'), '2026-10-14');
assert.equal(context.receivedDateKey_(null, '14 Oktober 2026'), '2026-10-14');
assert.equal(context.receivedDateKey_(null, '31 Februari 2026'), '');
context.requireRole_ = () => { throw new Error('ACCESS_DENIED'); };
assert.equal(own(context.getDashboardStats()).error, 'ACCESS_DENIED');
assert.equal(own(context.getIncomingReport({})).error, 'ACCESS_DENIED');
console.log('dashboard and report contract checks passed');
