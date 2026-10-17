import { computed, nextTick, ref } from 'vue'
import { csvRows } from '../lib/csv.js'
import { reportColumns as defaultReportColumns } from '../lib/letterFields.js'

export function useReport(api, allPositions, columns = defaultReportColumns) {
  const reportKeyword = ref('')
  const reportPositions = ref([])
  const reportSender = ref('')
  const reportTarget = ref('')
  const reportPage = ref(1)
  const reportPageSize = 10
  const fromDate = ref('')
  const toDate = ref('')
  const report = ref(null)
  const reportSenders = ref([])
  const reportTargets = ref([])
  const reportLoading = ref(false)
  const reportError = ref('')
  const includeUrls = ref(false)
  let reportRequestId = 0

  const reportColumns = columns
  const reportListColumns = computed(() => reportColumns.slice(0, 9).filter(([key]) => key !== 'documentDescription'))
  const reportQuery = computed(() => ({
    keyword: reportKeyword.value.trim(), positions: [...reportPositions.value],
    sender: reportSender.value, dispositionTarget: reportTarget.value,
    fromDate: fromDate.value, toDate: toDate.value,
  }))
  const reportIsCurrent = computed(() => report.value && JSON.stringify(reportQuery.value) === report.value.queryKey)
  const reportPageCount = computed(() => Math.max(1, Math.ceil((report.value?.records.length || 0) / reportPageSize)))
  const reportRows = computed(() => report.value?.records.slice((reportPage.value - 1) * reportPageSize, reportPage.value * reportPageSize) || [])

  function resetReportFilters() {
    reportKeyword.value = ''
    reportPositions.value = [...allPositions.value]
    reportSender.value = ''
    reportTarget.value = ''
    fromDate.value = ''
    toDate.value = ''
    report.value = null
    reportError.value = ''
    reportPage.value = 1
  }

  async function loadReport() {
    const currentRequest = ++reportRequestId
    if (fromDate.value && toDate.value && fromDate.value > toDate.value) {
      report.value = null
      reportLoading.value = false
      reportError.value = 'Tanggal awal harus sebelum atau sama dengan tanggal akhir.'
      return
    }
    const query = reportQuery.value
    reportLoading.value = true
    reportError.value = ''
    report.value = null
    try {
      const result = await api.getIncomingReport(query)
      if (currentRequest !== reportRequestId) return
      if (!result?.success) {
        reportError.value = result?.message || 'Rekap tidak dapat dimuat.'
        return
      }
      if (!Array.isArray(result.records)) throw new Error('Format data rekap tidak valid.')
      report.value = { ...result, queryKey: JSON.stringify(query) }
      reportSenders.value = result.senders || []
      reportTargets.value = result.targets || []
      reportPage.value = 1
    } catch (error) {
      if (currentRequest === reportRequestId) reportError.value = 'Rekap gagal dimuat. Coba lagi.'
    } finally {
      if (currentRequest === reportRequestId) reportLoading.value = false
    }
  }

  function reportCell(record, key, urls = false) {
    const text = record[key] == null ? '' : String(record[key])
    if (!['letterFileReference', 'followupReference'].includes(key)) return text
    const links = record.links?.[key]
    const linkUrls = Array.isArray(links) ? links.map(link => link.url).filter(url => typeof url === 'string' && /^https:\/\//i.test(url)) : []
    const note = text.replace(/https?:\/\/[^\s,;]+/gi, '').trim().replace(/^[,;\s]+|[,;\s]+$/g, '')
    return urls ? [...new Set([note, ...linkUrls, /^https:\/\//i.test(text) ? text : ''].filter(Boolean))].join(' ; ') : note
  }

  function exportReport() {
    if (!reportIsCurrent.value || reportLoading.value) return
    const rows = [reportColumns.map(([, label]) => label), ...report.value.records.map(record => reportColumns.map(([key]) => reportCell(record, key, includeUrls.value)))]
    const csv = csvRows(rows)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `rekap-surat-masuk-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())}.csv`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  async function printReport() {
    if (!reportIsCurrent.value || reportLoading.value) return
    await nextTick()
    window.print()
  }

  function formatPosition(value) {
    return value || 'Belum diisi'
  }

  return {
    reportKeyword, reportPositions, reportSender, reportTarget, reportPage, reportPageSize,
    fromDate, toDate, report, reportSenders, reportTargets, reportLoading, reportError,
    includeUrls, reportQuery, reportIsCurrent, reportPageCount, reportRows, reportListColumns,
    resetReportFilters, loadReport, reportCell, exportReport, printReport, formatPosition,
  }
}
