export const fields = [
  ['receivedDate', 'Tanggal diterima'], ['letterNumber', 'Nomor surat'], ['letterDate', 'Tanggal surat'],
  ['sender', 'Asal surat'], ['subject', 'Perihal'], ['documentDescription', 'Uraian berkas'],
  ['disposition', 'Isi disposisi'], ['dispositionTargets', 'Tujuan disposisi'],
  ['parafDateOrNote', 'Keterangan / tanggal paraf'], ['letterPosition', 'Posisi surat'],
  ['followupNote', 'Keterangan tindak lanjut'],
]

export const editGroups = [
  { title: 'Identitas surat', description: 'Tanggal dan identitas surat yang diterima. Nomor agenda dibuat setelah surat disimpan.', keys: ['receivedDate', 'letterNumber', 'letterDate', 'sender', 'subject'] },
  { title: 'Disposisi', description: 'Isi arahan, tujuan disposisi, serta keterangan atau tanggal paraf.', keys: ['disposition', 'dispositionTargets', 'parafDateOrNote'] },
  { title: 'Posisi dan tindak lanjut', description: 'Posisi surat saat ini dan catatan tindak lanjut yang tersedia.', keys: ['letterPosition', 'followupNote'] },
  { title: 'Berkas', description: 'Tautan atau catatan berkas surat dan tindak lanjut.', keys: ['letterFileReference', 'followupReference'] },
]

export const editLabels = Object.fromEntries(fields.concat([
  ['letterFileReference', 'Tautan berkas surat'], ['followupReference', 'Berkas / catatan tindak lanjut'],
]))

export const reportColumns = [
  ['agenda', 'Nomor agenda'], ['receivedDate', 'Tanggal diterima'], ['letterNumber', 'No. surat'],
  ['letterDate', 'Tanggal surat'], ['sender', 'Asal surat'], ['subject', 'Perihal'],
  ['documentDescription', 'Uraian berkas'], ['disposition', 'Isi disposisi'],
  ['dispositionTargets', 'Tujuan disposisi'], ['parafDateOrNote', 'KET / tanggal paraf disposisi'],
  ['letterFileReference', 'Link berkas'], ['letterPosition', 'Posisi surat'],
  ['followupNote', 'Keterangan tindak lanjut'], ['followupReference', 'Link berkas tindak lanjut'],
]

export function display(value) {
  return value === '' || value == null ? 'Belum diisi' : String(value)
}

export function formatPosition(value) {
  return value || 'Belum diisi'
}
