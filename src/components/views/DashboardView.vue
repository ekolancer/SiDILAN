<script setup>
import { CalendarDays, ClipboardList, FileText, Inbox, RotateCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const emit = defineEmits(['open-latest'])
const props = defineProps({ model: { type: Object, required: true } })
const { dashboardLoading, loadDashboard, role, email, dashboardError, dashboard, donutStyle, followupStatuses, classifiedTotal, trendWidth, trendMax, trendPoints, trendLabel, unitCounts, maxUnitCount, display } = props.model
</script>

<template>
        <section class="dashboard-view page-dashboard" aria-labelledby="dashboard-title">
          <div class="dashboard-heading flex flex-wrap items-center justify-between gap-3">
            <div><h1 id="dashboard-title" class="text-2xl font-semibold tracking-tight">Dashboard</h1><p class="dashboard-intro">Ringkasan surat masuk dan tindak lanjut dalam satu tampilan.</p></div>
            <Button variant="outline" :disabled="dashboardLoading" @click="loadDashboard"><RotateCw class="h-4 w-4" aria-hidden="true" /> Muat ulang</Button>
          </div>
          <section class="dashboard-welcome" aria-label="Sapaan">
            <div><p>Selamat datang<span v-if="role">, {{ role === 'WRITE' ? 'Administrator' : 'Viewer' }}</span><span v-if="email" class="welcome-email"> ({{ email }})</span></p><blockquote>“Setiap surat tercatat dengan baik, setiap tindak lanjut lebih terarah.”</blockquote></div>
          </section>
          <p v-if="dashboardError" class="mt-4 text-sm text-red-800" role="alert">{{ dashboardError }}</p>
          <div v-if="dashboardLoading" class="mt-6" role="status" aria-label="Memuat ringkasan surat"><p class="text-sm text-slate-700">Memuat ringkasan...</p><div class="skeleton-lines mt-4" aria-hidden="true"><span></span><span></span><span></span></div></div>
          <template v-if="dashboard">
            <p class="mt-2 text-sm text-slate-700">Data diperbarui {{ dashboard.loadedAt || '—' }} WIB</p>
            <dl class="summary-grid mt-6">
              <div class="metric-total"><dt><Inbox aria-hidden="true" /><span>Total Surat Masuk</span></dt><dd>{{ dashboard.total }}</dd></div>
              <div class="metric-month"><dt><CalendarDays aria-hidden="true" /><span>Surat Masuk Bulan ini (WIB)</span></dt><dd>{{ dashboard.receivedThisMonth }}</dd></div>
              <div class="metric-disposition"><dt><FileText aria-hidden="true" /><span>Disposisi</span></dt><dd>{{ dashboard.withDisposition }}</dd></div>
              <div class="metric-followup"><dt><ClipboardList aria-hidden="true" /><span>Tindak Lanjut</span></dt><dd>{{ dashboard.withFollowup }}</dd></div>
            </dl>
            <p v-if="dashboard.unreadableDates" class="mt-5 text-sm text-amber-900" role="status">{{ dashboard.unreadableDates }} tanggal diterima tidak dapat dibaca; tidak dihitung dalam tren.</p>
            <p v-if="dashboard.warningCount" class="mt-1 text-sm text-amber-900">{{ dashboard.warningCount }} baris dilewati karena data tidak dapat dibaca.</p>
            <div class="dashboard-charts mt-8">
              <section class="dashboard-panel" aria-labelledby="status-chart-title">
                <h2 id="status-chart-title" class="text-lg font-semibold">Status Tindak Lanjut</h2>
                <div class="donut-layout mt-5">
                  <div class="status-donut" :style="donutStyle" role="img" :aria-label="`Status tindak lanjut berdasarkan label catatan manual: ${followupStatuses.map(status => `${status.label} ${status.count}`).join(', ')}, tanpa label ${dashboard.unclassifiedStatus || 0}`"><div><strong>{{ classifiedTotal }}</strong><span>berstatus</span></div></div>
                  <dl class="status-legend"><div v-for="status in followupStatuses" :key="status.key"><dt :class="`status-${status.key}`">{{ status.label }}</dt><dd>{{ status.count }}</dd></div><div><dt>Tanpa label status</dt><dd>{{ dashboard.unclassifiedStatus || 0 }}</dd></div></dl>
                </div>
                <p class="chart-note mt-4">Status berasal dari label manual pada keterangan tindak lanjut; bukan verifikasi selesai atau perhitungan tenggat otomatis.</p>
              </section>
              <section class="dashboard-panel" aria-labelledby="trend-chart-title">
                <h2 id="trend-chart-title" class="text-lg font-semibold">Tren surat</h2>
                <div class="trend-key mt-4"><span class="incoming-key">Surat Masuk</span><span v-if="!dashboard.outgoingUnavailable" class="outgoing-key">Surat Keluar</span></div>
                <div v-if="dashboard.trend?.length" class="trend-scroll mt-3" tabindex="0" role="region" aria-label="Grafik tren surat berdasarkan bulan dari register, geser untuk melihat seluruh bulan">
                  <svg class="trend-svg" :viewBox="`0 0 ${trendWidth} 215`" :style="{ width: `${trendWidth}px` }" role="img" aria-label="Tren bulanan surat masuk dan surat keluar; angka lengkap tersedia pada tabel di bawah">
                    <path v-for="line in [38, 103, 168]" :key="line" :d="`M 40 ${line} H ${trendWidth - 28}`" class="trend-gridline" />
                    <text x="8" y="42" class="trend-axis">{{ trendMax }}</text><text x="8" y="172" class="trend-axis">0</text>
                    <polyline :points="trendPoints('incoming')" class="trend-incoming" />
                    <polyline v-if="!dashboard.outgoingUnavailable" :points="trendPoints('outgoing')" class="trend-outgoing" />
                    <g v-for="(month, index) in dashboard.trend" :key="month.month"><circle :cx="40 + index * 48" :cy="168 - month.incoming / trendMax * 130" r="3.5" class="trend-dot-incoming" /><circle v-if="!dashboard.outgoingUnavailable" :cx="40 + index * 48" :cy="168 - month.outgoing / trendMax * 130" r="3.5" class="trend-dot-outgoing" /><text :x="40 + index * 48" y="195" class="trend-month">{{ trendLabel(month.month) }}</text></g>
                  </svg>
                </div>
                <p v-else class="chart-note mt-3">Belum ada tanggal diterima yang dapat dikelompokkan per bulan.</p>
                <details v-if="dashboard.trend?.length" class="trend-data"><summary>Lihat angka per bulan</summary><table><thead><tr><th scope="col">Bulan</th><th scope="col">Masuk</th><th scope="col">Keluar</th></tr></thead><tbody><tr v-for="month in dashboard.trend" :key="month.month"><th scope="row">{{ trendLabel(month.month) }}</th><td>{{ month.incoming }}</td><td>{{ month.outgoing ?? 'Belum tersedia' }}</td></tr></tbody></table></details>
              </section>
              <section class="dashboard-panel" aria-labelledby="units-chart-title">
                <h2 id="units-chart-title" class="text-lg font-semibold">Unit Kerja Tujuan</h2>
                <p v-if="!unitCounts.length" class="empty-state mt-4 text-sm">Belum ada unit tujuan yang dicatat.</p>
                <ol v-else class="unit-bars mt-5"><li v-for="unit in unitCounts" :key="unit.label"><span class="unit-label" :title="unit.label">{{ unit.label }}</span><div class="unit-track"><span class="unit-fill" :style="{ width: `${unit.count / maxUnitCount * 100}%` }"></span></div><strong>{{ unit.count }}</strong></li></ol>
                <p v-if="dashboard.unitCounts?.length > 8" class="chart-note mt-4">Menampilkan 8 Unit Kerja dengan jumlah terbanyak.</p>
              </section>
            </div>
            <div class="dashboard-columns mt-5">
              <section class="dashboard-panel latest-panel" aria-labelledby="latest-title">
                <h2 id="latest-title" class="text-lg font-semibold">Surat Masuk Terbaru</h2>
                <p v-if="!dashboard.latest?.length" class="empty-state mt-3 text-sm text-slate-700">Belum ada surat dalam daftar terbaru.</p>
                <div v-else class="latest-scroll mt-4" tabindex="0" role="region" aria-label="Pencatatan terbaru, geser untuk melihat semua kolom">
                  <table class="latest-table">
                    <thead><tr><th scope="col">Agenda</th><th scope="col">Tanggal diterima</th><th scope="col">Asal surat</th><th scope="col">Perihal</th><th scope="col">Tujuan disposisi</th></tr></thead>
                    <tbody><tr v-for="record in dashboard.latest" :key="`${record.rowHint}-${record.agenda}`"><th scope="row"><Button variant="ghost" size="sm" class="latest-agenda" :aria-label="`Buka detail agenda ${display(record.agenda)}`" @click="emit('open-latest', record)">{{ display(record.agenda) }}</Button></th><td>{{ display(record.receivedDate) }}</td><td>{{ display(record.sender) }}</td><td>{{ display(record.subject) }}</td><td>{{ display(record.dispositionTargets) }}</td></tr></tbody>
                  </table>
                </div>
              </section>
            </div>
          </template>
        </section>
</template>
