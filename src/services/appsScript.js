export function callAppsScript(functionName, ...args) {
  return new Promise((resolve, reject) => {
    const runner = globalThis.google?.script?.run
    if (!runner) {
      reject(new Error('APPS_SCRIPT_UNAVAILABLE'))
      return
    }
    runner.withSuccessHandler(resolve).withFailureHandler(reject)[functionName](...args)
  })
}

export const letterApi = {
  getAppStatus: () => callAppsScript('getAppStatus'),
  getStartupData: query => callAppsScript('getStartupData', query),
  getInitialData: () => callAppsScript('getInitialData'),
  getSuratMasuk: query => callAppsScript('getSuratMasuk', query),
  getSuratDetail: query => callAppsScript('getSuratDetail', query),
  updateSuratMasuk: change => callAppsScript('updateSuratMasuk', change),
  createSuratMasuk: letter => callAppsScript('createSuratMasuk', letter),
  getDashboardStats: () => callAppsScript('getDashboardStats'),
  getIncomingReport: query => callAppsScript('getIncomingReport', query),
}
