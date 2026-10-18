// Repository: server Apps Script; loaded into the project global scope by clasp.
const SidilanRepository = (() => {
  function readRegister_(config) {
    const sheet = getValidatedSheet_(config);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { sheet, records: [], warningCount: 0 };

    const range = sheet.getRange(2, 1, lastRow - 1, SidilanConfig.FIELD_NAMES_.length);
    const values = range.getValues();
    const displays = range.getDisplayValues();
    const formulas = range.getFormulas();
    const richTextValues = range.getRichTextValues();
    const records = [];
    let warningCount = 0;

    values.forEach((row, index) => {
      try {
        if (!row.slice(1, 6).some(value => !SidilanUtils.isPlaceholder_(value))) return;
        records.push(buildRecord_(index + 2, row, displays[index], formulas[index], richTextValues[index]));
      } catch (error) {
        warningCount++;
      }
    });
    return { sheet, records, warningCount };
  }

  function getValidatedSheet_(config) {
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    } catch (error) {
      throw new Error('SHEET_UNAVAILABLE');
    }
    const sheet = spreadsheet.getSheetByName(config.sheetName);
    if (!sheet) throw new Error('CONFIGURATION_ERROR');
    const headers = sheet.getRange(1, 1, 1, SidilanConfig.HEADER_ROW_.length).getDisplayValues()[0];
    if (headers.some((header, index) => SidilanUtils.normalizeHeader_(header) !== SidilanUtils.normalizeHeader_(SidilanConfig.HEADER_ROW_[index]))) {
      throw new Error('CONFIGURATION_ERROR');
    }
    return sheet;
  }

  function buildRecord_(rowHint, values, displays, formulas, richTextValues) {
    const fields = {};
    SidilanConfig.FIELD_NAMES_.forEach((field, index) => {
      const value = values[index];
      fields[field] = (field === 'receivedDate' || field === 'letterDate')
        ? SidilanUtils.receivedDateKey_(value, displays[index]) || displays[index] || ''
        : displays[index] || '';
    });
    const links = {
      letterFileReference: extractLinks_(richTextValues[10], displays[10], formulas[10]),
      followupReference: extractLinks_(richTextValues[13], displays[13], formulas[13])
    };
    const snapshotValues = values.map(value => value instanceof Date
      ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss")
      : value);
    const snapshot = JSON.stringify({ values: snapshotValues, formulas, links });
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, snapshot, Utilities.Charset.UTF_8);
    return {
      ...fields,
      rowHint,
      expectedHash: Utilities.base64EncodeWebSafe(digest),
      receivedDateKey: SidilanUtils.receivedDateKey_(values[1], displays[1]),
      links
    };
  }

  function readRecordAtRow_(sheet, rowNumber) {
    const range = sheet.getRange(rowNumber, 1, 1, SidilanConfig.FIELD_NAMES_.length);
    const values = range.getValues()[0];
    if (!values.slice(1, 6).some(value => !SidilanUtils.isPlaceholder_(value))) return null;
    return buildRecord_(rowNumber, values, range.getDisplayValues()[0], range.getFormulas()[0], range.getRichTextValues()[0]);
  }

  function collectPositions_(sheet, records) {
    const positions = [''];
    const add = value => {
      const position = String(value == null ? '' : value);
      if (!positions.includes(position)) positions.push(position);
    };
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const range = sheet.getRange(2, 12, lastRow - 1, 1);
      range.getDataValidations().forEach(([rule]) => {
        if (rule && rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
          const values = rule.getCriteriaValues()[0] || [];
          values.forEach(add);
        }
      });
    }
    records.forEach(record => add(record.letterPosition));
    return positions;
  }

  function extractLinks_(richText, displayedValue, formula) {
    if (richText) {
      const wholeLink = richText.getLinkUrl();
      if (wholeLink && SidilanUtils.isHttpsUrl_(wholeLink)) return [{ label: displayedValue, url: wholeLink }];
      const runLinks = richText.getRuns().reduce((links, run) => {
        const url = run.getLinkUrl();
        if (url && SidilanUtils.isHttpsUrl_(url)) links.push({ label: run.getText(), url });
        return links;
      }, []);
      if (runLinks.length) return runLinks;
    }
    const formulaLink = typeof formula === 'string' && formula.match(/^=HYPERLINK\(\s*"(https:\/\/[^"\s<>]+)"\s*,\s*"([^"]*)"\s*\)$/i);
    if (formulaLink) return [{ label: formulaLink[2] || displayedValue, url: formulaLink[1] }];
    return SidilanUtils.isHttpsUrl_(displayedValue) ? [{ label: displayedValue, url: displayedValue }] : [];
  }

  function ensureUniqueAgenda_(sheet, agenda, row) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('NOT_FOUND');
    const matches = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
      .filter(([value]) => String(value).trim() === agenda).length;
    if (matches !== 1 || String(sheet.getRange(row, 1).getDisplayValue()).trim() !== agenda) throw new Error('DUPLICATE_AGENDA');
  }

  function findSafeTemplateRow_(sheet, records) {
    const lastRecordRow = records.reduce((max, record) => Math.max(max, record.rowHint), 1);
    const lastRow = sheet.getLastRow();
    if (lastRecordRow >= lastRow) return null;
    const width = Math.max(SidilanConfig.FIELD_NAMES_.length, sheet.getLastColumn());
    const rowCount = lastRow - lastRecordRow;
    const scan = sheet.getRange(lastRecordRow + 1, 1, rowCount, width);
    const values = scan.getValues();
    const formulas = scan.getFormulas();
    const notes = scan.getNotes();
    const mergedRanges = sheet.getRange(1, 1, lastRow, width).getMergedRanges();
    const occupiedAgenda = new Set(records.map(record => String(record.agenda).trim()));
    for (let index = 0; index < rowCount; index++) {
      const row = lastRecordRow + index + 1;
      if (mergedRanges.some(range => row >= range.getRow() && row <= range.getLastRow())) continue;
      const cells = values[index];
      const agenda = String(cells[0] == null ? '' : cells[0]).trim();
      if (!/^\d+$/.test(agenda) || !cells[6] || typeof cells[6] !== 'string' || occupiedAgenda.has(agenda)) continue;
      const hasUnsafeContent = cells.some((value, column) => value !== '' && column !== 0 && column !== 6) ||
        formulas[index].some(Boolean) || notes[index].some(Boolean);
      if (!hasUnsafeContent) return row;
    }
    return null;
  }

  function safeInsertRow_(sheet, records) {
    const lastRecordRow = records.reduce((max, record) => Math.max(max, record.rowHint), 1);
    if (lastRecordRow < 2) return 2;
    const width = Math.max(SidilanConfig.FIELD_NAMES_.length, sheet.getLastColumn());
    const mergedRanges = sheet.getRange(1, 1, sheet.getLastRow(), width).getMergedRanges();
    const insertAfter = Math.max(...records.map(record => record.rowHint));
    if (mergedRanges.some(range => insertAfter >= range.getRow() && insertAfter <= range.getLastRow())) return null;
    return insertAfter + 1;
  }

  function updateFields_(config, sheet, row, changes, changedFields) {
    const requests = changedFields.map(field => {
      const column = SidilanConfig.FIELD_NAMES_.indexOf(field);
      const value = changes[field];
      const cellValue = (field === 'receivedDate' || field === 'letterDate') && value
        ? { numberValue: SidilanUtils.parseIsoDate_(value) }
        : value === '' ? {} : { stringValue: String(value) };
      const cellData = { userEnteredValue: cellValue };
      const fields = ['userEnteredValue'];
      if ((field === 'receivedDate' || field === 'letterDate') && value) {
        cellData.userEnteredFormat = { numberFormat: { type: 'DATE', pattern: 'dd mmmm yyyy' } };
        fields.push('userEnteredFormat.numberFormat');
      }
      if (field === 'letterFileReference' || field === 'followupReference') {
        cellData.textFormatRuns = [];
        fields.push('textFormatRuns', 'userEnteredFormat.textFormat.link');
      }
      return { updateCells: {
        range: { sheetId: sheet.getSheetId(), startRowIndex: row - 1, endRowIndex: row, startColumnIndex: column, endColumnIndex: column + 1 },
        rows: [{ values: [cellData] }],
        fields: fields.join(',')
      } };
    });
    Sheets.Spreadsheets.batchUpdate({ requests }, config.spreadsheetId);
    SpreadsheetApp.flush();
    return SidilanRepository.readRecordAtRow_(sheet, row);
  }

  function insertRecord_(config, sheet, row, templateRow, values) {
    const sheetId = sheet.getSheetId();
    const requests = [];
    if (!templateRow) requests.push({ insertDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row },
      inheritFromBefore: true
    } });
    requests.push({ updateCells: {
      range: { sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 0, endColumnIndex: SidilanConfig.FIELD_NAMES_.length },
      rows: [{ values: values.map((value, index) => ({
        userEnteredValue: index === 1 || (index === 3 && value !== '')
          ? { numberValue: value }
          : value === '' ? {} : { stringValue: String(value) },
        ...(index === 1 || index === 3 && value !== '' ? { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd mmmm yyyy' } } } : {})
      })) }],
      fields: 'userEnteredValue,userEnteredFormat.numberFormat'
    } });
    Sheets.Spreadsheets.batchUpdate({ requests }, config.spreadsheetId);
    SpreadsheetApp.flush();
  }

  // Legacy dashboard compatibility; surat keluar itself remains outside v1.
  function readOutgoingTrend_(monthKeys) {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const spreadsheetId = String(properties.OUTGOING_SPREADSHEET_ID || '').trim();
    const sheetName = String(properties.OUTGOING_SHEET_NAME || '').trim();
    if (!spreadsheetId || !sheetName) return { unavailable: true, unreadableDates: 0 };
    try {
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
      if (!sheet || !sheet.getLastColumn()) return { unavailable: true, unreadableDates: 0 };
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
      const index = headers.findIndex(header => SidilanUtils.normalizeHeader_(header) === SidilanUtils.normalizeHeader_('Tanggal Surat'));
      if (index < 0) return { unavailable: true, unreadableDates: 0 };
      const counts = Object.fromEntries(monthKeys.map(key => [key, 0]));
      let unreadableDates = 0;
      const rowCount = sheet.getLastRow() - 1;
      if (rowCount > 0) {
        const range = sheet.getRange(2, index + 1, rowCount, 1);
        const values = range.getValues();
        const displays = range.getDisplayValues();
        values.forEach(([value], row) => {
          if (SidilanUtils.isPlaceholder_(value) && SidilanUtils.isPlaceholder_(displays[row][0])) return;
          const date = SidilanUtils.receivedDateKey_(value, displays[row][0]);
          if (!date) unreadableDates++;
          else if (Object.hasOwn(counts, date.slice(0, 7))) counts[date.slice(0, 7)]++;
        });
      }
      return { counts, unavailable: false, unreadableDates };
    } catch (error) {
      return { unavailable: true, unreadableDates: 0 };
    }
  }

  return { readRegister_, getValidatedSheet_, buildRecord_, readRecordAtRow_, collectPositions_, extractLinks_, ensureUniqueAgenda_, findSafeTemplateRow_, safeInsertRow_, updateFields_, insertRecord_, readOutgoingTrend_ };
})();