import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { letterApi } from '../src/services/appsScript.js'
import { display, editGroups, reportColumns } from '../src/lib/letterFields.js'
import { useLetters } from '../src/composables/useLetters.js'
import { useDashboard } from '../src/composables/useDashboard.js'
import { useReport } from '../src/composables/useReport.js'
import { ref } from 'vue'

assert.equal(display(''), 'Belum diisi')
assert.equal(reportColumns.length, 14)
assert.deepEqual(editGroups.map(group => group.title), ['Identitas surat', 'Disposisi', 'Posisi dan tindak lanjut', 'Berkas'])

const calls = []
globalThis.google = { script: { run: {
  withSuccessHandler(resolve) {
    return { withFailureHandler() {
      return new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); resolve({ success: true }) } })
    } }
  },
} } }

await letterApi.getAppStatus()
await letterApi.getSuratMasuk({ keyword: 'agenda' })
await letterApi.createSuratMasuk({ subject: 'Surat' })
await letterApi.getIncomingReport({ fromDate: '2026-10-01' })
assert.deepEqual(calls, [
  ['getAppStatus'],
  ['getSuratMasuk', { keyword: 'agenda' }],
  ['createSuratMasuk', { subject: 'Surat' }],
  ['getIncomingReport', { fromDate: '2026-10-01' }],
])
delete globalThis.google
await assert.rejects(letterApi.getDashboardStats(), { message: 'APPS_SCRIPT_UNAVAILABLE' })

const first = { rowHint: 2, agenda: 'A-1', expectedHash: 'h1', subject: 'Surat pertama', followupNote: '' }
const second = { rowHint: 3, agenda: 'A-2', expectedHash: 'h2', subject: 'Surat kedua', followupNote: '' }
const requests = []
const api = {
  getSuratMasuk: async query => {
    requests.push(query)
    return { success: true, records: [first, second], total: 2, page: query.page, pageSize: query.pageSize }
  },
  getSuratDetail: async query => ({ success: true, record: query.agenda === 'A-1' ? first : second }),
  updateSuratMasuk: async change => ({ success: true, record: { ...first, ...change.changes, expectedHash: 'h3' } }),
  createSuratMasuk: async () => ({ success: true, agenda: 'A-3' }),
  getDashboardStats: async () => ({ success: true, total: 2, statusCounts: {} }),
  getIncomingReport: async () => ({ success: true, records: [], total: 0 }),
}
const letters = useLetters(api, ref('WRITE'))
await letters.search()
assert.equal(letters.records.value.length, 2)
assert.equal(letters.listIsCurrent.value, true)
letters.keyword.value = 'A-1'
assert.equal(letters.listIsCurrent.value, false)
await letters.search()
assert.equal(requests.at(-1).keyword, 'A-1')
await letters.openDetail(first)
letters.startEditing('quick')
letters.editForm.value.followupNote = 'Dicatat'
assert.equal(letters.editIsDirty.value, true)
const originalWindow = globalThis.window
globalThis.window = { confirm: () => false }
assert.equal(await letters.openDetail(second), false)
assert.equal(letters.detail.value.agenda, 'A-1')
assert.equal(letters.editForm.value.followupNote, 'Dicatat')
globalThis.window.confirm = () => true
assert.equal(await letters.openDetail(second), true)
assert.equal(letters.detail.value.agenda, 'A-2')
assert.equal(letters.editingDetail.value, false)
await letters.openDetail(first)
letters.startEditing('quick')
letters.editForm.value.followupNote = 'Diproses'
await letters.submitEdit()
assert.equal(letters.saveNotice.value, 'Perubahan surat agenda A-1 berhasil disimpan.')
assert.equal(letters.detail.value.expectedHash, 'h3')
if (originalWindow === undefined) delete globalThis.window
else globalThis.window = originalWindow

const dashboard = useDashboard(api)
await dashboard.loadDashboard()
assert.equal(dashboard.dashboard.value.total, 2)
const report = useReport(api, letters.allPositions)
assert.deepEqual(report.reportListColumns.value.map(([key]) => key), ['agenda', 'receivedDate', 'letterNumber', 'letterDate', 'sender', 'subject', 'disposition', 'dispositionTargets'])
await report.loadReport()
assert.equal(report.report.value.total, 0)

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
for (const view of ['DashboardView', 'LetterListView', 'LetterCreateView', 'LetterDetailView', 'ReportView']) {
  assert.match(app, new RegExp(`<${view}\\b`))
}
console.log('frontend module boundaries and API mapping passed')
