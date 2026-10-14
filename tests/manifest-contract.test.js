const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'appsscript.json'), 'utf8'));
assert.equal(manifest.webapp.executeAs, 'USER_ACCESSING');
assert.equal(manifest.webapp.access, 'ANYONE');
assert.equal(manifest.timeZone, 'Asia/Jakarta');
assert.ok(manifest.dependencies.enabledAdvancedServices.some(service => service.serviceId === 'sheets' && service.version === 'v4'));
console.log('Apps Script manifest contract checks passed');
