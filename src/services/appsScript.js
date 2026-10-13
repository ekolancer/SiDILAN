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
