import { computed, ref } from 'vue'

export function useDashboard(api) {
  const dashboard = ref(null)
  const dashboardLoading = ref(false)
  const dashboardError = ref('')
  let dashboardRequestId = 0

  const followupStatuses = computed(() => [
    { key: 'selesai', label: 'Selesai', count: dashboard.value?.statusCounts?.selesai || 0 },
    { key: 'dalamProses', label: 'Dalam Proses', count: dashboard.value?.statusCounts?.dalamProses || 0 },
    { key: 'lewatBatasWaktu', label: 'Lewat Batas Waktu', count: dashboard.value?.statusCounts?.lewatBatasWaktu || 0 },
  ])
  const classifiedTotal = computed(() => followupStatuses.value.reduce((sum, status) => sum + status.count, 0))
  const donutStyle = computed(() => {
    const [done, active] = followupStatuses.value.map(status => classifiedTotal.value ? status.count / classifiedTotal.value * 100 : 0)
    return { background: classifiedTotal.value ? `conic-gradient(#228c77 0% ${done}%, #dd8a20 ${done}% ${done + active}%, #bc594e ${done + active}% 100%)` : '#dce5ee' }
  })
  const unitCounts = computed(() => (dashboard.value?.unitCounts || []).slice(0, 8))
  const maxUnitCount = computed(() => Math.max(1, ...unitCounts.value.map(unit => unit.count)))
  const trendMax = computed(() => Math.max(1, ...(dashboard.value?.trend || []).flatMap(month => [month.incoming, month.outgoing || 0])))
  const trendWidth = computed(() => Math.max(620, 80 + ((dashboard.value?.trend?.length || 1) - 1) * 48))

  function trendPoints(key) {
    const months = dashboard.value?.trend || []
    return months.map((month, index) => `${40 + index * 48},${168 - (month[key] || 0) / trendMax.value * 130}`).join(' ')
  }

  function trendLabel(month) {
    const [year, number] = month.split('-').map(Number)
    return new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(year, number - 1, 1)))
  }

  function setDashboard(result) {
    dashboardLoading.value = false
    dashboardError.value = result?.success ? '' : result?.message || 'Ringkasan tidak dapat dimuat.'
    dashboard.value = result?.success ? result : null
  }

  async function loadDashboard() {
    const currentRequest = ++dashboardRequestId
    dashboardLoading.value = true
    dashboardError.value = ''
    dashboard.value = null
    try {
      const result = await api.getDashboardStats()
      if (currentRequest !== dashboardRequestId) return
      if (!result?.success) {
        dashboardError.value = result?.message || 'Ringkasan tidak dapat dimuat.'
        return
      }
      dashboard.value = result
    } catch (error) {
      if (currentRequest === dashboardRequestId) dashboardError.value = 'Ringkasan gagal dimuat. Coba lagi.'
    } finally {
      if (currentRequest === dashboardRequestId) dashboardLoading.value = false
    }
  }

  return {
    dashboard, dashboardLoading, dashboardError, followupStatuses, classifiedTotal, donutStyle,
    unitCounts, maxUnitCount, trendMax, trendWidth, trendPoints, trendLabel, loadDashboard, setDashboard,
  }
}
