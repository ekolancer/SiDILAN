const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
(async () => {
  const source = readFileSync(join(__dirname, '..', 'src', 'lib', 'csv.js'), 'utf8');
  const moduleUrl = 'data:text/javascript,' + encodeURIComponent(source);
  const { csvCell, csvRows } = await import(moduleUrl);
  for (const dangerous of ['=1+1', '+SUM(1)', '-2+3', '@cmd', ' \t=1', '\uFEFF=1', '\r-1']) {
    assert.ok(csvCell(dangerous).startsWith('"\''), dangerous);
  }
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvRows([['Agenda', 'Perihal'], ['001', 'uji,\nbaris dua']]), '\uFEFF"Agenda","Perihal"\r\n"001","uji,\nbaris dua"\r\n');
  console.log('CSV safety and quoting checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
