/**
 * Dashboard Store - Pinia 状态管理
 * 管理 Dashboard 视图的所有 Features 数据
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  FeatureInfo,
  DashboardFeaturesResponse,
  StandupData,
  StandupItem,
  BlockerItem,
  PlanItem
} from '../types/dashboard.types'

// Standup API 响应类型
interface DashboardStandupResponse {
  highlights: StandupItem[]
  blockers: BlockerItem[]
  tomorrow: PlanItem[]
  lastUpdated: string | null
  warnings: string[]
}

export const useDashboardStore = defineStore('dashboard', () => {
  // ============================================================
  // State
  // ============================================================

  /** Feature 列表 */
  const features = ref<FeatureInfo[]>([])

  /** 加载状态 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  /** 最后更新时间 */
  const lastUpdated = ref<string | null>(null)

  /** 扫描警告信息 */
  const warnings = ref<string[]>([])

  /** Daily Standup 数据 */
  const standup = ref<StandupData>({
    highlights: [],
    blockers: [],
    tomorrow: []
  })

  /** Standup 最后更新时间 */
  const standupLastUpdated = ref<string | null>(null)

  // ============================================================
  // Getters
  // ============================================================

  /** 进行中的 Features */
  const wipFeatures = computed(() =>
    features.value.filter(f => f.status === 'wip')
  )

  /** 已完成的 Features */
  const doneFeatures = computed(() =>
    features.value.filter(f => f.status === 'done')
  )

  /** 阻塞的 Features */
  const blockedFeatures = computed(() =>
    features.value.filter(f => f.status === 'blocked')
  )

  /** Feature 总数 */
  const totalCount = computed(() => features.value.length)

  /** 总体进度（所有 Features 的平均进度） */
  const overallProgress = computed(() => {
    if (features.value.length === 0) return 0
    const sum = features.value.reduce((acc, f) => acc + f.progress, 0)
    return Math.round(sum / features.value.length)
  })

  // ============================================================
  // Actions
  // ============================================================

  /**
   * 加载所有 Features
   */
  async function loadFeatures(): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const response = await window.electronAPI.invoke<DashboardFeaturesResponse>(
        'dashboard:getFeatures'
      )

      features.value = response.features
      warnings.value = response.warnings || []
      lastUpdated.value = new Date().toISOString()

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load features'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新单个 Feature
   */
  function updateFeature(featureId: string, updates: Partial<FeatureInfo>): void {
    const index = features.value.findIndex(f => f.id === featureId)
    if (index !== -1) {
      features.value[index] = { ...features.value[index], ...updates }
    }
  }

  /**
   * 根据 ID 获取 Feature
   */
  function getFeatureById(featureId: string): FeatureInfo | undefined {
    return features.value.find(f => f.id === featureId)
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * 清除警告
   */
  function clearWarnings(): void {
    warnings.value = []
  }

  /**
   * 加载 Daily Standup 数据
   */
  async function loadStandup(): Promise<boolean> {
    try {
      const response = await window.electronAPI.invoke<DashboardStandupResponse>(
        'dashboard:getStandup'
      )

      standup.value = {
        highlights: response.highlights,
        blockers: response.blockers,
        tomorrow: response.tomorrow
      }
      standupLastUpdated.value = response.lastUpdated

      // 合并警告
      if (response.warnings?.length) {
        warnings.value = [...warnings.value, ...response.warnings]
      }

      return true
    } catch (err) {
      console.error('[Dashboard Store] Failed to load standup:', err)
      // 不设置 error，让 features 可以正常显示
      return false
    }
  }

  return {
    // State
    features,
    loading,
    error,
    lastUpdated,
    warnings,
    standup,
    standupLastUpdated,

    // Getters
    wipFeatures,
    doneFeatures,
    blockedFeatures,
    totalCount,
    overallProgress,

    // Actions
    loadFeatures,
    loadStandup,
    updateFeature,
    getFeatureById,
    clearError,
    clearWarnings
  }
})
