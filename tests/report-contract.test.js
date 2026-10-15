const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { Date, JSON, Set, Map, Math, Number, String, Array, Object, RegExp, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8'), context);

const config = { spreadsheetId: 'copy', sheetName: 'SuratMasuk' };
const records = [
  { agenda: '1', receivedDate: '14 Oktober 2026', receivedDateKey: '2026-10-14', letterNumber: '001', sender: 'Unit', subject: 'Permintaan', documentDescription: '', disposition: 'Tindak', dispositionTargets: 'Subbag TU, Bidang Logistik; Subbag TU', followupNote: 'Selesai', letterPosition: '', rowHint: 2 },
  { agenda: '2', receivedDate: 'teks tak dikenal', receivedDateKey: '', letterNumber: '002', sender: 'Lain', subject: 'Laporan', documentDescription: '', disposition: '', dispositionTargets: 'Subbag TU', followupNote: 'Dalam Proses', letterPosition: 'Baru Masuk', rowHint: 3 },
  { agenda: '3', receivedDate: '13 September 2026', receivedDateKey: '2026-09-13', letterNumber: '003', sender: 'Unit', subject: 'Permintaan lama', documentDescription: '', disposition: '', dispositionTargets: '', followupNote: 'Lewat Batas Waktu', letterPosition: 'Baru Masuk', rowHint: 4 }
];
context.requireRole_ = role => ({ config, role });
context.readRegister_ = () => ({ records, warningCount: 1 });
context.Utilities = { formatDate: (_date, _zone, format) => format === 'yyyy-MM' ? '2026-10' : '2026-10-14T10:00:00' };
let outgoingProperties = {};
context.PropertiesService = { getScriptProperties: () => ({ getProperties: () => outgoingProperties }) };
const own = value => JSON.parse(JSON.stringify(value));

const dashboard = own(context.getDashboardStats());
assert.equal(dashboard.success, true);
assert.equal(dashboard.total, 3);
assert.equal(dashboard.receivedThisMonth, 1);
assert.equal(dashboard.unreadableDates, 1);
assert.equal(dashboard.withDisposition, 1);
assert.equal(dashboard.withFollowup, 3);
assert.deepEqual(dashboard.statusCounts, { selesai: 1, dalamProses: 1, lewatBatasWaktu: 1 });
assert.equal(dashboard.unclassifiedStatus, 0);
assert.deepEqual(dashboard.unitCounts, [{ label: 'Subbag TU', count: 2 }, { label: 'Bidang Logistik', count: 1 }]);
assert.equal(dashboard.trend.length, 2);
assert.deepEqual(dashboard.trend, [{ month: '2026-09', incoming: 1, outgoing: null }, { month: '2026-10', incoming: 1, outgoing: null }]);
assert.equal(dashboard.latest[0].dispositionTargets, '');
assert.equal(dashboard.outgoingUnavailable, true);
assert.equal(dashboard.latest[0].agenda, '3');
const recentByMonth = [{ ...records[0], receivedDateKey: '2025-12-14' }, { ...records[2], receivedDateKey: '2026-02-13' }];
context.readRegister_ = () => ({ records: recentByMonth, warningCount: 0 });
assert.deepEqual(own(context.getDashboardStats()).trend, [
  { month: '2025-12', incoming: 1, outgoing: null },
  { month: '2026-01', incoming: 0, outgoing: null },
  { month: '2026-02', incoming: 1, outgoing: null },
]);
context.readRegister_ = () => ({ records: [{ ...records[1], receivedDateKey: '' }], warningCount: 0 });
assert.deepEqual(own(context.getDashboardStats()).trend, []);
context.readRegister_ = () => ({ records, warningCount: 1 });

outgoingProperties = { OUTGOING_SPREADSHEET_ID: 'outgoing', OUTGOING_SHEET_NAME: 'SuratKeluar' };
context.SpreadsheetApp = { openById: id => {
  assert.equal(id, 'outgoing');
  return { getSheetByName: name => {
    assert.equal(name, 'SuratKeluar');
    return {
      getLastColumn: () => 2, getLastRow: () => 5,
      getRange: (row, column) => row === 1
        ? { getDisplayValues: () => [['Nomor', 'Tanggal Surat']] }
        : { getValues: () => [[new Date('2026-10-07T00:00:00Z')], ['13 September 2026'], ['tanggal salah'], ['']], getDisplayValues: () => [['7 Oktober 2026'], ['13 September 2026'], ['tanggal salah'], ['']] },
    };
  } };
} };
const outgoingDashboard = own(context.getDashboardStats());
assert.equal(outgoingDashboard.outgoingUnavailable, false);
assert.equal(outgoingDashboard.outgoingUnreadableDates, 1);
assert.equal(outgoingDashboard.trend.at(-1).outgoing, 1);
assert.equal(outgoingDashboard.trend.at(-2).outgoing, 1);
const originalOpenById = context.SpreadsheetApp.openById;
context.SpreadsheetApp.openById = () => ({ getSheetByName: () => ({ getLastColumn: () => 1, getRange: () => ({ getDisplayValues: () => [['Lain']] }) }) });
assert.equal(own(context.getDashboardStats()).outgoingUnavailable, true);
context.SpreadsheetApp.openById = originalOpenById;
records[0].followupNote = ' selesai ';
records[1].dispositionTargets = 'Subbag TU; - ; Bidang Logistik';
assert.equal(own(context.getDashboardStats()).statusCounts.selesai, 1);
assert.deepEqual(own(context.getDashboardStats()).unitCounts, [{ label: 'Bidang Logistik', count: 2 }, { label: 'Subbag TU', count: 2 }]);
records[0].followupNote = 'Selesai';
records[1].dispositionTargets = 'Subbag TU';
context.SpreadsheetApp.openById = () => { throw new Error('No access'); };
assert.equal(own(context.getDashboardStats()).outgoingUnavailable, true);

const report = own(context.getIncomingReport({ keyword: 'permintaan', positions: [''], fromDate: '2026-10-01', toDate: '2026-10-31' }));
assert.equal(report.success, true);
assert.equal(report.total, 1);
assert.equal(report.records[0].agenda, '1');
assert.equal(own(context.getIncomingReport({ keyword: '', fromDate: '2026-10-01' })).unreadableDates, 1);
assert.equal(own(context.getIncomingReport({ keyword: '' })).total, 3);
const filteredBySender = own(context.getIncomingReport({ keyword: '', sender: 'Lain' }));
assert.equal(filteredBySender.total, 1);
assert.deepEqual(filteredBySender.senders, ['Lain', 'Unit']);
assert.deepEqual(filteredBySender.targets, ['Bidang Logistik', 'Subbag TU']);
assert.deepEqual(own(context.getIncomingReport({ keyword: '', dispositionTarget: 'Bidang Logistik' })).records.map(record => record.agenda), ['1']);
assert.equal(own(context.getIncomingReport({ keyword: '', sender: '', dispositionTarget: '' })).total, 3);
assert.equal(own(context.getIncomingReport({ keyword: '', positions: [] })).total, 0);
assert.equal(own(context.getIncomingReport({ keyword: '', sender: 7 })).error, 'VALIDATION_ERROR');
assert.equal(own(context.getIncomingReport({ keyword: '', dispositionTarget: ['Subbag TU'] })).error, 'VALIDATION_ERROR');
assert.equal(own(context.getIncomingReport({ keyword: '', fromDate: '2026-02-30' })).error, 'VALIDATION_ERROR');
assert.equal(own(context.getIncomingReport({ keyword: '', fromDate: '2026-11-01', toDate: '2026-10-01' })).error, 'VALIDATION_ERROR');
context.collectPositions_ = () => [''];
const listDefault = own(context.getSuratMasuk({}));
assert.equal(listDefault.success, true);
assert.equal(listDefault.pageSize, 10);
assert.equal(listDefault.total, 3);
records.push(...Array.from({ length: 20 }, (_, index) => ({ ...records[0], agenda: String(index + 4), rowHint: index + 5 })));
const firstListPage = own(context.getSuratMasuk({}));
assert.equal(firstListPage.records.length, 10);
assert.equal(firstListPage.records[0].agenda, '1');
assert.equal(own(context.getSuratMasuk({ page: 2 })).records[0].agenda, '11');
assert.equal(own(context.getSuratMasuk({ pageSize: 50 })).pageSize, 50);
assert.equal(own(context.getSuratMasuk({ pageSize: 100 })).pageSize, 100);
records.splice(3);
assert.equal(own(context.getSuratMasuk({ pageSize: 20 })).error, 'VALIDATION_ERROR');
assert.equal(context.matchesRegisterFilter_(records[0], 'permintaan', new Set([''])), true);
assert.equal(context.matchesRegisterFilter_(records[0], 'permintaan', new Set(['Baru Masuk'])), false);
assert.equal(context.receivedDateKey_(46309, '14 Oktober 2026'), '2026-10-14');
assert.equal(context.receivedDateKey_(null, '14 Oktober 2026'), '2026-10-14');
assert.equal(context.receivedDateKey_(null, '31 Februari 2026'), '');
context.requireRole_ = () => { throw new Error('ACCESS_DENIED'); };
assert.equal(own(context.getDashboardStats()).error, 'ACCESS_DENIED');
assert.equal(own(context.getIncomingReport({})).error, 'ACCESS_DENIED');
console.log('dashboard and report contract checks passed');
