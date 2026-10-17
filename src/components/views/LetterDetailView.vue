<script setup>
import { ExternalLink, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const props = defineProps({ model: { type: Object, required: true } })
const { detail, detailLoading, display, role, editingDetail, editBusy, startEditing, closeDetail, detailError, editGroups, editMode, editLabels, editForm, allPositions, submitEdit, editBaseline, updateDescription, editError, cancelEditing } = props.model

function handleOpenChange(open) {
  if (!open) closeDetail()
}
</script>

<template>
  <Dialog :open="Boolean(detail)" @update:open="handleOpenChange">
    <DialogContent class="letter-dialog-content" :show-close-button="false" aria-describedby="detail-description">
      <DialogHeader class="letter-dialog-header">
        <div class="min-w-0">
          <DialogTitle id="detail-title" class="break-words text-xl font-semibold">{{ detailLoading ? 'Memuat detail...' : display(detail?.subject) }}</DialogTitle>
          <DialogDescription id="detail-description" class="mt-1 text-sm">Nomor agenda: {{ display(detail?.agenda) }}</DialogDescription>
        </div>
        <div class="detail-actions flex flex-wrap justify-end gap-2">
          <Button v-if="role === 'WRITE' && !editingDetail && !detailLoading" variant="outline" @click="startEditing('full')">Edit</Button>
          <Button v-if="role === 'WRITE' && !editingDetail && !detailLoading" variant="ghost" @click="startEditing('quick')">Perbarui disposisi / tindak lanjut</Button>
          <Button variant="ghost" size="icon" aria-label="Tutup detail" :disabled="editBusy" @click="closeDetail"><X class="h-5 w-5" aria-hidden="true" /></Button>
        </div>
      </DialogHeader>
      <div class="letter-dialog-scroll">
        <p v-if="detailError" class="text-sm text-red-800" role="alert">{{ detailError }}</p>
        <form v-if="editingDetail && !detailLoading" class="record-form letter-dialog-form" @submit.prevent="submitEdit">
          <fieldset v-for="group in editGroups.filter(group => editMode === 'full' || ['Disposisi', 'Posisi dan tindak lanjut'].includes(group.title))" :key="group.title" class="record-fields">
            <legend>{{ group.title }}</legend>
            <p class="form-group-guidance">{{ group.description }}</p>
            <div v-for="key in group.keys" :key="key" class="record-field grid min-w-0 gap-1 text-sm font-semibold text-slate-800">
              <label :for="`edit-${key}`">{{ editLabels[key] }}</label>
              <Textarea v-if="['disposition', 'dispositionTargets', 'followupNote'].includes(key)" :id="`edit-${key}`" v-model="editForm[key]" maxlength="5000" rows="3" class="rounded-md border border-border px-3 py-2 font-normal focus-visible:ring-2 focus-visible:ring-primary" />
              <Input v-else-if="key === 'receivedDate' || key === 'letterDate'" :id="`edit-${key}`" v-model="editForm[key]" type="date" :required="key === 'receivedDate'" />
              <div v-else-if="key === 'letterPosition'" class="flex items-center gap-2 font-normal"><Select v-model="editForm[key]"><SelectTrigger :id="`edit-${key}`" class="min-h-11 flex-1"><SelectValue placeholder="Belum diisi" /></SelectTrigger><SelectContent><SelectItem v-if="editForm[key] && !allPositions.includes(editForm[key])" :value="editForm[key]">{{ editForm[key] }} (nilai saat ini)</SelectItem><SelectItem v-for="option in allPositions.filter(value => value)" :key="option" :value="option">{{ option }}</SelectItem></SelectContent></Select><Button type="button" variant="ghost" size="sm" :disabled="!editForm[key]" @click="editForm[key] = ''">Kosongkan</Button></div>
              <Input v-else :id="`edit-${key}`" v-model="editForm[key]" :maxlength="key === 'letterNumber' || key === 'sender' || key === 'subject' ? 500 : 5000" :type="key === 'letterFileReference' ? 'url' : 'text'" />
            </div>
          </fieldset>
          <label v-if="editMode === 'full' && ['sender', 'letterNumber', 'letterDate', 'subject'].some(key => editForm[key] !== editBaseline[key])" class="flex items-start gap-2 text-sm"><input v-model="updateDescription" type="checkbox" class="mt-1"> Perbarui uraian berkas dari identitas surat</label>
          <p v-if="editError" class="text-sm text-red-800" role="alert">{{ editError }}</p>
          <div class="letter-dialog-actions">
            <Button type="submit" :disabled="editBusy">{{ editBusy ? 'Menyimpan...' : 'Simpan perubahan' }}</Button>
            <Button type="button" variant="ghost" :disabled="editBusy" @click="cancelEditing()">Batal</Button>
          </div>
        </form>
        <div v-else-if="!detailLoading" class="letter-detail-groups">
          <section v-for="group in editGroups" :key="group.title" class="letter-detail-group" :aria-labelledby="`detail-group-${group.title}`">
            <h3 :id="`detail-group-${group.title}`">{{ group.title }}</h3>
            <p class="form-group-guidance">{{ group.description }}</p>
            <dl class="letter-detail-fields">
              <div v-for="key in group.keys" :key="key" class="min-w-0">
                <dt>{{ editLabels[key] }}</dt>
                <dd v-if="!['letterFileReference', 'followupReference'].includes(key)" class="whitespace-pre-wrap break-words">{{ display(detail[key]) }}</dd>
                <dd v-else class="text-sm">
                  <template v-if="detail.links?.[key]?.length">
                    <a v-for="link in detail.links[key]" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer" class="mr-3 inline-flex items-center gap-1 text-primary underline underline-offset-2">{{ link.label || link.url }} <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" /></a>
                  </template>
                  <span v-else>{{ display(detail[key]) }}</span>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
