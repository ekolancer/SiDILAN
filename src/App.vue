<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { CircleHelp, FileChartColumn, Inbox, LayoutDashboard, Search, Settings, UserRound } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DashboardView from '@/components/views/DashboardView.vue'
import LetterListView from '@/components/views/LetterListView.vue'
import LetterCreateView from '@/components/views/LetterCreateView.vue'
import LetterDetailView from '@/components/views/LetterDetailView.vue'
import ReportView from '@/components/views/ReportView.vue'
import { useLetters } from '@/composables/useLetters.js'
import { useDashboard } from '@/composables/useDashboard.js'
import { useReport } from '@/composables/useReport.js'
import { letterApi } from '@/services/appsScript.js'

const loadingStatus = ref(true)
const statusError = ref('')
const email = ref('')
const role = ref('')
const activeView = ref('dashboard')
const jakartaClock = ref('')
const globalSearchInput = ref(null)
const letters = useLetters(letterApi, role)
const dashboardState = useDashboard(letterApi)
const reportState = useReport(letterApi, letters.allPositions, letters.reportColumns)
const model = { ...letters, ...dashboardState, ...reportState, role, email }
let clockTimer = null

async function loadInitial() {
  loadingStatus.value = true
  statusError.value = ''
  try {
    const result = await letterApi.getStartupData({ page: 1, pageSize: letters.pageSize.value, keyword: '' })
    if (!result?.success) {
      statusError.value = result?.message || 'Akses tidak dapat diverifikasi.'
      return
    }
    email.value = result.initialData.email
    role.value = result.initialData.role
    applyPositions(result.initialData)
    letters.setList(result.list)
    dashboardState.setDashboard(result.dashboard)
  } catch (error) {
    statusError.value = error.message === 'APPS_SCRIPT_UNAVAILABLE'
      ? 'Aplikasi harus dibuka melalui deployment Google Apps Script.'
      : 'Status akses gagal diperiksa. Coba lagi.'
  } finally {
    loadingStatus.value = false
  }
}

function applyPositions(result) {
  letters.allPositions.value = result.positions || []
  letters.allSenders.value = result.senders || []
  letters.allTargets.value = result.targets || []
  reportState.reportPositions.value = [...letters.allPositions.value]
  reportState.reportSenders.value = letters.allSenders.value
  reportState.reportTargets.value = letters.allTargets.value
  letters.warningCount.value = result.warningCount || 0
}

function switchView(view) {
  if (activeView.value === view) return true
  if (!letters.confirmDiscard()) return false
  letters.closeForNavigation()
  activeView.value = view
  if (view === 'dashboard') dashboardState.loadDashboard()
  return true
}

function openSearchResults() {
  if (switchView('list')) nextTick(() => letters.search())
}

async function openLatestDetail(record) {
  if (!switchView('list')) return
  await nextTick()
  await letters.openDetail(record)
}

function updateJakartaClock() {
  jakartaClock.value = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(new Date())
}

function handleGlobalShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    globalSearchInput.value?.$el?.focus()
  }
}

onMounted(() => {
  updateJakartaClock()
  clockTimer = setInterval(updateJakartaClock, 1000)
  window.addEventListener('keydown', handleGlobalShortcut)
  loadInitial()
})
onUnmounted(() => {
  clearInterval(clockTimer)
  window.removeEventListener('keydown', handleGlobalShortcut)
})
</script>

<template>
  <div class="app-shell min-h-dvh">
    <a class="skip-link" href="#main-content">Lewati ke konten utama</a>
    <aside class="app-sidebar print:hidden" aria-label="Menu SiDILAN">
      <div class="sidebar-brand"><span class="brand-mark" aria-hidden="true">S</span><p class="app-wordmark">SiDILAN</p></div>
      <p class="nav-heading">Ruang kerja</p>
      <nav v-if="!loadingStatus && !statusError" class="app-nav" aria-label="Navigasi utama">
        <Button v-for="view in [['dashboard', 'Dashboard', LayoutDashboard], ['list', 'Daftar Surat Masuk', Inbox], ['report', 'Rekap Surat Masuk', FileChartColumn]]" :key="view[0]" variant="ghost" class="app-nav-link" :class="{ 'is-current': activeView === view[0] }" :aria-current="activeView === view[0] ? 'page' : undefined" @click="switchView(view[0])"><component :is="view[2]" aria-hidden="true" />{{ view[1] }}</Button>
      </nav>
      <div class="sidebar-utilities print:hidden" aria-label="Menu tambahan">
        <p class="sidebar-caption">Sistem Digital Monitoring<br>Tindak Lanjut Surat</p>
        <Button variant="ghost" class="sidebar-utility" disabled aria-disabled="true" aria-label="Pengaturan, belum tersedia" title="Pengaturan belum tersedia"><Settings aria-hidden="true" /><span>Pengaturan</span></Button>
        <Button variant="ghost" class="sidebar-utility" disabled aria-disabled="true" aria-label="Bantuan, belum tersedia" title="Bantuan belum tersedia"><CircleHelp aria-hidden="true" /><span>Bantuan</span></Button>
      </div>
    </aside>
    <header class="app-header app-topbar print:hidden">
      <div class="app-header-inner">
        <form v-if="!loadingStatus && !statusError" class="global-search" role="search" @submit.prevent="openSearchResults">
          <Search class="global-search-icon" aria-hidden="true" />
          <Input ref="globalSearchInput" v-model="letters.keyword.value" maxlength="200" placeholder="Cari nomor surat, perihal, atau unit..." aria-label="Cari surat masuk" autocomplete="off" />
          <kbd class="search-shortcut" aria-hidden="true">Ctrl K</kbd>
          <Button type="submit" variant="ghost" class="global-search-submit" aria-label="Cari surat"><Search aria-hidden="true" /></Button>
        </form>
        <div class="app-header-tools">
          <time class="jakarta-clock" :datetime="new Date().toISOString()" aria-label="Waktu saat ini di WIB"><strong>{{ jakartaClock }}</strong><span class="clock-zone">WIB</span></time>
          <div v-if="role" class="app-account" :aria-label="`${role === 'WRITE' ? 'Administrator' : 'Viewer'}${email ? `, ${email}` : ''}`">
            <span class="account-avatar" aria-hidden="true"><UserRound /></span>
          </div>
        </div>
      </div>
    </header>

    <main id="main-content" class="app-main" tabindex="-1">

      <section v-if="loadingStatus" class="workspace-panel rounded-xl border border-slate-200 bg-white p-6" role="status" aria-live="polite" aria-label="Memeriksa akses akun Google">
        <p class="text-sm font-medium text-slate-700">Memeriksa akses akun Google...</p>
        <div class="skeleton-lines mt-6" aria-hidden="true"><span></span><span></span><span></span></div>
      </section>
      <section v-else-if="statusError" class="rounded-xl border border-red-200 bg-white p-6" role="alert">
        <h1 class="text-lg font-semibold">Akses aplikasi belum tersedia</h1>
        <p class="mt-2 text-sm text-red-800">{{ statusError }}</p>
        <Button class="mt-4" @click="loadInitial">Coba lagi</Button>
      </section>

      <template v-else>
        <DashboardView v-if="activeView === 'dashboard'" :model="model" @open-latest="openLatestDetail" />
        <ReportView v-if="activeView === 'report'" :model="model" />
        <LetterListView v-if="activeView === 'list'" :model="model" />
        <LetterCreateView v-if="activeView === 'list' && letters.showCreate.value" :model="model" />
        <LetterDetailView v-if="activeView === 'list' && letters.detail.value" :model="model" />
      </template>
    </main>
  </div>
</template>
