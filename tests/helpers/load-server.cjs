const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

function loadServer(context = {}, { original = false, reverse = false } = {}) {
  vm.createContext(context);
  const files = original
    ? [path.join(root, 'tests', 'fixtures', 'Code.original.js')]
    : fs.readdirSync(path.join(root, 'Server'))
      .filter(file => file.endsWith('.js'))
      .sort()
      .map(file => path.join(root, 'Server', file));
  if (!original && reverse) files.reverse();

  for (const file of files) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  if (!original) {
    vm.runInContext(`[
      'SidilanAuth', 'SidilanConfig', 'SidilanErrors', 'SidilanFilters',
      'SidilanIncomingCreate', 'SidilanIncomingRead', 'SidilanIncomingUpdate',
      'SidilanReports', 'SidilanRepository', 'SidilanUtils'
    ].forEach(name => { globalThis[name] = eval(name); });`, context);
  }

  return context;
}

module.exports = { loadServer };
