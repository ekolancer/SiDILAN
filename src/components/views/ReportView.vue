<script setup>
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MultiSelect from '@/components/ui/MultiSelect.vue'

const props = defineProps({ model: { type: Object, required: true } })
const { reportKeyword, fromDate, toDate, reportPositions, positionOptions, reportSender, reportSenders, reportTarget, reportTargets, resetReportFilters, reportLoading, loadReport, reportError, report, reportIsCurrent, includeUrls, printReport, exportReport, reportListColumns, formatPosition, reportRows, display, reportPageSize, reportPage, reportPageCount } = props.model
</script>

<template>
        <section class="workspace-panel report-section page-report rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="report-title">
          <div class="report-controls">
            <h1 id="report-title" class="text-2xl font-semibold tracking-tight">Rekap Surat Masuk</h1>
            <form class="report-filter-form mt-5 grid gap-4" @submit.prevent="loadReport">
              <label class="grid gap-1 text-sm font-medium">Kata kunci (opsional)<Input v-model="reportKeyword" maxlength="200" placeholder="Agenda, nomor surat, asal, atau perihal" /></label>
              <div class="report-filter-row">
                <label class="grid gap-1 text-sm font-medium">Dari tanggal<Input v-model="fromDate" type="date" :max="toDate || undefined" /></label>
                <label class="grid gap-1 text-sm font-medium">Sampai tanggal<Input v-model="toDate" type="date" :min="fromDate || undefined" /></label>
                <label class="grid gap-1 text-sm font-medium">Posisi surat<MultiSelect v-model="reportPositions" :options="positionOptions" aria-label="Filter posisi rekap" placeholder="Pilih salah satu" /></label>
                <label class="grid gap-1 text-sm font-medium">Asal Surat<Select v-model="reportSender"><SelectTrigger class="w-full"><SelectValue placeholder="Pilih salah satu" /></SelectTrigger><SelectContent><SelectItem v-for="sender in reportSenders" :key="sender" :value="sender">{{ sender }}</SelectItem></SelectContent></Select></label>
                <label class="grid gap-1 text-sm font-medium">Tujuan Dispo<Select v-model="reportTarget"><SelectTrigger class="w-full"><SelectValue placeholder="Pilih salah satu" /></SelectTrigger><SelectContent><SelectItem v-for="target in reportTargets" :key="target" :value="target">{{ target }}</SelectItem></SelectContent></Select></label>
                <Button type="button" variant="outline" class="report-reset" @click="resetReportFilters">Reset filter</Button>
              </div>
              <div class="flex flex-wrap items-center gap-3"><Button type="submit" :disabled="reportLoading">{{ reportLoading ? 'Memuat...' : 'Tampilkan rekap' }}</Button><p class="text-sm text-slate-700">Kata kunci boleh kosong untuk semua surat pada posisi terpilih.</p></div>
            </form>
            <p v-if="reportError" class="mt-4 text-sm text-red-800" role="alert">{{ reportError }}</p>
            <div v-if="reportLoading" class="mt-6" role="status" aria-label="Memuat rekap"><p class="text-sm text-slate-700">Memuat rekap...</p><div class="skeleton-lines mt-4" aria-hidden="true"><span></span><span></span><span></span></div></div>
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
              <h2>Rekap Surat Masuk</h2>
              <p>Dibuat {{ report.generatedAt || '—' }} WIB · {{ report.total }} surat</p>
              <p>Filter: {{ report.filters?.keyword || 'Semua kata kunci' }} · {{ report.filters?.fromDate || 'Awal' }} sampai {{ report.filters?.toDate || 'Akhir' }} · Posisi: {{ report.filters?.positions?.map(formatPosition).join(', ') || 'Tidak ada' }} · Asal: {{ report.filters?.sender || 'Semua' }} · Tujuan: {{ report.filters?.dispositionTarget || 'Semua' }}</p>
            </div>
            <p class="mt-5 text-sm text-slate-700" role="status">{{ report.total }} surat dalam rekap. <span v-if="report.unreadableDates">{{ report.unreadableDates }} tanggal tak terbaca tidak masuk periode.</span><span v-if="report.warningCount"> {{ report.warningCount }} baris dilewati karena data tidak dapat dibaca.</span></p>
            <div v-if="report.records.length" class="report-scroll report-screen-table mt-4" tabindex="0" role="region" aria-label="Pratinjau rekap 8 kolom, geser untuk melihat semua kolom">
              <table class="report-table">
                <thead><tr><th v-for="[key, label] in reportListColumns" :key="key" scope="col">{{ label }}</th></tr></thead>
                <tbody><tr v-for="record in reportRows" :key="`${record.rowHint}-${record.agenda}`"><td v-for="[key] in reportListColumns" :key="key">{{ display(record[key]) }}</td></tr></tbody>
              </table>
            </div>
            <nav v-if="report.records.length > reportPageSize" class="report-pagination mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden" aria-label="Paginasi rekap surat">
              <Button variant="outline" :disabled="reportPage === 1" @click="reportPage--"><ChevronLeft class="h-4 w-4" aria-hidden="true" /> Sebelumnya</Button>
              <span class="text-sm text-slate-700">Halaman {{ reportPage }} dari {{ reportPageCount }}</span>
              <Button variant="outline" :disabled="reportPage === reportPageCount" @click="reportPage++">Berikutnya <ChevronRight class="h-4 w-4" aria-hidden="true" /></Button>
            </nav>
            <div v-if="report.records.length" class="report-scroll report-print-table" aria-hidden="true">
              <table class="report-table">
                <thead><tr><th v-for="[key, label] in reportListColumns" :key="key" scope="col">{{ label }}</th></tr></thead>
                <tbody><tr v-for="record in report.records" :key="`${record.rowHint}-${record.agenda}`"><td v-for="[key] in reportListColumns" :key="key">{{ display(record[key]) }}</td></tr></tbody>
              </table>
            </div>
            <div v-if="!report.records.length" class="empty-state mt-5"><p class="font-semibold">Rekap kosong</p><p class="mt-1 text-sm text-slate-700">Ubah periode atau posisi surat, lalu tampilkan rekap lagi.</p></div>
          </template>
        </section>
</template>
