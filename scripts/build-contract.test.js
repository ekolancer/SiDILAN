import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile('Index.html', 'utf8')
assert.match(html, /<div id="app"><\/div>/)
assert.match(html, /<script type="module"[^>]*>/)
assert.match(html, /<style[^>]*>/)
assert.doesNotMatch(html, /\/src\/main\.js|\/assets\/|\b__vite/)
console.log('HTML Service build contract checks passed')
