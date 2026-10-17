<script setup>
import { ChevronLeft, ChevronRight, RotateCw, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MultiSelect from '@/components/ui/MultiSelect.vue'

const props = defineProps({ model: { type: Object, required: true } })
const { role, openCreate, keyword, listLoading, search, selectedPositions, positionOptions, selectedSender, allSenders, selectedTargets, targetOptions, resetSearch, saveNotice, appliedListQuery, listIsCurrent, warningCount, listError, records, emptyMessage, display, total, page, pageSize, changePageSize, pageNumbers, goToPage, pageCount, openDetail, openEdit } = props.model
</script>

<template>
        <section class="workspace-panel page-list rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h1 class="text-2xl font-semibold tracking-tight">Daftar Surat Masuk</h1>
            <Button v-if="role === 'WRITE'" @click="openCreate">Tambah surat</Button>
          </div>
          <form class="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]" role="search" @submit.prevent="search()">
            <label class="sr-only" for="keyword">Kata kunci pencarian</label>
            <Input id="keyword" v-model="keyword" maxlength="200" placeholder="Cari agenda, nomor surat, asal, atau perihal" autocomplete="off" />
            <Button type="submit" :disabled="listLoading"><Search class="h-4 w-4" aria-hidden="true" /> Cari</Button>
          </form>

          <div class="list-filter-row mt-4">
            <label class="grid gap-1 text-sm font-medium">Posisi Surat<MultiSelect v-model="selectedPositions" :options="positionOptions" aria-label="Filter posisi surat" placeholder="Pilih salah satu" /></label>
            <label class="grid gap-1 text-sm font-medium">Asal Surat<Select v-model="selectedSender"><SelectTrigger class="w-full"><SelectValue placeholder="Pilih salah satu" /></SelectTrigger><SelectContent><SelectItem v-for="sender in allSenders" :key="sender" :value="sender">{{ sender }}</SelectItem></SelectContent></Select></label>
            <label class="grid gap-1 text-sm font-medium">Tujuan Dispo<MultiSelect v-model="selectedTargets" :options="targetOptions" aria-label="Filter tujuan disposisi" placeholder="Pilih salah satu" /></label>
            <div class="list-filter-actions"><Button variant="outline" @click="resetSearch">Reset filter</Button><Button variant="outline" :disabled="listLoading" @click="search(false)"><RotateCw class="h-4 w-4" aria-hidden="true" /> Muat ulang</Button></div>
          </div>

          <p v-if="saveNotice" class="mt-4 text-sm text-emerald-800" role="status" aria-live="polite">{{ saveNotice }}</p>
          <p v-if="!listLoading && !listError && appliedListQuery !== null && !listIsCurrent" class="mt-4 text-sm text-amber-900" role="status">Filter berubah. Tekan Cari atau Muat ulang untuk menampilkan hasil yang sesuai.</p>
          <p v-if="warningCount" class="mt-4 text-sm text-amber-900" role="status">{{ warningCount }} baris dilewati karena data tidak dapat dibaca.</p>
          <p v-if="listError" class="mt-4 text-sm text-red-800" role="alert">{{ listError }}</p>
          <div v-else-if="listLoading" class="mt-6" role="status" aria-label="Memuat daftar surat" aria-live="polite"><p class="text-sm text-slate-700">Memuat daftar surat...</p><div class="skeleton-lines mt-4" aria-hidden="true"><span></span><span></span><span></span></div></div>
          <p v-else-if="listIsCurrent && records.length" class="mt-4 text-sm text-slate-700" role="status" aria-live="polite">{{ emptyMessage }}</p>
          <div v-if="!listLoading && !listError && listIsCurrent && !records.length" class="empty-state mt-6">
            <Search class="h-6 w-6" aria-hidden="true" />
            <p class="mt-3 font-semibold">Tidak ada surat ditemukan</p>
            <p class="mt-1 max-w-prose text-sm text-slate-700">Ubah kata kunci atau filter, lalu coba kembali.</p>
            <Button v-if="keyword || selectedPositions.length || selectedSender || selectedTargets.length" variant="outline" class="mt-4" @click="resetSearch">Reset filter</Button>
          </div>

          <div v-if="!listLoading && !listError && listIsCurrent && records.length" class="report-scroll list-register-scroll mt-4" tabindex="0" role="region" aria-label="Daftar surat masuk">
            <table class="report-table list-register-table">
              <thead><tr><th scope="col">Nomor agenda</th><th scope="col">Aksi</th><th scope="col">Tanggal surat</th><th scope="col">Asal surat</th><th scope="col">Perihal</th><th scope="col">Tujuan disposisi</th></tr></thead>
              <tbody><tr v-for="record in records" :key="`${record.rowHint}-${record.agenda}`">
                <th scope="row" class="font-semibold tabular-nums">{{ display(record.agenda) }}</th>
                <td><div class="list-row-actions"><Button variant="outline" size="sm" :aria-label="`Lihat agenda ${display(record.agenda)}`" @click="openDetail(record)">Lihat</Button><Button v-if="role === 'WRITE'" size="sm" :aria-label="`Edit agenda ${display(record.agenda)}`" @click="openEdit(record)">Edit</Button></div></td>
                <td>{{ display(record.letterDate) }}</td>
                <td>{{ display(record.sender) }}</td>
                <td>{{ display(record.subject) }}</td>
                <td>{{ display(record.dispositionTargets) }}</td>
              </tr></tbody>
            </table>
          </div>

          <nav v-if="!listLoading && !listError && listIsCurrent && total > 0" class="list-pagination mt-6" aria-label="Paginasi daftar surat">
            <p class="pagination-summary" role="status">Menampilkan {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, total) }} dari {{ total }} surat</p>
            <div class="pagination-controls">
              <label class="page-size-control">Baris per halaman<select :value="pageSize" aria-label="Jumlah baris per halaman" @change="changePageSize"><option :value="10">10</option><option :value="50">50</option><option :value="100">100</option></select></label>
              <div class="page-buttons">
                <Button variant="outline" class="page-step" :disabled="page <= 1 || listLoading" aria-label="Halaman sebelumnya" @click="goToPage(page - 1)"><ChevronLeft class="h-4 w-4" aria-hidden="true" /></Button>
                <Button v-for="pageNumber in pageNumbers" :key="pageNumber" variant="ghost" class="page-number" :class="{ 'is-active': page === pageNumber }" :aria-current="page === pageNumber ? 'page' : undefined" :disabled="listLoading" @click="goToPage(pageNumber)">{{ pageNumber }}</Button>
                <Button variant="outline" class="page-step" :disabled="page >= pageCount || listLoading" aria-label="Halaman berikutnya" @click="goToPage(page + 1)"><ChevronRight class="h-4 w-4" aria-hidden="true" /></Button>
              </div>
            </div>
          </nav>
        </section>
</template>
