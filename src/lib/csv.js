export function csvCell(value) {
  const text = String(value ?? '')
  const safe = /^[\s\u0000-\u001f\u007f\uFEFF]*[=+@-]/u.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function csvRows(rows) {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
