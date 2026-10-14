<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, ExternalLink, RotateCw, Search, X } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import { callAppsScript } from '@/services/appsScript'
import { csvRows } from '@/lib/csv'

const loadingStatus = ref(true)
const statusError = ref('')
const email = ref('')
const role = ref('')
const positions = ref([])
const allPositions = ref([])
const keyword = ref('')
const selectedPositions = ref([])
const listLoading = ref(false)
const listError = ref('')
const emptyMessage = ref('Masukkan kata kunci pencarian.')
const records = ref([])
const total = ref(0)
const warningCount = ref(0)
const page = ref(1)
const pageSize = ref(50)
const detail = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const editingDetail = ref(false)
const editBusy = ref(false)
const editError = ref('')
const editForm = ref({})
const editBaseline = ref({})
const editMode = ref('full')
const updateDescription = ref(false)
const showCreate = ref(false)
const createBusy = ref(false)
const createError = ref('')
const duplicateCandidates = ref([])
const createForm = ref(emptyCreateForm())
const activeView = ref('list')
const dashboard = ref(null)
const dashboardLoading = ref(false)
const dashboardError = ref('')
const reportKeyword = ref('')
const reportPositions = ref([])
const fromDate = ref('')
const toDate = ref('')
const report = ref(null)
const reportLoading = ref(false)
const reportError = ref('')
const includeUrls = ref(false)
let requestId = 0
let reportRequestId = 0
let dashboardRequestId = 0

function emptyCreateForm() {
  return { receivedDate: '', letterNumber: '', letterDate: '', sender: '', subject: '', disposition: '', dispositionTargets: '', parafDateOrNote: '', letterFileReference: '', letterPosition: '', followupNote: '', followupReference: '' }
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const positionOptions = computed(() => allPositions.value.map(value => ({ value, label: value || 'Belum diisi' })))
const fields = [
  ['receivedDate', 'Tanggal diterima'], ['letterNumber', 'Nomor surat'], ['letterDate', 'Tanggal surat'],
  ['sender', 'Asal surat'], ['subject', 'Perihal'], ['documentDescription', 'Uraian berkas'],
  ['disposition', 'Isi disposisi'], ['dispositionTargets', 'Tujuan disposisi'],
  ['parafDateOrNote', 'Keterangan / tanggal paraf'], ['letterPosition', 'Posisi surat'],
  ['followupNote', 'Keterangan tindak lanjut'],
]
const reportColumns = [
  ['agenda', 'Nomor agenda'], ['receivedDate', 'Tanggal diterima'], ['letterNumber', 'No. surat'],
  ['letterDate', 'Tanggal surat'], ['sender', 'Asal surat'], ['subject', 'Perihal'],
  ['documentDescription', 'Uraian berkas'], ['disposition', 'Isi disposisi'],
  ['dispositionTargets', 'Tujuan disposisi'], ['parafDateOrNote', 'KET / tanggal paraf disposisi'],
  ['letterFileReference', 'Link berkas'], ['letterPosition', 'Posisi surat'],
  ['followupNote', 'Keterangan tindak lanjut'], ['followupReference', 'Link berkas tindak lanjut'],
]
const reportQuery = computed(() => ({
  keyword: reportKeyword.value.trim(), positions: [...reportPositions.value],
  fromDate: fromDate.value, toDate: toDate.value,
}))
const reportIsCurrent = computed(() => report.value && JSON.stringify(reportQuery.value) === report.value.queryKey)

async function loadInitial() {
  loadingStatus.value = true
  statusError.value = ''
  try {
    const result = await callAppsScript('getAppStatus')
    if (!result?.success) {
      statusError.value = result?.message || 'Akses tidak dapat diverifikasi.'
      return
    }
    email.value = result.email
    role.value = result.role
    await loadPositions()
  } catch (error) {
    statusError.value = error.message === 'APPS_SCRIPT_UNAVAILABLE'
      ? 'Aplikasi harus dibuka melalui deployment Google Apps Script.'
      : 'Status akses gagal diperiksa. Coba lagi.'
  } finally {
    loadingStatus.value = false
  }
}

async function loadPositions() {
  try {
    const result = await callAppsScript('getInitialData')
    if (!result?.success) {
      listError.value = result?.message || 'Data awal tidak dapat dimuat.'
      return
    }
    allPositions.value = result.positions || []
    positions.value = [...allPositions.value]
    reportPositions.value = [...allPositions.value]
    warningCount.value = result.warningCount || 0
  } catch (error) {
    listError.value = 'Data awal gagal dimuat. Periksa koneksi dan izin spreadsheet.'
  }
}

async function search(resetPage = true, preserveDetail = false) {
  const trimmed = keyword.value.trim()
  if (!trimmed) {
    records.value = []
    total.value = 0
    emptyMessage.value = 'Masukkan kata kunci pencarian.'
    listError.value = ''
    return
  }
  if (resetPage) page.value = 1
  const currentRequest = ++requestId
  listLoading.value = true
  listError.value = ''
  if (!preserveDetail) detail.value = null
  try {
    const result = await callAppsScript('getSuratMasuk', {
      keyword: trimmed,
      positions: [...positions.value],
      page: page.value,
    })
    if (currentRequest !== requestId) return
    if (!result?.success) {
      listError.value = result?.message || 'Daftar surat tidak dapat dimuat.'
      return
    }
    records.value = result.records || []
    total.value = result.total || 0
    page.value = result.page || 1
    pageSize.value = result.pageSize || 50
    allPositions.value = result.positions || allPositions.value
    warningCount.value = result.warningCount || 0
    emptyMessage.value = total.value ? `${total.value} pencatatan ditemukan.` : 'Tidak ada data yang cocok.'
  } catch (error) {
    if (currentRequest === requestId) listError.value = 'Daftar surat gagal dimuat. Coba lagi.'
  } finally {
    if (currentRequest === requestId) listLoading.value = false
  }
}

function resetSearch() {
  keyword.value = ''
  positions.value = [...allPositions.value]
  page.value = 1
  records.value = []
  total.value = 0
  listError.value = ''
  emptyMessage.value = 'Masukkan kata kunci pencarian.'
  detail.value = null
}

async function openDetail(record) {
  detail.value = record
  detailLoading.value = true
  detailError.value = ''
  try {
    const result = await callAppsScript('getSuratDetail', {
      rowHint: record.rowHint,
      agenda: record.agenda,
      expectedHash: record.expectedHash,
    })
    if (!result?.success) {
      detailError.value = result?.message || 'Detail tidak dapat dimuat.'
      return
    }
    detail.value = result.record
  } catch (error) {
    detailError.value = 'Detail gagal dimuat. Muat ulang daftar.'
  } finally {
    detailLoading.value = false
  }
}

function startEditing(mode = 'full') {
  if (!detail.value || role.value !== 'WRITE') return
  editMode.value = mode
  const keys = (mode === 'quick' ? ['disposition', 'dispositionTargets', 'parafDateOrNote', 'letterPosition', 'followupNote'] : fields.map(([key]) => key).filter(key => key !== 'documentDescription')).concat(mode === 'full' ? ['letterFileReference', 'followupReference'] : [])
  editBaseline.value = Object.fromEntries(keys.map(key => [key, detail.value[key] || '']))
  editForm.value = { ...editBaseline.value }
  editError.value = ''
  updateDescription.value = false
  editingDetail.value = true
}

function cancelEditing() {
  editingDetail.value = false
  editError.value = ''
  editForm.value = {}
}

async function submitEdit() {
  if (editBusy.value || !detail.value) return
  const changes = Object.fromEntries(Object.entries(editForm.value).filter(([key, value]) => value !== editBaseline.value[key]))
  if (!Object.keys(changes).length && !updateDescription.value) {
    editError.value = 'Tidak ada perubahan untuk disimpan.'
    return
  }
  editBusy.value = true
  editError.value = ''
  try {
    const result = await callAppsScript('updateSuratMasuk', {
      rowHint: detail.value.rowHint,
      agenda: detail.value.agenda,
      expectedHash: detail.value.expectedHash,
      changes,
      updateDescription: updateDescription.value,
    })
    if (!result?.success) {
      editError.value = result?.message || 'Perubahan gagal disimpan.'
      return
    }
    detail.value = result.record
    editingDetail.value = false
    await search(false, true)
  } catch (error) {
    editError.value = 'Penyimpanan belum terkonfirmasi. Muat ulang sebelum mencoba lagi.'
  } finally {
    editBusy.value = false
  }
}

async function submitCreate(confirmDuplicate = false) {
  if (createBusy.value) return
  createBusy.value = true
  createError.value = ''
  try {
    const result = await callAppsScript('createSuratMasuk', { ...createForm.value, confirmDuplicate })
    if (!result?.success) {
      if (result?.error === 'DUPLICATE_WARNING') {
        duplicateCandidates.value = result.candidates || []
        createError.value = result.message
        return
      }
      createError.value = result?.message || 'Surat gagal disimpan.'
      return
    }
    showCreate.value = false
    duplicateCandidates.value = []
    createForm.value = emptyCreateForm()
    keyword.value = result.agenda
    positions.value = [...allPositions.value]
    await search()
  } catch (error) {
    createError.value = 'Hasil simpan belum diketahui. Periksa daftar sebelum mencoba lagi.'
  } finally {
    createBusy.value = false
  }
}

function openCreate() {
  createError.value = ''
  duplicateCandidates.value = []
  createForm.value = { ...emptyCreateForm(), receivedDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()) }
  showCreate.value = true
}

function switchView(view) {
  activeView.value = view
  if (view === 'dashboard') loadDashboard()
}

async function loadDashboard() {
  const currentRequest = ++dashboardRequestId
  dashboardLoading.value = true
  dashboardError.value = ''
  dashboard.value = null
  try {
    const result = await callAppsScript('getDashboardStats')
    if (currentRequest !== dashboardRequestId) return
    if (!result?.success) {
      dashboardError.value = result?.message || 'Ringkasan tidak dapat dimuat.'
      return
    }
    dashboard.value = result
  } catch (error) {
    if (currentRequest === dashboardRequestId) dashboardError.value = 'Ringkasan gagal dimuat. Coba lagi.'
  } finally {
    if (currentRequest === dashboardRequestId) dashboardLoading.value = false
  }
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
    const result = await callAppsScript('getIncomingReport', query)
    if (currentRequest !== reportRequestId) return
    if (!result?.success) {
      reportError.value = result?.message || 'Rekap tidak dapat dimuat.'
      return
    }
    if (!Array.isArray(result.records)) throw new Error('Format data rekap tidak valid.')
    report.value = { ...result, queryKey: JSON.stringify(query) }
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

function display(value) {
  return value === '' || value == null ? 'Belum diisi' : String(value)
}

function formatPosition(value) {
  return value || 'Belum diisi'
}

onMounted(loadInitial)
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p class="text-lg font-bold tracking-tight text-blue-900">SiDILAN <span class="font-normal text-slate-500">/ Surat Masuk</span></p>
        <span v-if="role" class="text-sm text-slate-700">{{ role === 'WRITE' ? 'Pencatat' : 'Pembaca' }}</span>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <p v-if="email" class="mb-4 text-sm text-slate-700 print:hidden">{{ email }}</p>

      <section v-if="loadingStatus" class="rounded-xl border border-slate-200 bg-white p-6" role="status" aria-live="polite">
        Memeriksa akses akun Google...
      </section>
      <section v-else-if="statusError" class="rounded-xl border border-red-200 bg-white p-6" role="alert">
        <h1 class="text-lg font-semibold">Akses aplikasi belum tersedia</h1>
        <p class="mt-2 text-sm text-red-800">{{ statusError }}</p>
        <Button class="mt-4" @click="loadInitial">Coba lagi</Button>
      </section>

      <template v-else>
        <nav class="mb-5 flex flex-wrap gap-2 print:hidden" aria-label="Navigasi utama">
          <Button v-for="view in [['list', 'Daftar surat'], ['dashboard', 'Dashboard'], ['report', 'Rekap surat']]" :key="view[0]" :variant="activeView === view[0] ? 'default' : 'outline'" :aria-current="activeView === view[0] ? 'page' : undefined" @click="switchView(view[0])">{{ view[1] }}</Button>
        </nav>

        <section v-if="activeView === 'dashboard'" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="dashboard-title">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h1 id="dashboard-title" class="text-2xl font-semibold tracking-tight">Ringkasan surat masuk</h1>
            <Button variant="outline" :disabled="dashboardLoading" @click="loadDashboard"><RotateCw class="h-4 w-4" aria-hidden="true" /> Muat ulang</Button>
          </div>
          <p v-if="dashboardError" class="mt-4 text-sm text-red-800" role="alert">{{ dashboardError }}</p>
          <p v-if="dashboardLoading" class="mt-4 text-sm text-slate-700" role="status">Memuat ringkasan...</p>
          <template v-if="dashboard">
            <p class="mt-2 text-sm text-slate-700">Data diperbarui {{ dashboard.loadedAt || '—' }} WIB</p>
            <dl class="summary-grid mt-6">
              <div><dt>Total pencatatan</dt><dd>{{ dashboard.total }}</dd></div>
              <div><dt>Diterima bulan ini (WIB)</dt><dd>{{ dashboard.receivedThisMonth }}</dd></div>
              <div><dt>Memiliki isi disposisi (H)</dt><dd>{{ dashboard.withDisposition }}</dd></div>
              <div><dt>Memiliki keterangan tindak lanjut (M)</dt><dd>{{ dashboard.withFollowup }}</dd></div>
            </dl>
            <p class="mt-5 text-sm text-amber-900" role="status">{{ dashboard.unreadableDates }} tanggal diterima tidak dapat dibaca; tidak dihitung dalam bulan berjalan.</p>
            <p v-if="dashboard.warningCount" class="mt-1 text-sm text-amber-900">{{ dashboard.warningCount }} baris dilewati karena data tidak dapat dibaca.</p>
            <div class="dashboard-columns mt-8">
              <section aria-labelledby="positions-title">
                <h2 id="positions-title" class="text-lg font-semibold">Posisi surat</h2>
                <p v-if="!dashboard.positions?.length" class="mt-3 text-sm text-slate-700">Belum ada posisi surat.</p>
                <dl v-else class="mt-3 divide-y divide-slate-200">
                  <div v-for="position in dashboard.positions" :key="position.label" class="flex justify-between gap-4 py-2 text-sm"><dt class="break-words">{{ formatPosition(position.label) }}</dt><dd class="font-semibold tabular-nums">{{ position.count }}</dd></div>
                </dl>
              </section>
              <section aria-labelledby="latest-title">
                <h2 id="latest-title" class="text-lg font-semibold">Pencatatan terbaru</h2>
                <p v-if="!dashboard.latest?.length" class="mt-3 text-sm text-slate-700">Belum ada pencatatan.</p>
                <ol v-else class="mt-3 divide-y divide-slate-200">
                  <li v-for="record in dashboard.latest" :key="`${record.rowHint}-${record.agenda}`" class="py-2 text-sm">
                    <p class="break-words font-semibold">{{ display(record.agenda) }} · {{ display(record.subject) }}</p>
                    <p class="mt-1 break-words text-slate-700">{{ display(record.receivedDate) }} · {{ display(record.sender) }} · {{ formatPosition(record.letterPosition) }}</p>
                  </li>
                </ol>
              </section>
            </div>
          </template>
        </section>

        <section v-if="activeView === 'report'" class="report-section rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="report-title">
          <div class="report-controls">
            <h1 id="report-title" class="text-2xl font-semibold tracking-tight">Rekap surat masuk</h1>
            <p class="mt-1 text-sm text-slate-700">Pratinjau seluruh 14 kolom. Filter periode memakai tanggal diterima.</p>
            <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="loadReport">
              <label class="grid gap-1 text-sm font-medium sm:col-span-2">Kata kunci (opsional)<Input v-model="reportKeyword" maxlength="200" placeholder="Agenda, nomor surat, asal, atau perihal" /></label>
              <label class="grid gap-1 text-sm font-medium">Dari tanggal<Input v-model="fromDate" type="date" :max="toDate || undefined" /></label>
              <label class="grid gap-1 text-sm font-medium">Sampai tanggal<Input v-model="toDate" type="date" :min="fromDate || undefined" /></label>
              <label class="grid gap-1 text-sm font-medium sm:col-span-2">Posisi surat (pilih beberapa; kosong berarti tanpa hasil)<Select v-model="reportPositions" :options="positionOptions" aria-label="Filter posisi rekap" /></label>
              <div class="flex flex-wrap items-center gap-3 sm:col-span-2"><Button type="submit" :disabled="reportLoading">{{ reportLoading ? 'Memuat...' : 'Tampilkan rekap' }}</Button><p class="text-sm text-slate-700">Kata kunci boleh kosong untuk semua surat pada posisi terpilih.</p></div>
            </form>
            <p v-if="reportError" class="mt-4 text-sm text-red-800" role="alert">{{ reportError }}</p>
            <p v-if="reportLoading" class="mt-4 text-sm text-slate-700" role="status">Memuat rekap...</p>
            <template v-if="report">
              <p v-if="!reportIsCurrent" class="mt-4 text-sm text-amber-900" role="status">Filter berubah. Tampilkan rekap lagi sebelum mencetak atau mengekspor.</p>
              <div class="mt-5 flex flex-wrap items-end gap-4">
                <label class="flex items-center gap-2 text-sm"><input v-model="includeUrls" type="checkbox" /> Sertakan URL berkas dalam CSV</label>
                <Button variant="outline" :disabled="!reportIsCurrent || reportLoading" @click="printReport">Cetak rekap</Button>
                <Button variant="outline" :disabled="!reportIsCurrent || reportLoading" @click="exportReport">Ekspor CSV</Button>
              </div>
            </template>
          </div>
          <template v-if="report && reportIsCurrent">
            <div class="report-print-heading">
              <h2>Rekap surat masuk</h2>
              <p>Dibuat {{ report.generatedAt || '—' }} WIB · {{ report.total }} surat</p>
              <p>Filter: {{ report.filters?.keyword || 'Semua kata kunci' }} · {{ report.filters?.fromDate || 'Awal' }} sampai {{ report.filters?.toDate || 'Akhir' }} · Posisi: {{ report.filters?.positions?.map(formatPosition).join(', ') || 'Tidak ada' }}</p>
            </div>
            <p class="mt-5 text-sm text-slate-700" role="status">{{ report.total }} surat dalam rekap. <span v-if="report.unreadableDates">{{ report.unreadableDates }} tanggal tak terbaca tidak masuk periode.</span><span v-if="report.warningCount"> {{ report.warningCount }} baris dilewati karena data tidak dapat dibaca.</span></p>
            <div v-if="report.records.length" class="report-scroll mt-4" tabindex="0" role="region" aria-label="Pratinjau rekap 14 kolom, geser untuk melihat semua kolom">
              <table class="report-table">
                <thead><tr><th v-for="[key, label] in reportColumns" :key="key" scope="col">{{ label }}</th></tr></thead>
                <tbody><tr v-for="record in report.records" :key="`${record.rowHint}-${record.agenda}`"><td v-for="[key] in reportColumns" :key="key">{{ display(record[key]) }}</td></tr></tbody>
              </table>
            </div>
            <p v-else class="mt-4 text-sm text-slate-700">Tidak ada surat yang cocok dengan filter ini.</p>
          </template>
        </section>

        <section v-if="activeView === 'list'" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h1 class="text-2xl font-semibold tracking-tight">Daftar surat masuk</h1>
            <Button v-if="role === 'WRITE'" @click="openCreate">Tambah surat</Button>
          </div>
          <form class="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]" role="search" @submit.prevent="search()">
            <label class="sr-only" for="keyword">Kata kunci pencarian</label>
            <Input id="keyword" v-model="keyword" maxlength="200" placeholder="Cari agenda, nomor surat, asal, atau perihal" autocomplete="off" />
            <Button type="submit" :disabled="listLoading"><Search class="h-4 w-4" aria-hidden="true" /> Cari</Button>
          </form>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <label for="position-filter" class="text-sm font-medium">Posisi surat</label>
            <Select id="position-filter" v-model="positions" :options="positionOptions" aria-label="Filter posisi surat" />
            <Button variant="ghost" size="sm" @click="resetSearch">Reset</Button>
            <Button variant="ghost" size="sm" :disabled="listLoading" @click="keyword.trim() ? search(false) : loadPositions()"><RotateCw class="h-4 w-4" aria-hidden="true" /> Muat ulang</Button>
          </div>

          <p v-if="warningCount" class="mt-4 text-sm text-amber-900" role="status">{{ warningCount }} baris dilewati karena data tidak dapat dibaca.</p>
          <p v-if="listError" class="mt-4 text-sm text-red-800" role="alert">{{ listError }}</p>
          <p v-else-if="listLoading" class="mt-4 text-sm text-slate-700" role="status" aria-live="polite">Memuat daftar surat...</p>
          <p v-else class="mt-4 text-sm text-slate-700" role="status" aria-live="polite">{{ emptyMessage }}</p>

          <div v-if="records.length" class="mt-3 divide-y divide-slate-200">
            <article v-for="record in records" :key="`${record.rowHint}-${record.agenda}`" class="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div class="min-w-0">
                <h2 class="break-words font-semibold">{{ display(record.agenda) }} <span aria-hidden="true">/</span> {{ display(record.subject) }}</h2>
                <p class="mt-1 break-words text-sm text-slate-700">{{ [display(record.receivedDate), display(record.letterNumber), display(record.sender), formatPosition(record.letterPosition)].join(' · ') }}</p>
              </div>
              <Button variant="outline" class="justify-self-start" @click="openDetail(record)">Lihat detail</Button>
            </article>
          </div>

          <nav v-if="total > 0" class="mt-5 flex items-center justify-between gap-3" aria-label="Paginasi daftar surat">
            <Button variant="outline" :disabled="page <= 1 || listLoading" @click="page--; search(false)"><ChevronLeft class="h-4 w-4" aria-hidden="true" /> Sebelumnya</Button>
            <span class="text-sm text-slate-700">Halaman {{ page }} dari {{ pageCount }}</span>
            <Button variant="outline" :disabled="page >= pageCount || listLoading" @click="page++; search(false)">Berikutnya <ChevronRight class="h-4 w-4" aria-hidden="true" /></Button>
          </nav>
        </section>

        <section v-if="activeView === 'list' && showCreate" class="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="create-title">
          <div class="flex items-start justify-between gap-4">
            <div><h2 id="create-title" class="text-xl font-semibold">Pencatatan surat baru</h2><p class="mt-1 text-sm text-slate-700">Nomor agenda dibuat otomatis saat disimpan.</p></div>
            <Button variant="ghost" size="icon" aria-label="Tutup formulir" :disabled="createBusy" @click="showCreate = false"><X class="h-5 w-5" aria-hidden="true" /></Button>
          </div>
          <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="submitCreate()">
            <label class="grid gap-1 text-sm font-medium">Tanggal diterima *<Input v-model="createForm.receivedDate" type="date" required /></label>
            <label class="grid gap-1 text-sm font-medium">Nomor surat *<Input v-model="createForm.letterNumber" maxlength="500" required /></label>
            <label class="grid gap-1 text-sm font-medium">Tanggal surat<Input v-model="createForm.letterDate" type="date" /></label>
            <label class="grid gap-1 text-sm font-medium">Asal surat *<Input v-model="createForm.sender" maxlength="500" required /></label>
            <label class="grid gap-1 text-sm font-medium sm:col-span-2">Perihal *<Input v-model="createForm.subject" maxlength="500" required /></label>
            <label class="grid gap-1 text-sm font-medium sm:col-span-2">Isi disposisi<textarea v-model="createForm.disposition" maxlength="5000" rows="3" class="rounded-md border border-slate-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-blue-700" /></label>
            <label class="grid gap-1 text-sm font-medium">Tujuan disposisi<textarea v-model="createForm.dispositionTargets" maxlength="5000" rows="3" class="rounded-md border border-slate-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-blue-700" /></label>
            <label class="grid gap-1 text-sm font-medium">Keterangan / tanggal paraf<Input v-model="createForm.parafDateOrNote" maxlength="5000" /></label>
            <label class="grid gap-1 text-sm font-medium">Tautan berkas surat<Input v-model="createForm.letterFileReference" type="url" maxlength="2000" placeholder="https://..." /></label>
            <label class="grid gap-1 text-sm font-medium">Posisi surat<select v-model="createForm.letterPosition" class="h-11 rounded-md border border-slate-300 bg-white px-3"><option value="">Belum diisi</option><option v-for="option in allPositions.filter(value => value)" :key="option" :value="option">{{ option }}</option></select></label>
            <label class="grid gap-1 text-sm font-medium sm:col-span-2">Keterangan tindak lanjut<textarea v-model="createForm.followupNote" maxlength="5000" rows="3" class="rounded-md border border-slate-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-blue-700" /></label>
            <label class="grid gap-1 text-sm font-medium sm:col-span-2">Berkas / catatan tindak lanjut<Input v-model="createForm.followupReference" maxlength="5000" placeholder="URL HTTPS atau catatan" /></label>
            <p v-if="createError" class="text-sm text-red-800 sm:col-span-2" role="alert">{{ createError }}</p>
            <div v-if="duplicateCandidates.length" class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm sm:col-span-2">
              <p class="font-semibold">Periksa kemungkinan duplikat sebelum melanjutkan.</p>
              <ul class="mt-2 list-disc pl-5"><li v-for="candidate in duplicateCandidates" :key="candidate.agenda">{{ candidate.agenda }} / {{ candidate.letterNumber }} / {{ candidate.sender }} / {{ candidate.subject }}</li></ul>
            </div>
            <div class="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" :disabled="createBusy">{{ createBusy ? 'Menyimpan...' : 'Simpan surat' }}</Button>
              <Button v-if="duplicateCandidates.length" type="button" variant="outline" :disabled="createBusy" @click="submitCreate(true)">Tetap catat</Button>
              <Button type="button" variant="ghost" :disabled="createBusy" @click="showCreate = false">Batal</Button>
            </div>
          </form>
        </section>

        <section v-if="activeView === 'list' && detail" class="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="detail-title">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0"><h2 id="detail-title" class="break-words text-xl font-semibold">{{ detailLoading ? 'Memuat detail...' : display(detail.subject) }}</h2><p class="mt-1 text-sm text-slate-700">Nomor agenda: {{ display(detail.agenda) }}</p></div>
            <div class="flex gap-2">
              <Button v-if="role === 'WRITE' && !editingDetail && !detailLoading" variant="outline" @click="startEditing('full')">Edit</Button>
              <Button v-if="role === 'WRITE' && !editingDetail && !detailLoading" variant="ghost" @click="startEditing('quick')">Perbarui disposisi / tindak lanjut</Button>
              <Button variant="ghost" size="icon" aria-label="Tutup detail" @click="detail = null; cancelEditing()"><X class="h-5 w-5" aria-hidden="true" /></Button>
            </div>
          </div>
          <p v-if="detailError" class="mt-4 text-sm text-red-800" role="alert">{{ detailError }}</p>
          <form v-if="editingDetail && !detailLoading" class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="submitEdit">
            <label v-for="[key, label] in (editMode === 'quick' ? fields.filter(([key]) => ['disposition', 'dispositionTargets', 'parafDateOrNote', 'letterPosition', 'followupNote'].includes(key)) : fields.filter(([key]) => key !== 'documentDescription').concat([['letterFileReference', 'Tautan berkas surat'], ['followupReference', 'Berkas / catatan tindak lanjut']]))" :key="key" class="grid min-w-0 gap-1 text-sm font-semibold text-slate-800">
              {{ label }}
              <textarea v-if="['disposition', 'dispositionTargets', 'followupNote'].includes(key)" v-model="editForm[key]" maxlength="5000" rows="3" class="rounded-md border border-slate-300 px-3 py-2 font-normal focus-visible:ring-2 focus-visible:ring-blue-700" />
              <Input v-else-if="key === 'receivedDate' || key === 'letterDate'" v-model="editForm[key]" type="date" :required="key === 'receivedDate'" />
              <select v-else-if="key === 'letterPosition'" v-model="editForm[key]" class="h-11 rounded-md border border-slate-300 bg-white px-3 font-normal"><option value="">Belum diisi</option><option v-for="option in allPositions.filter(value => value)" :key="option" :value="option">{{ option }}</option></select>
              <Input v-else v-model="editForm[key]" :maxlength="key === 'letterNumber' || key === 'sender' || key === 'subject' ? 500 : 5000" :type="key === 'letterFileReference' ? 'url' : 'text'" />
            </label>
            <label v-if="editMode === 'full' && ['sender', 'letterNumber', 'letterDate', 'subject'].some(key => editForm[key] !== editBaseline[key])" class="flex items-start gap-2 text-sm sm:col-span-2"><input v-model="updateDescription" type="checkbox" class="mt-1"> Perbarui uraian berkas dari identitas surat</label>
            <p v-if="editError" class="text-sm text-red-800 sm:col-span-2" role="alert">{{ editError }}</p>
            <div class="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" :disabled="editBusy">{{ editBusy ? 'Menyimpan...' : 'Simpan perubahan' }}</Button>
              <Button type="button" variant="ghost" :disabled="editBusy" @click="cancelEditing">Batal</Button>
            </div>
          </form>
          <dl v-else-if="!detailLoading" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div v-for="[key, label] in fields" :key="key" class="min-w-0">
              <dt class="text-sm font-semibold text-slate-800">{{ label }}</dt>
              <dd class="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{{ display(detail[key]) }}</dd>
            </div>
            <div v-for="[key, label] in [['letterFileReference', 'Berkas surat'], ['followupReference', 'Berkas / catatan tindak lanjut']]" :key="key" class="min-w-0">
              <dt class="text-sm font-semibold text-slate-800">{{ label }}</dt>
              <dd class="mt-1 text-sm">
                <template v-if="detail.links?.[key]?.length">
                  <a v-for="link in detail.links[key]" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer" class="mr-3 inline-flex items-center gap-1 text-blue-800 underline underline-offset-2">{{ link.label || link.url }} <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" /></a>
                </template>
                <span v-else>{{ display(detail[key]) }}</span>
              </dd>
            </div>
          </dl>
        </section>
      </template>
    </main>
  </div>
</template>
