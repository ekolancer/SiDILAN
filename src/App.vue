<script setup>
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, ExternalLink, RotateCw, Search, X } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import { callAppsScript } from '@/services/appsScript'

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
let requestId = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const positionOptions = computed(() => allPositions.value.map(value => ({ value, label: value || 'Belum diisi' })))
const fields = [
  ['receivedDate', 'Tanggal diterima'], ['letterNumber', 'Nomor surat'], ['letterDate', 'Tanggal surat'],
  ['sender', 'Asal surat'], ['subject', 'Perihal'], ['documentDescription', 'Uraian berkas'],
  ['disposition', 'Isi disposisi'], ['dispositionTargets', 'Tujuan disposisi'],
  ['parafDateOrNote', 'Keterangan / tanggal paraf'], ['letterPosition', 'Posisi surat'],
  ['followupNote', 'Keterangan tindak lanjut'],
]

async function loadInitial() {
  loadingStatus.value = true
  statusError.value = ''
  try {
    const result = await callAppsScript('getAppStatus')
    if (!result?.success) throw new Error(result?.message || 'Akses tidak dapat diverifikasi.')
    email.value = result.email
    role.value = result.role
    await loadPositions()
  } catch (error) {
    statusError.value = error.message === 'APPS_SCRIPT_UNAVAILABLE'
      ? 'Aplikasi harus dibuka melalui deployment Google Apps Script.'
      : error.message || 'Status akses gagal diperiksa.'
  } finally {
    loadingStatus.value = false
  }
}

async function loadPositions() {
  try {
    const result = await callAppsScript('getInitialData')
    if (!result?.success) throw new Error(result?.message || 'Data awal tidak dapat dimuat.')
    allPositions.value = result.positions || []
    positions.value = [...allPositions.value]
    warningCount.value = result.warningCount || 0
  } catch (error) {
    listError.value = error.message || 'Data awal gagal dimuat.'
  }
}

async function search(resetPage = true) {
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
  detail.value = null
  try {
    const result = await callAppsScript('getSuratMasuk', {
      keyword: trimmed,
      positions: [...positions.value],
      page: page.value,
    })
    if (currentRequest !== requestId) return
    if (!result?.success) throw new Error(result?.message || 'Daftar surat tidak dapat dimuat.')
    records.value = result.records || []
    total.value = result.total || 0
    page.value = result.page || 1
    pageSize.value = result.pageSize || 50
    allPositions.value = result.positions || allPositions.value
    warningCount.value = result.warningCount || 0
    emptyMessage.value = total.value ? `${total.value} pencatatan ditemukan.` : 'Tidak ada data yang cocok.'
  } catch (error) {
    if (currentRequest === requestId) listError.value = error.message || 'Daftar surat gagal dimuat.'
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
    if (!result?.success) throw new Error(result?.message || 'Detail tidak dapat dimuat.')
    detail.value = result.record
  } catch (error) {
    detailError.value = error.message || 'Detail gagal dimuat. Muat ulang daftar.'
  } finally {
    detailLoading.value = false
  }
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
      <p v-if="email" class="mb-4 text-sm text-slate-700">{{ email }}</p>

      <section v-if="loadingStatus" class="rounded-xl border border-slate-200 bg-white p-6" role="status" aria-live="polite">
        Memeriksa akses akun Google...
      </section>
      <section v-else-if="statusError" class="rounded-xl border border-red-200 bg-white p-6" role="alert">
        <h1 class="text-lg font-semibold">Akses aplikasi belum tersedia</h1>
        <p class="mt-2 text-sm text-red-800">{{ statusError }}</p>
        <Button class="mt-4" @click="loadInitial">Coba lagi</Button>
      </section>

      <template v-else>
        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 class="text-2xl font-semibold tracking-tight">Daftar surat masuk</h1>
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

        <section v-if="detail" class="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="detail-title">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0"><h2 id="detail-title" class="break-words text-xl font-semibold">{{ detailLoading ? 'Memuat detail...' : display(detail.subject) }}</h2><p class="mt-1 text-sm text-slate-700">Nomor agenda: {{ display(detail.agenda) }}</p></div>
            <Button variant="ghost" size="icon" aria-label="Tutup detail" @click="detail = null"><X class="h-5 w-5" aria-hidden="true" /></Button>
          </div>
          <p v-if="detailError" class="mt-4 text-sm text-red-800" role="alert">{{ detailError }}</p>
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
