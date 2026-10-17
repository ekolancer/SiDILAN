import { computed, ref } from 'vue'
import { fields, editGroups, editLabels, reportColumns, display } from '../lib/letterFields.js'

export function useLetters(api, role) {
  const selectedPositions = ref([])
  const selectedTargets = ref([])
  const selectedSender = ref('')
  const allPositions = ref([])
  const allSenders = ref([])
  const allTargets = ref([])
  const keyword = ref('')
  const listLoading = ref(false)
  const listError = ref('')
  const appliedListQuery = ref(null)
  const saveNotice = ref('')
  const emptyMessage = ref('Masukkan kata kunci pencarian.')
  const records = ref([])
  const total = ref(0)
  const warningCount = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const pageNumbers = computed(() => {
    if (pageCount.value <= 7) return Array.from({ length: pageCount.value }, (_, index) => index + 1)
    const start = page.value <= 4 ? 1 : page.value >= pageCount.value - 3 ? pageCount.value - 4 : page.value - 2
    return Array.from({ length: 5 }, (_, index) => start + index)
  })
  const positionOptions = computed(() => allPositions.value.map(value => ({ value, label: value || 'Belum diisi' })))
  const targetOptions = computed(() => allTargets.value.map(value => ({ value, label: value })))
  const listQuery = computed(() => JSON.stringify({ keyword: keyword.value.trim(), positions: selectedPositions.value, sender: selectedSender.value, targets: selectedTargets.value }))
  const listIsCurrent = computed(() => appliedListQuery.value === listQuery.value)

  const detail = ref(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const editingDetail = ref(false)
  const editBusy = ref(false)
  const editError = ref('')
  const editForm = ref({})
  const editBaseline = ref({})
  const editRecord = ref(null)
  const editMode = ref('full')
  const updateDescription = ref(false)
  const editIsDirty = computed(() => editingDetail.value && (updateDescription.value || Object.entries(editForm.value).some(([key, value]) => value !== editBaseline.value[key])))

  const showCreate = ref(false)
  const createBusy = ref(false)
  const createError = ref('')
  const duplicateCandidates = ref([])
  const createForm = ref(emptyCreateForm())
  const createBaseline = ref(emptyCreateForm())
  const createIsDirty = computed(() => showCreate.value && Object.entries(createForm.value).some(([key, value]) => value !== createBaseline.value[key]))
  let requestId = 0
  let detailRequestId = 0

  function emptyCreateForm() {
    return { receivedDate: '', letterNumber: '', letterDate: '', sender: '', subject: '', disposition: '', dispositionTargets: '', parafDateOrNote: '', letterFileReference: '', letterPosition: '', followupNote: '', followupReference: '' }
  }

  function confirmDiscard() {
    if (editBusy.value || createBusy.value) return false
    if ((editIsDirty.value || createIsDirty.value) && !window.confirm('Perubahan belum disimpan. Buang perubahan dan lanjutkan?')) return false
    return true
  }

  function closeDetail() {
    if (!confirmDiscard()) return
    detailRequestId++
    detail.value = null
    cancelEditing(true)
    saveNotice.value = ''
  }

  function closeCreate() {
    if (!confirmDiscard()) return
    showCreate.value = false
    createForm.value = emptyCreateForm()
  }

  function closeForNavigation() {
    detailRequestId++
    detail.value = null
    cancelEditing(true)
    showCreate.value = false
    createForm.value = emptyCreateForm()
  }

  async function search(resetPage = true, preserveDetail = false) {
    if (!preserveDetail && detail.value && !confirmDiscard()) return false
    const trimmed = keyword.value.trim()
    if (resetPage) page.value = 1
    const queryKey = listQuery.value
    const currentRequest = ++requestId
    listLoading.value = true
    listError.value = ''
    appliedListQuery.value = null
    if (!preserveDetail) {
      detailRequestId++
      detail.value = null
      cancelEditing(true)
    }
    try {
      const result = await api.getSuratMasuk({
        keyword: trimmed,
        positions: selectedPositions.value.length ? [...selectedPositions.value] : undefined,
        sender: selectedSender.value,
        dispositionTargets: [...selectedTargets.value],
        page: page.value,
        pageSize: pageSize.value,
      })
      if (currentRequest !== requestId) return
      if (!result?.success) {
        listError.value = result?.message || 'Daftar surat tidak dapat dimuat.'
        return
      }
      records.value = result.records || []
      appliedListQuery.value = queryKey
      total.value = result.total || 0
      page.value = result.page || 1
      pageSize.value = result.pageSize || 10
      allPositions.value = result.positions || allPositions.value
      allSenders.value = result.senders || allSenders.value
      allTargets.value = result.targets || allTargets.value
      warningCount.value = result.warningCount || 0
      emptyMessage.value = total.value ? `${total.value} pencatatan ditemukan.` : 'Tidak ada data yang cocok.'
    } catch (error) {
      if (currentRequest === requestId) listError.value = 'Daftar surat gagal dimuat. Coba lagi.'
    } finally {
      if (currentRequest === requestId) listLoading.value = false
    }
  }

  function resetSearch() {
    if (!confirmDiscard()) return
    detailRequestId++
    detail.value = null
    cancelEditing(true)
    keyword.value = ''
    selectedPositions.value = []
    selectedSender.value = ''
    selectedTargets.value = []
    page.value = 1
    listError.value = ''
    search()
  }

  async function changePageSize(event) {
    const previousSize = pageSize.value
    const previousPage = page.value
    pageSize.value = Number(event.target.value)
    page.value = 1
    if (await search(false) === false) {
      pageSize.value = previousSize
      page.value = previousPage
    }
  }

  async function goToPage(nextPage) {
    const previousPage = page.value
    page.value = nextPage
    if (await search(false) === false) page.value = previousPage
  }

  async function openDetail(record) {
    if (!confirmDiscard()) return false
    const currentRequest = ++detailRequestId
    cancelEditing(true)
    showCreate.value = false
    detail.value = record
    detailLoading.value = true
    detailError.value = ''
    saveNotice.value = ''
    try {
      const result = await api.getSuratDetail({
        rowHint: record.rowHint,
        agenda: record.agenda,
        expectedHash: record.expectedHash,
      })
      if (currentRequest !== detailRequestId) return false
      if (!result?.success) {
        detailError.value = result?.message || 'Detail tidak dapat dimuat.'
        return false
      }
      detail.value = result.record
      return true
    } catch (error) {
      if (currentRequest === detailRequestId) detailError.value = 'Detail gagal dimuat. Muat ulang daftar.'
      return false
    } finally {
      if (currentRequest === detailRequestId) detailLoading.value = false
    }
  }

  async function openEdit(record) {
    if (await openDetail(record)) startEditing('full')
  }

  function startEditing(mode = 'full') {
    if (!detail.value || detailLoading.value || role.value !== 'WRITE' || !confirmDiscard()) return
    editMode.value = mode
    editRecord.value = { rowHint: detail.value.rowHint, agenda: detail.value.agenda, expectedHash: detail.value.expectedHash }
    const keys = (mode === 'quick' ? ['disposition', 'dispositionTargets', 'parafDateOrNote', 'letterPosition', 'followupNote'] : fields.map(([key]) => key).filter(key => key !== 'documentDescription')).concat(mode === 'full' ? ['letterFileReference', 'followupReference'] : [])
    editBaseline.value = Object.fromEntries(keys.map(key => [key, detail.value[key] || '']))
    editForm.value = { ...editBaseline.value }
    editError.value = ''
    updateDescription.value = false
    editingDetail.value = true
  }

  function cancelEditing(force = false) {
    if (!force && !confirmDiscard()) return
    editingDetail.value = false
    editError.value = ''
    editForm.value = {}
    editRecord.value = null
  }

  async function submitEdit() {
    if (editBusy.value || !detail.value || !editRecord.value) return
    const identity = editRecord.value
    if (detail.value.rowHint !== identity.rowHint || detail.value.agenda !== identity.agenda || detail.value.expectedHash !== identity.expectedHash) {
      editError.value = 'Surat yang sedang diedit berubah. Muat ulang detail sebelum menyimpan.'
      return
    }
    const changes = Object.fromEntries(Object.entries(editForm.value).filter(([key, value]) => value !== editBaseline.value[key]))
    if (!Object.keys(changes).length && !updateDescription.value) {
      editError.value = 'Tidak ada perubahan untuk disimpan.'
      return
    }
    editBusy.value = true
    editError.value = ''
    try {
      const result = await api.updateSuratMasuk({
        ...identity,
        changes,
        updateDescription: updateDescription.value,
      })
      if (!result?.success) {
        editError.value = result?.message || 'Perubahan gagal disimpan.'
        return
      }
      detail.value = result.record
      cancelEditing(true)
      saveNotice.value = `Perubahan surat agenda ${display(result.record.agenda)} berhasil disimpan.`
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
      const result = await api.createSuratMasuk({ ...createForm.value, confirmDuplicate })
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
      saveNotice.value = `Surat agenda ${display(result.agenda)} berhasil dicatat.`
      keyword.value = result.agenda
      selectedPositions.value = []
      selectedSender.value = ''
      selectedTargets.value = []
      await search()
    } catch (error) {
      createError.value = 'Hasil simpan belum diketahui. Periksa daftar sebelum mencoba lagi.'
    } finally {
      createBusy.value = false
    }
  }

  function openCreate() {
    if (!confirmDiscard()) return
    cancelEditing(true)
    detailRequestId++
    detail.value = null
    createError.value = ''
    duplicateCandidates.value = []
    createForm.value = { ...emptyCreateForm(), receivedDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()) }
    createBaseline.value = { ...createForm.value }
    showCreate.value = true
  }

  return {
    allPositions, allSenders, allTargets, keyword, selectedPositions, selectedTargets, selectedSender,
    listLoading, listError, appliedListQuery, saveNotice, emptyMessage, records, total, warningCount,
    page, pageSize, pageNumbers, pageCount, positionOptions, targetOptions, listQuery, listIsCurrent,
    detail, detailLoading, detailError, editingDetail, editBusy, editError, editForm, editBaseline,
    editRecord, editMode, updateDescription, editIsDirty, showCreate, createBusy, createError,
    duplicateCandidates, createForm, createBaseline, createIsDirty,
    fields, editGroups, editLabels, reportColumns, display,
    emptyCreateForm, confirmDiscard, closeDetail, closeCreate, closeForNavigation, search, resetSearch,
    changePageSize, goToPage, openDetail, openEdit, startEditing, cancelEditing, submitEdit,
    submitCreate, openCreate,
  }
}
