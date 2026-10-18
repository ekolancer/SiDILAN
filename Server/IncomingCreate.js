// IncomingCreate: server Apps Script; loaded into the project global scope by clasp.
const SidilanIncomingCreate = (() => {
  function saveSuratMasuk() {
    try {
      SidilanAuth.requireRole_('WRITE');
      return { success: false, ...SidilanErrors.safeError_(new Error('FEATURE_NOT_AVAILABLE')) };
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  function createSuratMasuk(payload) {
    try {
      const { config } = SidilanAuth.requireRole_('WRITE');
      validateCreatePayload_(payload);
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(10000)) throw new Error('BUSY');
      try {
        const register = SidilanRepository.readRegister_(config);
        if (!SidilanRepository.collectPositions_(register.sheet, register.records).includes(payload.letterPosition || '')) throw new Error('VALIDATION_ERROR');
        const duplicateCandidates = findDuplicateCandidates_(register.records, payload);
        if (duplicateCandidates.length && payload.confirmDuplicate !== true) {
          const warning = new Error('DUPLICATE_WARNING');
          warning.candidates = duplicateCandidates;
          throw warning;
        }
        const agenda = nextAgenda_(register.sheet, register.records);
        const templateRow = SidilanRepository.findSafeTemplateRow_(register.sheet, register.records);
        const row = templateRow || SidilanRepository.safeInsertRow_(register.sheet, register.records);
        if (!row) throw new Error('NO_SAFE_ROW');
        const values = buildNewRow_(payload, agenda);
        SidilanRepository.insertRecord_(config, register.sheet, row, templateRow, values);
        return { success: true, agenda, rowHint: row };
      } finally {
        lock.releaseLock();
      }
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  function validateCreatePayload_(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('VALIDATION_ERROR');
    const textFields = ['letterNumber', 'sender', 'subject', 'letterDate', 'disposition', 'dispositionTargets', 'parafDateOrNote', 'letterFileReference', 'letterPosition', 'followupNote', 'followupReference'];
    if (textFields.some(field => payload[field] !== undefined && typeof payload[field] !== 'string')) throw new Error('VALIDATION_ERROR');
    if (typeof payload.receivedDate !== 'string' || !SidilanUtils.isValidIsoDate_(payload.receivedDate)) throw new Error('VALIDATION_ERROR');
    for (const field of ['letterNumber', 'sender', 'subject']) {
      const value = typeof payload[field] === 'string' ? payload[field].trim() : '';
      if (!value || value.length > 500) throw new Error('VALIDATION_ERROR');
    }
    if (['letterDate'].some(field => payload[field] && !SidilanUtils.isValidIsoDate_(payload[field]))) throw new Error('VALIDATION_ERROR');
    for (const field of ['disposition', 'dispositionTargets', 'parafDateOrNote', 'letterPosition', 'followupNote', 'followupReference']) {
      if ((payload[field] || '').length > 5000) throw new Error('VALIDATION_ERROR');
    }
    if (payload.letterFileReference && !SidilanUtils.isHttpsUrl_(payload.letterFileReference.trim())) throw new Error('VALIDATION_ERROR');
    if (payload.followupReference && /^https?:/i.test(payload.followupReference.trim()) && !SidilanUtils.isHttpsUrl_(payload.followupReference.trim())) throw new Error('VALIDATION_ERROR');
    if (payload.confirmDuplicate !== undefined && typeof payload.confirmDuplicate !== 'boolean') throw new Error('VALIDATION_ERROR');
  }

  function findDuplicateCandidates_(records, payload) {
    const targetNumber = payload.letterNumber.trim().toLocaleLowerCase();
    const targetSender = payload.sender.trim().toLocaleLowerCase();
    return records.filter(record => {
      const number = record.letterNumber.trim().toLocaleLowerCase();
      return number && (number === targetNumber || number.includes(targetNumber) || targetNumber.includes(number)) &&
        record.sender.trim().toLocaleLowerCase() === targetSender;
    }).slice(0, 10).map(record => ({ agenda: record.agenda, letterNumber: record.letterNumber, sender: record.sender, subject: record.subject }));
  }

  function nextAgenda_(sheet, records) {
    const numericAgendas = records.map(record => /^\d+$/.test(record.agenda.trim()) ? Number(record.agenda.trim()) : 0);
    const occupied = new Set(records.map(record => String(record.agenda).trim()));
    let next = Math.max(0, ...numericAgendas) + 1;
    while (occupied.has(String(next))) next++;
    return String(next);
  }

  function buildNewRow_(payload, agenda) {
    const receivedDate = SidilanUtils.parseIsoDate_(payload.receivedDate);
    const letterDate = payload.letterDate ? SidilanUtils.parseIsoDate_(payload.letterDate) : '';
    const descriptionDate = payload.letterDate ? SidilanUtils.formatDateId_(payload.letterDate) : 'belum tersedia';
    const description = `Surat Dari ${payload.sender.trim()} Nomor ${payload.letterNumber.trim()} Tanggal ${descriptionDate} Tentang ${payload.subject.trim()}.`;
    return [agenda, receivedDate, payload.letterNumber.trim(), letterDate, payload.sender.trim(), payload.subject.trim(), description,
      payload.disposition || '', payload.dispositionTargets || '', payload.parafDateOrNote || '', payload.letterFileReference || '',
      payload.letterPosition || '', payload.followupNote || '', payload.followupReference || ''];
  }

  return { saveSuratMasuk, createSuratMasuk, validateCreatePayload_, findDuplicateCandidates_, nextAgenda_, buildNewRow_ };
})();