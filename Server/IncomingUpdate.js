// IncomingUpdate: server Apps Script; loaded into the project global scope by clasp.
const SidilanIncomingUpdate = (() => {
  function updateSuratMasuk(payload) {
    try {
      const { config } = SidilanAuth.requireRole_('WRITE');
      validateUpdatePayload_(payload);
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(10000)) throw new Error('BUSY');
      try {
        const sheet = SidilanRepository.getValidatedSheet_(config);
        const row = Number(payload.rowHint);
        if (row > sheet.getLastRow()) throw new Error('NOT_FOUND');
        const current = SidilanRepository.readRecordAtRow_(sheet, row);
        if (!current) throw new Error('NOT_FOUND');
        if (current.agenda !== payload.agenda) throw new Error('DATA_CHANGED');
        SidilanRepository.ensureUniqueAgenda_(sheet, payload.agenda, row);
        if (current.expectedHash !== payload.expectedHash) throw new Error('DATA_CHANGED');

        if (payload.updateDescription !== undefined && typeof payload.updateDescription !== 'boolean') throw new Error('VALIDATION_ERROR');
        const changes = { ...payload.changes };
        if (payload.updateDescription === true) {
          const nextIdentity = { ...current, ...changes };
          const letterDate = nextIdentity.letterDate && SidilanUtils.isValidIsoDate_(nextIdentity.letterDate)
            ? SidilanUtils.formatDateId_(nextIdentity.letterDate)
            : nextIdentity.letterDate || 'belum tersedia';
          changes.documentDescription = `Surat Dari ${nextIdentity.sender} Nomor ${nextIdentity.letterNumber} Tanggal ${letterDate} Tentang ${nextIdentity.subject}.`;
        }
        const changedFields = Object.keys(changes).filter(field => String(changes[field]) !== String(current[field]));
        if (!changedFields.length) throw new Error('NO_CHANGES');
        validateChangedFields_(changes, current);
        if (Object.hasOwn(changes, 'letterPosition')) {
          const positions = SidilanRepository.collectPositions_(sheet, SidilanRepository.readRegister_(config).records);
          if (!positions.includes(changes.letterPosition || '')) throw new Error('VALIDATION_ERROR');
        }

        const updated = SidilanRepository.updateFields_(config, sheet, row, changes, changedFields);
        return { success: true, record: updated };
      } finally {
        lock.releaseLock();
      }
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  function validateUpdatePayload_(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        !Number.isInteger(Number(payload.rowHint)) || Number(payload.rowHint) < 2 ||
        typeof payload.agenda !== 'string' || typeof payload.expectedHash !== 'string' ||
        !payload.changes || typeof payload.changes !== 'object' || Array.isArray(payload.changes)) {
      throw new Error('VALIDATION_ERROR');
    }
    const allowed = SidilanConfig.FIELD_NAMES_.filter(field => field !== 'agenda');
    const fields = Object.keys(payload.changes);
    if (!fields.length || fields.some(field => !allowed.includes(field)) ||
        fields.some(field => typeof payload.changes[field] !== 'string' || payload.changes[field].length > 5000)) {
      throw new Error('VALIDATION_ERROR');
    }
  }

  function validateChangedFields_(changes, current) {
    for (const [field, value] of Object.entries(changes)) {
      if (field === 'receivedDate' || field === 'letterDate') {
        if (value && !SidilanUtils.isValidIsoDate_(value)) throw new Error('VALIDATION_ERROR');
        if (field === 'receivedDate' && !value) throw new Error('VALIDATION_ERROR');
      }
      if (field === 'letterFileReference' && value && !SidilanUtils.isHttpsUrl_(value.trim())) throw new Error('VALIDATION_ERROR');
      if (field === 'followupReference' && value && /^https?:/i.test(value.trim()) && !SidilanUtils.isHttpsUrl_(value.trim())) throw new Error('VALIDATION_ERROR');
      if (['letterNumber', 'sender', 'subject'].includes(field) && (!value.trim() || value.length > 500)) throw new Error('VALIDATION_ERROR');
      if (field === 'documentDescription' && value.length > 5000) throw new Error('VALIDATION_ERROR');
    }
    if (Object.keys(changes).some(field => current[field] == null)) throw new Error('VALIDATION_ERROR');
  }

  return { updateSuratMasuk, validateUpdatePayload_, validateChangedFields_ };
})();