// Reports: server Apps Script; loaded into the project global scope by clasp.
const SidilanReports = (() => {
  function getDashboardStats() {
    try {
      const { config } = SidilanAuth.requireRole_('READ');
      return dashboardStats_(SidilanRepository.readRegister_(config));
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  function dashboardStats_(register) {
    const records = register.records;
      const month = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
      const statusCounts = { selesai: 0, dalamProses: 0, lewatBatasWaktu: 0 };
      const units = new Map();
      const datedMonths = records.map(record => record.receivedDateKey?.slice(0, 7)).filter(Boolean).sort();
      const monthKeys = [];
      if (datedMonths.length) {
        const [firstYear, firstMonth] = datedMonths[0].split('-').map(Number);
        const [lastYear, lastMonth] = datedMonths[datedMonths.length - 1].split('-').map(Number);
        for (let year = firstYear, monthNumber = firstMonth; year < lastYear || (year === lastYear && monthNumber <= lastMonth); monthNumber++) {
          if (monthNumber > 12) { year++; monthNumber = 1; }
          monthKeys.push(`${year}-${String(monthNumber).padStart(2, '0')}`);
        }
      }
      const incoming = Object.fromEntries(monthKeys.map(key => [key, 0]));
      let unclassifiedStatus = 0;
      let receivedThisMonth = 0;
      let unreadableDates = 0;
      let withDisposition = 0;
      let withFollowup = 0;
      records.forEach(record => {
        const date = record.receivedDateKey;
        if (!date) unreadableDates++;
        if (date && date.slice(0, 7) === month) receivedThisMonth++;
        if (date && Object.hasOwn(incoming, date.slice(0, 7))) incoming[date.slice(0, 7)]++;
        if (!SidilanUtils.isPlaceholder_(record.disposition)) withDisposition++;
        if (!SidilanUtils.isPlaceholder_(record.followupNote)) withFollowup++;
        const status = String(record.followupNote || '').trim().toLocaleLowerCase('id');
        if (status === 'selesai') statusCounts.selesai++;
        else if (status === 'dalam proses') statusCounts.dalamProses++;
        else if (status === 'lewat batas waktu') statusCounts.lewatBatasWaktu++;
        else unclassifiedStatus++;
        const targets = new Set(String(record.dispositionTargets || '').split(/[,;]/).map(value => value.trim()).filter(value => !SidilanUtils.isPlaceholder_(value)));
        targets.forEach(target => units.set(target, (units.get(target) || 0) + 1));
      });
      const outgoing = SidilanRepository.readOutgoingTrend_(monthKeys);
      return {
        success: true, total: records.length, receivedThisMonth, unreadableDates,
        withDisposition, withFollowup, statusCounts, unclassifiedStatus,
        unitCounts: [...units].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id')),
        trend: monthKeys.map(key => ({ month: key, incoming: incoming[key], outgoing: outgoing.counts?.[key] ?? null })),
        outgoingUnavailable: outgoing.unavailable, outgoingUnreadableDates: outgoing.unreadableDates,
        latest: records.slice(-5).reverse(), warningCount: register.warningCount,
        loadedAt: Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss")
      };
  }

  function getIncomingReport(query) {
    try {
      const { config } = SidilanAuth.requireRole_('READ');
      const filter = SidilanFilters.validateReportQuery_(query);
      const register = SidilanRepository.readRegister_(config);
      const matched = register.records.filter(record => SidilanFilters.matchesRegisterFilter_(record, filter.keyword, filter.positions) &&
        (!filter.sender || record.sender === filter.sender) &&
        (!filter.dispositionTarget || String(record.dispositionTargets || '').split(/[,;]/).some(target => target.trim() === filter.dispositionTarget)));
      const unreadableDates = filter.fromDate || filter.toDate
        ? matched.filter(record => !record.receivedDateKey).length : 0;
      const records = matched.filter(record => {
        if (!filter.fromDate && !filter.toDate) return true;
        if (!record.receivedDateKey) return false;
        return (!filter.fromDate || record.receivedDateKey >= filter.fromDate) &&
          (!filter.toDate || record.receivedDateKey <= filter.toDate);
      });
      return {
        success: true, records, total: records.length, unreadableDates,
        senders: [...new Set(register.records.map(record => record.sender).filter(value => !SidilanUtils.isPlaceholder_(value)))].sort((a, b) => a.localeCompare(b, 'id')),
        targets: [...new Set(register.records.flatMap(record => String(record.dispositionTargets || '').split(/[,;]/).map(value => value.trim()).filter(value => !SidilanUtils.isPlaceholder_(value))))].sort((a, b) => a.localeCompare(b, 'id')),
        warningCount: register.warningCount,
        generatedAt: Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss"),
        filters: { keyword: filter.rawKeyword, positions: filter.positions ? [...filter.positions] : null,
          sender: filter.sender, dispositionTarget: filter.dispositionTarget, fromDate: filter.fromDate, toDate: filter.toDate }
      };
    } catch (error) {
      return { success: false, ...SidilanErrors.safeError_(error) };
    }
  }

  return { getDashboardStats, dashboardStats_, getIncomingReport };
})();