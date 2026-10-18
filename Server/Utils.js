// Utils: server Apps Script; loaded into the project global scope by clasp.
const SidilanUtils = (() => {
  function receivedDateKey_(value, display) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd');
    }
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 2958465) {
      const date = new Date((value - 25569) * 86400000);
      return date.getUTCFullYear() >= 1000 ? date.toISOString().slice(0, 10) : '';
    }
    const text = String(display == null ? '' : display).trim();
    if (isValidIsoDate_(text)) return text;
    const match = text.match(/^(\d{1,2})[\s/.-]+([\p{L}]+|\d{1,2})[\s/.-]+(\d{4})$/u);
    if (!match) return '';
    const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const month = /^\d+$/.test(match[2]) ? Number(match[2]) : months.indexOf(match[2].toLocaleLowerCase('id')) + 1;
    const key = `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    return isValidIsoDate_(key) ? key : '';
  }

  function isHttpsUrl_(value) {
    return typeof value === 'string' && /^https:\/\/[^\s<>]+$/i.test(value);
  }

  function isPlaceholder_(value) {
    if (value == null || value === '') return true;
    if (typeof value !== 'string') return false;
    return ['', '-', '–', '—', 'belum diisi', 'n/a', 'na'].includes(value.trim().toLocaleLowerCase());
  }

  function normalizeHeader_(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  }

  function isValidIsoDate_(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function parseIsoDate_(value) {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day) / 86400000 + 25569;
  }

  function formatDateId_(value) {
    const [year, month, day] = value.split('-').map(Number);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${day} ${months[month - 1]} ${year}`;
  }

  return { receivedDateKey_, isHttpsUrl_, isPlaceholder_, normalizeHeader_, isValidIsoDate_, parseIsoDate_, formatDateId_ };
})();