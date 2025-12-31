/**
 * Schema Discovery - Multi-Instance Resolver
 *
 * 多实例冲突决策器，实现 5 级优先级链
 * @see docs/schema-discovery/specs/MULTI_INSTANCE_RESOLUTION_SPEC.md
 */

import type {
  DiscoveredFile,
  SelectionReason,
  ResolutionResult,
  ConflictReportUI,
  ConflictReportRaw,
} from './types'
import type { MultiInstanceResolutionConfig } from './project-config.types'
import { DEFAULT_MULTI_INSTANCE_RESOLUTION } from './project-config.defaults'

// ============================================================
// 选择原因的人类可读描述
// ============================================================

const REASON_TEXTS: Record<SelectionReason, string> = {
  explicit_primary: '该文件显式标记为主文件 (is_primary: true)',
  active_status: '过滤归档文件后仅剩此文件',
  latest_modified: '该文件修改时间最新',
  shallowest_path: '该文件路径层级最浅',
  alphabetically_first: '该文件路径按字母序排第一',
  single_instance: '仅有此单一实例',
  no_instances: '未找到任何实例',
}

// ============================================================
// MultiInstanceResolver 类
// ============================================================

/**
 * 多实例决策器
 */
export class MultiInstanceResolver {
  private config: MultiInstanceResolutionConfig

  constructor(config?: Partial<MultiInstanceResolutionConfig>) {
    this.config = {
      ...DEFAULT_MULTI_INSTANCE_RESOLUTION,
      ...config,
    }
  }

  /**
   * 决策主文件
   * @param instances 所有实例
   * @param fileType 文件类型（如 'progress-log'）
   * @param featureId 功能 ID
   */
  resolvePrimaryFile(
    instances: DiscoveredFile[],
    fileType: string,
    featureId: string
  ): ResolutionResult {
    const decisionLog: string[] = []

    // 无实例
    if (instances.length === 0) {
      return {
        primary: null,
        reason: 'no_instances',
        confident: true,
        allInstances: [],
      }
    }

    // 单实例
    if (instances.length === 1) {
      return {
        primary: instances[0],
        reason: 'single_instance',
        confident: true,
        allInstances: instances,
      }
    }

    decisionLog.push(`开始决策 ${featureId}/${fileType}，共 ${instances.length} 个实例`)

    // 多实例，按优先级链决策
    let candidates = [...instances]
    let selectedReason: SelectionReason = 'alphabetically_first'
    let confident = false

    for (const priority of this.config.priority) {
      const beforeCount = candidates.length
      const result = this.applyPriorityRule(priority, candidates, decisionLog)

      if (result.selected) {
        // 找到明确的主文件
        selectedReason = priority
        confident = result.confident
        candidates = [result.selected]
        decisionLog.push(`✓ ${priority}: 选中 ${result.selected.path}`)
        break
      }

      if (result.filtered.length > 0 && result.filtered.length < beforeCount) {
        // 过滤了部分候选
        candidates = result.filtered
        decisionLog.push(
          `→ ${priority}: 过滤后剩余 ${candidates.length} 个候选`
        )

        if (candidates.length === 1) {
          selectedReason = priority
          confident = priority === 'explicit_primary' || priority === 'active_status'
          decisionLog.push(`✓ ${priority}: 仅剩一个候选 ${candidates[0].path}`)
          break
        }
      } else {
        decisionLog.push(`- ${priority}: 无法区分`)
      }
    }

    const primary = candidates[0]

    // 生成冲突报告
    const hasExplicitPrimary = instances.some(
      (f) => f.meta?.is_primary === true
    )
    const conflictUI = this.buildConflictUI(
      fileType,
      instances,
      primary,
      selectedReason,
      hasExplicitPrimary
    )
    const conflictRaw = this.buildConflictRaw(
      fileType,
      instances,
      selectedReason,
      decisionLog
    )

    return {
      primary,
      reason: selectedReason,
      confident,
      allInstances: instances,
      conflictUI,
      conflictRaw,
    }
  }

  /**
   * 应用优先级规则
   */
  private applyPriorityRule(
    priority: string,
    candidates: DiscoveredFile[],
    decisionLog: string[]
  ): {
    selected?: DiscoveredFile
    filtered: DiscoveredFile[]
    confident: boolean
  } {
    switch (priority) {
      case 'explicit_primary':
        return this.checkExplicitPrimary(candidates)

      case 'active_status':
        return this.checkActiveStatus(candidates)

      case 'latest_modified':
        return this.checkLatestModified(candidates)

      case 'shallowest_path':
        return this.checkShallowestPath(candidates)

      case 'alphabetically_first':
        return this.checkAlphabeticallyFirst(candidates)

      default:
        return { filtered: candidates, confident: false }
    }
  }

  /**
   * 检查显式 is_primary
   */
  private checkExplicitPrimary(candidates: DiscoveredFile[]): {
    selected?: DiscoveredFile
    filtered: DiscoveredFile[]
    confident: boolean
  } {
    const primaries = candidates.filter((f) => f.meta?.is_primary === true)

    if (primaries.length === 1) {
      // 唯一的显式 primary
      return {
        selected: primaries[0],
        filtered: primaries,
        confident: true,
      }
    }

    if (primaries.length > 1) {
      // 多个显式 primary，继续用其他规则筛选
      return {
        filtered: primaries,
        confident: false,
      }
    }

    // 无显式 primary
    return {
      filtered: candidates,
      confident: false,
    }
  }

  /**
   * 检查活跃状态（过滤归档文件）
   */
  private checkActiveStatus(candidates: DiscoveredFile[]): {
    selected?: DiscoveredFile
    filtered: DiscoveredFile[]
    confident: boolean
  } {
    const archivedStatuses = new Set(this.config.archivedStatuses)

    const active = candidates.filter((f) => {
      const status = f.meta?.status
      if (!status) return true // 无状态视为活跃
      return !archivedStatuses.has(status)
    })

    if (active.length === 0) {
      // 全部归档，返回原候选
      return {
        filtered: candidates,
        confident: false,
      }
    }

    if (active.length === 1) {
      // 过滤后只剩一个
      return {
        selected: active[0],
        filtered: active,
        confident: true,
      }
    }

    return {
      filtered: active,
      confident: false,
    }
  }

  /**
   * 检查最新修改时间
   */
  private checkLatestModified(candidates: DiscoveredFile[]): {
    selected?: DiscoveredFile
    filtered: DiscoveredFile[]
    confident: boolean
  } {
    if (candidates.length === 0) {
      return { filtered: [], confident: false }
    }

    // 按修改时间降序排序
    const sorted = [...candidates].sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
    )

    const latest = sorted[0]
    const latestTime = latest.lastModified.getTime()

    // 检查是否有多个文件同时间
    const sameTime = sorted.filter(
      (f) => f.lastModified.getTime() === latestTime
    )

    if (sameTime.length === 1) {
      return {
        selected: latest,
        filtered: [latest],
        confident: false, // 时间可能被意外修改，不完全可信
      }
    }

    return {
      filtered: sameTime,
      confident: false,
    }
  }

  /**
   * 检查最浅路径深度
   */
  private checkShallowestPath(candidates: DiscoveredFile[]): {
    selected?: DiscoveredFile
    filtered: DiscoveredFile[]
    confident: boolean
  } {
    if (candidates.length === 0) {
      return { filtered: [], confident: false }
    }

    // 计算路径深度
    const withDepth = candidates.map((f) => ({
      file: f,
      depth: f.path.split('/').length,
    }))

    const minDepth = Math.min(...withDepth.map((x) => x.depth))
    const shallowest = withDepth
      .filter((x) => x.depth === minDepth)
      .map((x) => x.file)

    if (shallowest.length === 1) {
      return {
        selected: shallowest[0],
        filtered: shallowest,
        confident: false,
      }
    }

    return {
      filtered: shallowest,
      confident: false,
    }
  }

  /**
   * 检查字母序
   */
  private checkAlphabeticallyFirst(candidates: DiscoveredFile[]): {
    selected?: DiscoveredFile
    filtered: DiscoveredFile[]
    confident: boolean
  } {
    if (candidates.length === 0) {
      return { filtered: [], confident: false }
    }

    const sorted = [...candidates].sort((a, b) =>
      a.path.localeCompare(b.path)
    )

    return {
      selected: sorted[0],
      filtered: [sorted[0]],
      confident: false, // 字母序是最后的 fallback，不可信
    }
  }

  /**
   * 构建 UI 层冲突报告
   */
  private buildConflictUI(
    fileType: string,
    instances: DiscoveredFile[],
    selected: DiscoveredFile,
    reason: SelectionReason,
    hasExplicitPrimary: boolean
  ): ConflictReportUI {
    return {
      fileType,
      instances: instances.map((f) => f.path),
      selectedPath: selected.path,
      reasonText: REASON_TEXTS[reason],
      hasExplicitPrimary,
    }
  }

  /**
   * 构建 Raw 层冲突报告
   */
  private buildConflictRaw(
    fileType: string,
    instances: DiscoveredFile[],
    reason: SelectionReason,
    decisionLog: string[]
  ): ConflictReportRaw {
    return {
      fileType,
      instances,
      reason,
      decisionLog,
    }
  }
}

// ============================================================
// 导出默认实例
// ============================================================

/**
 * 默认多实例决策器
 */
export const defaultResolver = new MultiInstanceResolver()
