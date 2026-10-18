// IncomingRead: server Apps Script; loaded into the project global scope by clasp.
const SidilanIncomingRead = (() => {
  function getAppStatus() {
    try {
      const { email, role } = SidilanAuth.requireRole_('READ');
      return { success: true, email, role };
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  function getInitialData() {
    try {
      const { config, email, role } = SidilanAuth.requireRole_('READ');
      const register = SidilanRepository.readRegister_(config);
      const options = SidilanFilters.collectReportOptions_(register.records);
      return { success: true, email, role, positions: SidilanRepository.collectPositions_(register.sheet, register.records), ...options, warningCount: register.warningCount };
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  function getSuratMasuk(query) {
    try {
      const { config } = SidilanAuth.requireRole_('READ');
      if (!query || typeof query !== 'object' || Array.isArray(query)) throw new Error('VALIDATION_ERROR');
      const rawKeyword = query.keyword === undefined ? '' : query.keyword;
      if (typeof rawKeyword !== 'string' || rawKeyword.length > 200) throw new Error('VALIDATION_ERROR');
      const keyword = rawKeyword.trim();

      const selectedPositions = query && query.positions;
      if (selectedPositions !== undefined && (!Array.isArray(selectedPositions) || selectedPositions.length > 100 || selectedPositions.some(value => typeof value !== 'string'))) {
        throw new Error('VALIDATION_ERROR');
      }
      const sender = query.sender === undefined ? '' : query.sender;
      const dispositionTargets = query.dispositionTargets === undefined ? [] : query.dispositionTargets;
      if (typeof sender !== 'string' || sender.length > 5000 || !Array.isArray(dispositionTargets) || dispositionTargets.length > 100 || dispositionTargets.some(value => typeof value !== 'string' || value.length > 500)) throw new Error('VALIDATION_ERROR');
      const selectedTargets = new Set(dispositionTargets);
      const pageValue = query.page === undefined ? 1 : Number(query.page);
      if (!Number.isFinite(pageValue) || pageValue < 1 || !Number.isInteger(pageValue)) throw new Error('VALIDATION_ERROR');
      const pageSize = query.pageSize === undefined ? 10 : Number(query.pageSize);
      if (![10, 50, 100].includes(pageSize)) throw new Error('VALIDATION_ERROR');

      const register = SidilanRepository.readRegister_(config);
      const selected = selectedPositions === undefined ? null : new Set(selectedPositions);
      const normalizedKeyword = keyword.toLocaleLowerCase();
      const matches = register.records.filter(record => SidilanFilters.matchesRegisterFilter_(record, normalizedKeyword, selected) &&
        (!sender || record.sender === sender) &&
        (!selectedTargets.size || String(record.dispositionTargets || '').split(/[,;]/).some(target => selectedTargets.has(target.trim()))));
      const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
      const page = Math.min(pageValue, pageCount);
      return {
        success: true,
        records: matches.slice((page - 1) * pageSize, page * pageSize),
        positions: SidilanRepository.collectPositions_(register.sheet, register.records),
        ...SidilanFilters.collectReportOptions_(register.records),
        total: matches.length,
        page,
        pageSize,
        warningCount: register.warningCount
      };
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  function getSuratDetail(reference) {
    try {
      const { config } = SidilanAuth.requireRole_('READ');
      if (!reference || typeof reference !== 'object') throw new Error('VALIDATION_ERROR');
      const rowHint = Number(reference.rowHint);
      if (!Number.isInteger(rowHint) || rowHint < 2 || typeof reference.agenda !== 'string' || typeof reference.expectedHash !== 'string') {
        throw new Error('VALIDATION_ERROR');
      }

      const sheet = SidilanRepository.getValidatedSheet_(config);
      if (rowHint > sheet.getLastRow()) throw new Error('NOT_FOUND');
      const record = SidilanRepository.readRecordAtRow_(sheet, rowHint);
      if (!record || record.agenda !== reference.agenda) throw new Error('DATA_CHANGED');
      if (record.expectedHash !== reference.expectedHash) throw new Error('DATA_CHANGED');
      return { success: true, record };
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  return { getAppStatus, getInitialData, getSuratMasuk, getSuratDetail };
})();