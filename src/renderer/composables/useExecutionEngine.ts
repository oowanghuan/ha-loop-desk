/**
 * useExecutionEngine Composable
 * 提供执行清单的响应式接口
 */

import { ref, computed, watch, onMounted } from 'vue'
import { executionEngine } from '../services/executionEngine'
import { configLoader } from '../services/configLoader'
import { useProjectStore } from '../stores/project.store'
import type { ExecutionItem, FeatureTask } from '../types/workflow.types'

export interface UseExecutionEngineOptions {
  autoLoad?: boolean
}

export function useExecutionEngine(
  phaseIdRef: () => number,
  featureIdRef: () => string,
  options: UseExecutionEngineOptions = {}
) {
  const { autoLoad = true } = options
  const projectStore = useProjectStore()

  // 状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const localDataWarning = ref<string | null>(null)  // 本地数据警告
  const executionList = ref<ExecutionItem[]>([])

  // 分组后的执行清单
  const groupedList = ref<{
    beforeTasks: ExecutionItem[]
    tasks: ExecutionItem[]
    afterTasks: ExecutionItem[]
    endSteps: ExecutionItem[]
  }>({
    beforeTasks: [],
    tasks: [],
    afterTasks: [],
    endSteps: [],
  })

  // 计算属性
  const beforeTaskSteps = computed(() => groupedList.value.beforeTasks)
  const featureTasks = computed(() => groupedList.value.tasks)
  const afterTaskSteps = computed(() => groupedList.value.afterTasks)
  const endSteps = computed(() => groupedList.value.endSteps)

  const totalSteps = computed(() => executionList.value.length)
  const completedSteps = computed(() =>
    executionList.value.filter(item =>
      ['verified', 'approved', 'skipped'].includes(item.status)
    ).length
  )
  const progress = computed(() =>
    totalSteps.value > 0 ? Math.round((completedSteps.value / totalSteps.value) * 100) : 0
  )

  /**
   * 从本地 Schema Discovery 数据获取 Feature Tasks
   */
  function getLocalFeatureTasks(featureId: string, phaseId: number): FeatureTask[] {
    const project = projectStore.currentProject
    if (!project) return []

    const feature = project.features.find(f => f.id === featureId)
    if (!feature) return []

    // Phase ID 映射到 phase.id
    const phaseIdMap: Record<number, string> = {
      0: 'foundation', 1: 'kickoff', 2: 'spec', 3: 'demo',
      4: 'design', 5: 'code', 6: 'test', 7: 'deploy'
    }
    const phaseKey = phaseIdMap[phaseId]
    const phase = feature.phases.find(p => p.id === phaseKey)
    if (!phase) return []

    // 将 steps 转换为 FeatureTask 格式
    return phase.steps
      .filter(step => !step.id.endsWith('-outputs')) // 排除交付物检查 step
      .map(step => ({
        id: step.id,
        task: step.name,
        status: step.status === 'generated' ? 'done' : step.status === 'running' ? 'wip' : 'pending',
        priority: 'P1' as const,
        notes: step.description,
      }))
  }

  // 加载执行清单
  async function loadExecutionList() {
    const phaseId = phaseIdRef()
    const featureId = featureIdRef()

    if (phaseId === undefined || phaseId === null || !featureId) {
      return
    }

    loading.value = true
    error.value = null
    localDataWarning.value = null

    try {
      // 先尝试从本地获取 feature tasks
      const localTasks = getLocalFeatureTasks(featureId, phaseId)

      // 使用带本地数据的方式构建执行清单
      executionList.value = await executionEngine.buildExecutionListWithLocalTasks(
        phaseId,
        featureId,
        localTasks
      )

      // 加载分组后的执行清单
      groupedList.value = await executionEngine.getGroupedExecutionListWithLocalTasks(
        phaseId,
        featureId,
        localTasks
      )

      // 如果没有本地任务，显示提示
      if (localTasks.length === 0) {
        localDataWarning.value = '任务来自 90_PROGRESS_LOG.yaml，当前文件为空或不存在'
      }
    } catch (err: any) {
      console.error('Failed to load execution list:', err)
      error.value = err.message || '加载执行清单失败'
    } finally {
      loading.value = false
    }
  }

  // 刷新
  async function refresh() {
    configLoader.clearCache()
    await loadExecutionList()
  }

  // 获取执行按钮配置
  function getButtonConfig(item: ExecutionItem) {
    return executionEngine.getExecuteButtonConfig(item)
  }

  // 检查是否可执行
  function canExecute(item: ExecutionItem): boolean {
    return executionEngine.canExecuteItem(item)
  }

  // 处理重试策略
  async function handleRerunPolicy(
    item: ExecutionItem,
    showConfirm: (message: string) => Promise<boolean>,
    showToast: (message: string) => void
  ): Promise<boolean> {
    return executionEngine.handleRerunPolicy(item, showConfirm, showToast)
  }

  // 自动加载
  if (autoLoad) {
    onMounted(() => {
      loadExecutionList()
    })

    watch(
      [phaseIdRef, featureIdRef],
      () => {
        loadExecutionList()
      },
      { immediate: false }
    )
  }

  return {
    // 状态
    loading,
    error,
    localDataWarning,
    executionList,

    // 分组
    beforeTaskSteps,
    featureTasks,
    afterTaskSteps,
    endSteps,

    // 统计
    totalSteps,
    completedSteps,
    progress,

    // 方法
    loadExecutionList,
    refresh,
    getButtonConfig,
    canExecute,
    handleRerunPolicy,
  }
}
