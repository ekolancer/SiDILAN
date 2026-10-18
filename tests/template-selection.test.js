const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadServer } = require('./helpers/load-server.cjs');
const context = loadServer({ Date, JSON, Set, Math, Number, String, Array, Object, RegExp, console });

const rows = Array.from({ length: 15 }, () => Array(14).fill(''));
rows[9][0] = '354.a';
rows[9][1] = 'data surat';
for (let row = 10; row < rows.length; row++) {
  rows[row][0] = String(355 + row - 10);
  rows[row][6] = `=IF(B${row + 1}="","",C${row + 1}&" - "&F${row + 1})`;
}
const formulas = rows.map(row => row.map(value => typeof value === 'string' && value.startsWith('=') ? value : ''));
let rangeCalls = 0;
const sheet = {
  getLastRow: () => rows.length,
  getLastColumn: () => 14,
  getRange(startRow, startCol, numRows, numCols) {
    rangeCalls++;
    const selected = rows.slice(startRow - 1, startRow - 1 + numRows).map(row => row.slice(startCol - 1, startCol - 1 + numCols));
    const selectedFormulas = formulas.slice(startRow - 1, startRow - 1 + numRows).map(row => row.slice(startCol - 1, startCol - 1 + numCols));
    return {
      getMergedRanges: () => [],
      getValues: () => selected,
      getFormulas: () => selectedFormulas,
      getNotes: () => selected.map(row => row.map(() => '')),
      getDisplayValues: () => selected.map(row => row.map(value => String(value))),
    };
  }
};
const records = [{ rowHint: 10, agenda: '354.a' }];
assert.equal(context.SidilanRepository.findSafeTemplateRow_(sheet, records), null, 'template formulas should prevent destructive reuse');
assert.equal(rangeCalls, 2, 'template scan should use batch reads, not a call per row');
assert.equal(context.SidilanRepository.safeInsertRow_(sheet, records), 11, 'fallback inserts immediately after final real record');
rows[10][6] = '';
formulas[10][6] = '';
assert.equal(context.SidilanRepository.findSafeTemplateRow_(sheet, records), null, 'template row must retain reserved agenda and description');
rows[10][6] = 'reserved template description';
assert.equal(context.SidilanRepository.findSafeTemplateRow_(sheet, records), 11, 'clean reserved row is safely reused');

