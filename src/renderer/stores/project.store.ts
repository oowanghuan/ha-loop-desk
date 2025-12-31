/**
 * 项目状态管理
 * CODE-004: projectStore - 当前项目、项目列表
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Feature, ProjectConfig } from '@shared/types/project.types'
import type {
  ProjectOpenRequest,
  ProjectStateResponse,
  ScanResultForGUI,
  ScannedTemplate
} from '@shared/types/ipc.types'

export const useProjectStore = defineStore('project', () => {
  // ============================================================
  // State
  // ============================================================

  /** 当前项目 */
  const currentProject = ref<Project | null>(null)

  /** Schema Discovery 扫描结果（含模板） */
  const scanResult = ref<ScanResultForGUI | null>(null)

  /** 最近打开的项目列表 */
  const recentProjects = ref<Array<{ path: string; name: string; lastOpened: string }>>([])

  /** 加载状态 */
  const isLoading = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  // ============================================================
  // Getters
  // ============================================================

  /** 当前活跃的 Feature */
  const activeFeature = computed<Feature | undefined>(() => {
    if (!currentProject.value) return undefined
    return currentProject.value.features.find(
      f => f.id === currentProject.value?.activeFeatureId
    )
  })

  /** 项目配置 */
  const config = computed<ProjectConfig | undefined>(() => {
    return currentProject.value?.config
  })

  /** 是否已打开项目 */
  const hasProject = computed(() => currentProject.value !== null)

  /**
   * 获取指定 Phase 的模板（只返回该 Phase 特定的模板，不包含 common）
   */
  function getTemplatesForPhase(phaseId: number): ScannedTemplate[] {
    if (!scanResult.value?.templates) return []

    const templates = scanResult.value.templates
    // 只返回 Phase 特定的模板，common 模板不在这里显示
    // 使用 Record 访问（不是 Map.get）
    return templates.byPhase[phaseId] || []
  }

  // ============================================================
  // Actions
  // ============================================================

  /**
   * 打开项目
   */
  async function openProject(path: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const request: ProjectOpenRequest = { path }
      const response = await window.electronAPI.invoke<{
        project: Project
        scanResult?: ScanResultForGUI
      }>(
        'project:open',
        request
      )

      currentProject.value = response.project
      scanResult.value = response.scanResult || null

      // 添加到最近项目
      addToRecentProjects(path, response.project.name)

      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 刷新项目状态
   */
  async function refreshState(): Promise<boolean> {
    if (!currentProject.value) return false

    try {
      const response = await window.electronAPI.invoke<ProjectStateResponse>(
        'project:state'
      )

      currentProject.value = response.project

      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  /**
   * 设置活跃 Feature
   */
  function setActiveFeature(featureId: string): void {
    if (currentProject.value) {
      currentProject.value.activeFeatureId = featureId
    }
  }

  /**
   * 关闭当前项目
   */
  function closeProject(): void {
    currentProject.value = null
    error.value = null
  }

  /**
   * 添加到最近项目
   */
  function addToRecentProjects(path: string, name: string): void {
    const existing = recentProjects.value.findIndex(p => p.path === path)
    if (existing >= 0) {
      recentProjects.value.splice(existing, 1)
    }

    recentProjects.value.unshift({
      path,
      name,
      lastOpened: new Date().toISOString()
    })

    // 只保留最近 10 个
    if (recentProjects.value.length > 10) {
      recentProjects.value = recentProjects.value.slice(0, 10)
    }

    // 持久化到 localStorage
    try {
      localStorage.setItem('recentProjects', JSON.stringify(recentProjects.value))
    } catch {
      // 忽略存储错误
    }
  }

  /**
   * 加载最近项目列表
   */
  function loadRecentProjects(): void {
    try {
      const stored = localStorage.getItem('recentProjects')
      if (stored) {
        recentProjects.value = JSON.parse(stored)
      }
    } catch {
      // 忽略解析错误
    }
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null
  }

  // 初始化时加载最近项目
  loadRecentProjects()

  return {
    // State
    currentProject,
    scanResult,
    recentProjects,
    isLoading,
    error,

    // Getters
    activeFeature,
    config,
    hasProject,

    // Functions
    getTemplatesForPhase,

    // Actions
    openProject,
    refreshState,
    setActiveFeature,
    closeProject,
    clearError,
    loadRecentProjects
  }
})
