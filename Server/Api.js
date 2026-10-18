// The web app entrypoints stay global so existing google.script.run calls work.

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SiDILAN - Monitoring Surat')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// FUNGSI DATA SURAT MASUK
// ==========================================

function getAppStatus() {
  return SidilanIncomingRead.getAppStatus();
}

function getInitialData() {
  return SidilanIncomingRead.getInitialData();
}

function getStartupData(query) {
  return SidilanIncomingRead.getStartupData(query);
}

function getSuratMasuk(query) {
  return SidilanIncomingRead.getSuratMasuk(query);
}

function getSuratDetail(reference) {
  return SidilanIncomingRead.getSuratDetail(reference);
}

function saveSuratMasuk() {
  return SidilanIncomingCreate.saveSuratMasuk();
}

function getDashboardStats() {
  return SidilanReports.getDashboardStats();
}

function getIncomingReport(query) {
  return SidilanReports.getIncomingReport(query);
}

function updateSuratMasuk(payload) {
  return SidilanIncomingUpdate.updateSuratMasuk(payload);
}

function createSuratMasuk(payload) {
  return SidilanIncomingCreate.createSuratMasuk(payload);
}
