/**
 * useDashboard Composable
 * Dashboard 视图的核心业务逻辑
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDashboardStore } from '../stores/dashboard.store'
import type { ViewMode, FilterMode, StandupData } from '../types/dashboard.types'

export function useDashboard() {
  const store = useDashboardStore()

  // ============================================================
  // 视图状态
  // ============================================================

  const viewMode = ref<ViewMode>('gantt')
  const filter = ref<FilterMode>('all')
  const searchQuery = ref('')

  // ============================================================
  // 数据计算
  // ============================================================

  const features = computed(() => store.features)
  const loading = computed(() => store.loading)
  const error = computed(() => store.error)
  const warnings = computed(() => store.warnings)
  const lastUpdated = computed(() => store.lastUpdated)

  // ============================================================
  // Daily Standup 数据（从 YAML 文件读取）
  // ============================================================

  const standup = computed<StandupData>(() => store.standup)

  // ============================================================
  // 筛选后的 Features
  // ============================================================

  const filteredFeatures = computed(() => {
    let result = store.features

    // 按状态筛选
    if (filter.value !== 'all') {
      result = result.filter(f => f.status === filter.value)
    }

    // 按搜索词筛选
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(f =>
        f.id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
      )
    }

    return result
  })

  // ============================================================
  // 统计数据
  // ============================================================

  const stats = computed(() => ({
    total: store.totalCount,
    wip: store.wipFeatures.length,
    done: store.doneFeatures.length,
    blocked: store.blockedFeatures.length,
    overallProgress: store.overallProgress
  }))

  // ============================================================
  // 方法
  // ============================================================

  const refresh = async () => {
    // 并行加载 features 和 standup 数据
    await Promise.all([
      store.loadFeatures(),
      store.loadStandup()
    ])
  }

  const setViewMode = (mode: ViewMode) => {
    viewMode.value = mode
  }

  const setFilter = (mode: FilterMode) => {
    filter.value = mode
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const clearError = () => {
    store.clearError()
  }

  // ============================================================
  // 生命周期
  // ============================================================

  let refreshInterval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    // 初始加载
    refresh()

    // 可选：自动刷新（每 60 秒）
    // refreshInterval = setInterval(refresh, 60000)
  })

  onUnmounted(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
  })

  return {
    // 数据
    features,
    filteredFeatures,
    standup,
    stats,
    loading,
    error,
    warnings,
    lastUpdated,

    // 视图状态
    viewMode,
    filter,
    searchQuery,

    // 方法
    refresh,
    setViewMode,
    setFilter,
    setSearchQuery,
    clearError
  }
}
