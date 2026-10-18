<script setup>
import { X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const props = defineProps({ model: { type: Object, required: true } })
const { showCreate, createBusy, closeCreate, createForm, submitCreate, allPositions, createError, duplicateCandidates, editGroups } = props.model

function handleOpenChange(open) {
  if (!open) closeCreate()
}
</script>

<template>
  <Dialog :open="showCreate" @update:open="handleOpenChange">
    <DialogContent class="letter-dialog-content" :show-close-button="false" aria-describedby="create-description">
      <DialogHeader class="letter-dialog-header">
        <div class="letter-dialog-title-row">
          <div class="min-w-0">
            <DialogTitle id="create-title" class="text-xl font-semibold">Pencatatan surat baru</DialogTitle>
            <DialogDescription id="create-description" class="mt-1 text-sm text-muted-foreground">Nomor agenda dibuat otomatis saat disimpan.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" class="letter-dialog-close" aria-label="Tutup formulir" :disabled="createBusy" @click="closeCreate"><X class="h-5 w-5" aria-hidden="true" /></Button>
        </div>
      </DialogHeader>
      <div class="letter-dialog-scroll">
        <form class="record-form letter-dialog-form" @submit.prevent="submitCreate()">
          <fieldset v-for="group in editGroups" :key="group.title" class="record-fields">
            <legend>{{ group.title }}</legend>
            <p class="form-group-guidance">{{ group.description }}</p>
            <template v-if="group.title === 'Identitas surat'">
              <label class="grid gap-1 text-sm font-medium">Tanggal diterima *<Input v-model="createForm.receivedDate" type="date" required /></label>
              <label class="grid gap-1 text-sm font-medium">Nomor surat *<Input v-model="createForm.letterNumber" maxlength="500" required /></label>
              <label class="grid gap-1 text-sm font-medium">Tanggal surat<Input v-model="createForm.letterDate" type="date" /></label>
              <label class="grid gap-1 text-sm font-medium">Asal surat *<Input v-model="createForm.sender" maxlength="500" required /></label>
              <label class="grid gap-1 text-sm font-medium">Perihal *<Input v-model="createForm.subject" maxlength="500" required /></label>
            </template>
            <template v-else-if="group.title === 'Disposisi'">
              <label class="grid gap-1 text-sm font-medium">Isi disposisi<Textarea v-model="createForm.disposition" maxlength="5000" rows="3" class="rounded-md border border-border px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary" /></label>
              <label class="grid gap-1 text-sm font-medium">Tujuan disposisi<Textarea v-model="createForm.dispositionTargets" maxlength="5000" rows="3" class="rounded-md border border-border px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary" /></label>
              <label class="grid gap-1 text-sm font-medium">Keterangan / tanggal paraf<Input v-model="createForm.parafDateOrNote" maxlength="5000" /></label>
            </template>
            <template v-else-if="group.title === 'Posisi dan tindak lanjut'">
              <div class="record-field grid gap-1 text-sm font-medium"><label for="create-position">Posisi surat</label><div class="flex items-center gap-2"><Select v-model="createForm.letterPosition"><SelectTrigger id="create-position" class="min-h-11 flex-1"><SelectValue placeholder="Belum diisi" /></SelectTrigger><SelectContent><SelectItem v-for="option in allPositions.filter(value => value)" :key="option" :value="option">{{ option }}</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="sm" :disabled="!createForm.letterPosition" @click="createForm.letterPosition = ''">Kosongkan</Button></div></div>
              <label class="grid gap-1 text-sm font-medium">Keterangan tindak lanjut<Textarea v-model="createForm.followupNote" maxlength="5000" rows="3" class="rounded-md border border-border px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary" /></label>
            </template>
            <template v-else>
              <label class="grid gap-1 text-sm font-medium">Tautan berkas surat<Input v-model="createForm.letterFileReference" type="url" maxlength="2000" placeholder="https://..." /></label>
              <label class="grid gap-1 text-sm font-medium">Berkas / catatan tindak lanjut<Input v-model="createForm.followupReference" maxlength="5000" placeholder="URL HTTPS atau catatan" /></label>
            </template>
          </fieldset>
          <p v-if="createError" class="text-sm text-red-800" role="alert">{{ createError }}</p>
          <div v-if="duplicateCandidates.length" class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p class="font-semibold">Periksa kemungkinan duplikat sebelum melanjutkan.</p>
            <ul class="mt-2 list-disc pl-5"><li v-for="candidate in duplicateCandidates" :key="candidate.agenda">{{ candidate.agenda }} / {{ candidate.letterNumber }} / {{ candidate.sender }} / {{ candidate.subject }}</li></ul>
          </div>
          <div class="letter-dialog-actions">
            <Button type="submit" :disabled="createBusy">{{ createBusy ? 'Menyimpan...' : 'Simpan surat' }}</Button>
            <Button v-if="duplicateCandidates.length" type="button" variant="outline" :disabled="createBusy" @click="submitCreate(true)">Tetap catat</Button>
            <Button type="button" variant="ghost" :disabled="createBusy" @click="closeCreate">Batal</Button>
          </div>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>
