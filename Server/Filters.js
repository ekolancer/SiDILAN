// Filters: server Apps Script; loaded into the project global scope by clasp.
const SidilanFilters = (() => {
  function collectReportOptions_(records) {
    return {
      senders: [...new Set(records.map(record => record.sender).filter(value => !SidilanUtils.isPlaceholder_(value)))].sort((a, b) => a.localeCompare(b, 'id')),
      targets: [...new Set(records.flatMap(record => String(record.dispositionTargets || '').split(/[,;]/).map(value => value.trim()).filter(value => !SidilanUtils.isPlaceholder_(value))))].sort((a, b) => a.localeCompare(b, 'id'))
    };
  }

  function matchesRegisterFilter_(record, keyword, positions) {
    if (positions && !positions.has(record.letterPosition)) return false;
    return !keyword || [record.agenda, record.letterNumber, record.sender, record.subject, record.documentDescription]
      .some(value => String(value || '').toLocaleLowerCase().includes(keyword));
  }

  function validateReportQuery_(query) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) throw new Error('VALIDATION_ERROR');
    const rawKeyword = query.keyword === undefined ? '' : query.keyword;
    if (typeof rawKeyword !== 'string' || rawKeyword.length > 200) throw new Error('VALIDATION_ERROR');
    const fromDate = query.fromDate === undefined ? '' : query.fromDate;
    const toDate = query.toDate === undefined ? '' : query.toDate;
    if (typeof fromDate !== 'string' || typeof toDate !== 'string' ||
        (fromDate && !SidilanUtils.isValidIsoDate_(fromDate)) || (toDate && !SidilanUtils.isValidIsoDate_(toDate)) ||
        (fromDate && toDate && fromDate > toDate)) throw new Error('VALIDATION_ERROR');
    const positions = query.positions;
    if (positions !== undefined && (!Array.isArray(positions) || positions.length > 100 ||
        positions.some(value => typeof value !== 'string'))) throw new Error('VALIDATION_ERROR');
    const sender = query.sender === undefined ? '' : query.sender;
    const dispositionTarget = query.dispositionTarget === undefined ? '' : query.dispositionTarget;
    if (typeof sender !== 'string' || sender.length > 5000 ||
        typeof dispositionTarget !== 'string' || dispositionTarget.length > 5000) throw new Error('VALIDATION_ERROR');
    return { rawKeyword: rawKeyword.trim(), keyword: rawKeyword.trim().toLocaleLowerCase(),
      positions: positions === undefined ? null : new Set(positions), sender: sender.trim(), dispositionTarget: dispositionTarget.trim(), fromDate, toDate };
  }

  return { collectReportOptions_, matchesRegisterFilter_, validateReportQuery_ };
})();