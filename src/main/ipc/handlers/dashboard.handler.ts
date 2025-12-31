/**
 * Dashboard IPC Handler
 * 处理 Dashboard 相关的 IPC 请求
 */

import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { getCurrentProject } from './project.handler'

// ============================================================
// 类型定义
// ============================================================

interface RawFeature {
  id: string
  meta?: {
    feature_name?: string
    current_phase?: number
    status?: string
    last_updated?: string
  }
  [key: string]: unknown
}

interface PhaseStatus {
  phaseId: number
  phaseName: string
  status: 'done' | 'wip' | 'pending' | 'blocked' | 'skipped'
  progress: number
  startDate?: string
  endDate?: string
}

interface FeatureInfo {
  id: string
  name: string
  description?: string
  status: 'wip' | 'done' | 'blocked' | 'pending'
  currentPhase: number
  currentPhaseName: string
  progress: number
  phases: PhaseStatus[]
  lastUpdated: string | null
}

interface ScanResult {
  features: RawFeature[]
  warnings: string[]
}

interface DashboardFeaturesResponse {
  features: FeatureInfo[]
  warnings: string[]
}

// Daily Standup 相关类型
interface StandupHighlight {
  feature_id: string
  feature_name: string
  summary: string
}

interface StandupBlocker {
  feature_id: string
  issue: string
  blocked_since: string
}

interface StandupTomorrow {
  feature_id: string
  plan: string
}

interface StandupMilestone {
  date: string
  content: string
}

interface ProjectSummary {
  total_features: number
  features_in_progress: number
  features_blocked: number
  overall_health: 'good' | 'warning' | 'critical'
}

interface RawStandupData {
  meta?: {
    date?: string
    generated_by?: string
    generated_at?: string
  }
  highlights?: StandupHighlight[]
  blockers?: StandupBlocker[]
  tomorrow?: StandupTomorrow[]
  milestones?: StandupMilestone[]
  project_summary?: ProjectSummary
}

interface DashboardStandupResponse {
  highlights: Array<{
    featureId: string
    featureName: string
    summary: string
  }>
  blockers: Array<{
    featureId: string
    featureName: string
    issue: string
    blockedSince: string
  }>
  tomorrow: Array<{
    featureId: string
    plan: string
  }>
  lastUpdated: string | null
  warnings: string[]
}

// ============================================================
// Phase 名称映射
// ============================================================

const PHASE_NAMES: Record<number, string> = {
  1: 'Kickoff',
  2: 'Spec',
  3: 'Demo',
  4: 'Design',
  5: 'Code',
  6: 'Test',
  7: 'Deploy'
}

function getPhaseNameById(phaseId: number): string {
  return PHASE_NAMES[phaseId] || `Phase ${phaseId}`
}

// ============================================================
// 工具函数
// ============================================================

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * 将日期值转换为 YYYY-MM-DD 格式字符串
 * 处理 Date 对象、ISO 字符串、YAML 日期等各种格式
 */
function normalizeDate(value: unknown): string | undefined {
  if (!value) return undefined

  let date: Date | null = null

  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string') {
    // 尝试解析字符串日期
    date = new Date(value)
  } else if (typeof value === 'number') {
    // 时间戳
    date = new Date(value)
  }

  if (date && !isNaN(date.getTime())) {
    // 格式化为 YYYY-MM-DD
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return undefined
}

function calculatePhaseProgress(phaseData: Record<string, unknown> | undefined): number {
  if (!phaseData) return 0

  const tasks = phaseData.tasks as Array<{ status?: string }> | undefined
  if (!tasks || tasks.length === 0) {
    // 如果没有 tasks，根据 status 判断
    const status = phaseData.status as string | undefined
    if (status === 'done') return 100
    if (status === 'wip') return 50
    return 0
  }

  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length

  return Math.round((done / total) * 100)
}

function extractPhases(feature: RawFeature): PhaseStatus[] {
  const phases: PhaseStatus[] = []

  for (let i = 1; i <= 7; i++) {
    // 查找对应的 phase 数据（phase_1_kickoff, phase_2_spec, etc.）
    const phaseKey = `phase_${i}_${PHASE_NAMES[i]?.toLowerCase()}`
    const phaseData = feature[phaseKey] as Record<string, unknown> | undefined

    // 提取日期信息
    let startDate: string | undefined
    let endDate: string | undefined

    // 优先从 phase 级别获取（使用 normalizeDate 处理各种日期格式）
    if (phaseData?.started_at) {
      startDate = normalizeDate(phaseData.started_at)
    }
    if (phaseData?.completed_at) {
      endDate = normalizeDate(phaseData.completed_at)
    }

    // 如果 phase 级别没有，从 tasks 中提取
    if (phaseData?.tasks) {
      const tasks = phaseData.tasks as Array<{
        started_at?: unknown
        completed_at?: unknown
        status?: string
      }> | undefined

      if (tasks && tasks.length > 0) {
        // 收集所有有效日期
        const allDates: string[] = []

        for (const task of tasks) {
          const taskStart = normalizeDate(task.started_at)
          const taskEnd = normalizeDate(task.completed_at)
          if (taskStart) allDates.push(taskStart)
          if (taskEnd) allDates.push(taskEnd)
        }

        if (allDates.length > 0) {
          // 排序日期，获取最早和最晚
          const sortedDates = [...new Set(allDates)].sort()

          if (!startDate) {
            startDate = sortedDates[0]
          }
          if (!endDate) {
            endDate = sortedDates[sortedDates.length - 1]
          }
        }
      }
    }

    const status = (phaseData?.status as PhaseStatus['status']) || 'pending'

    phases.push({
      phaseId: i,
      phaseName: PHASE_NAMES[i],
      status,
      progress: calculatePhaseProgress(phaseData),
      startDate,
      endDate
    })
  }

  return phases
}

function calculateProgress(feature: RawFeature): number {
  // 统计所有 phase 的完成任务数
  let totalTasks = 0
  let doneTasks = 0

  for (const key of Object.keys(feature)) {
    if (key.startsWith('phase_')) {
      const phaseData = feature[key] as Record<string, unknown> | undefined
      const tasks = phaseData?.tasks as Array<{ status?: string }> | undefined

      if (tasks) {
        for (const task of tasks) {
          totalTasks++
          if (task.status === 'done') doneTasks++
        }
      }
    }
  }

  return totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
}

// ============================================================
// 核心扫描函数
// ============================================================

async function scanFeatures(docsPath: string): Promise<ScanResult> {
  const features: RawFeature[] = []
  const warnings: string[] = []

  try {
    // 读取 docs 目录
    const entries = await readdir(docsPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('_')) continue // 跳过 _system, _templates 等

      const progressLogPath = join(docsPath, entry.name, '90_PROGRESS_LOG.yaml')

      if (await fileExists(progressLogPath)) {
        try {
          const content = await readFile(progressLogPath, 'utf-8')
          const parsed = parseYaml(content) as Record<string, unknown>
          features.push({
            id: entry.name,
            ...parsed
          })
        } catch (e) {
          // 记录解析失败但继续扫描其他 Feature
          const errMsg = e instanceof Error ? e.message : String(e)
          warnings.push(`Failed to parse ${entry.name}/90_PROGRESS_LOG.yaml: ${errMsg}`)
          console.warn(`[Dashboard] ${warnings[warnings.length - 1]}`)
        }
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    warnings.push(`Failed to scan docs directory: ${errMsg}`)
    console.error(`[Dashboard] ${warnings[warnings.length - 1]}`)
  }

  return { features, warnings }
}

// ============================================================
// IPC Handler
// ============================================================

export async function handleDashboardGetFeatures(): Promise<DashboardFeaturesResponse> {
  const project = getCurrentProject()

  if (!project) {
    return { features: [], warnings: ['No project is currently open'] }
  }

  const docsPath = join(project.path, 'docs')

  // 检查 docs 目录是否存在
  if (!(await fileExists(docsPath))) {
    return { features: [], warnings: [`docs directory not found at ${docsPath}`] }
  }

  // 扫描 docs 目录下所有 Feature
  const { features: rawFeatures, warnings } = await scanFeatures(docsPath)

  // 如有解析警告，记录日志
  if (warnings.length > 0) {
    console.warn('[Dashboard] Scan warnings:', warnings)
  }

  // 转换为 FeatureInfo 格式
  const features: FeatureInfo[] = rawFeatures.map(f => ({
    id: f.id,
    name: f.meta?.feature_name || f.id,
    status: (f.meta?.status as FeatureInfo['status']) || 'pending',
    currentPhase: f.meta?.current_phase || 1,
    currentPhaseName: getPhaseNameById(f.meta?.current_phase || 1),
    progress: calculateProgress(f),
    phases: extractPhases(f),
    lastUpdated: f.meta?.last_updated || null
  }))

  return { features, warnings }
}

// ============================================================
// Daily Standup Handler
// ============================================================

export async function handleDashboardGetStandup(): Promise<DashboardStandupResponse> {
  const project = getCurrentProject()
  const emptyResponse: DashboardStandupResponse = {
    highlights: [],
    blockers: [],
    tomorrow: [],
    lastUpdated: null,
    warnings: []
  }

  if (!project) {
    return { ...emptyResponse, warnings: ['No project is currently open'] }
  }

  // 查找 PROJECT_DAILY_STANDUP.yaml 文件
  // 可能的路径：docs/_foundation/PROJECT_DAILY_STANDUP.yaml
  const possiblePaths = [
    join(project.path, 'docs', '_foundation', 'PROJECT_DAILY_STANDUP.yaml'),
    join(project.path, 'docs', '_system', 'PROJECT_DAILY_STANDUP.yaml'),
    join(project.path, 'PROJECT_DAILY_STANDUP.yaml')
  ]

  let standupPath: string | null = null
  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      standupPath = path
      break
    }
  }

  if (!standupPath) {
    return {
      ...emptyResponse,
      warnings: ['PROJECT_DAILY_STANDUP.yaml not found. Run /end-day to generate it.']
    }
  }

  try {
    const content = await readFile(standupPath, 'utf-8')
    const parsed = parseYaml(content) as RawStandupData

    // 转换为前端期望的格式
    const highlights = (parsed.highlights || []).map(h => ({
      featureId: h.feature_id,
      featureName: h.feature_name,
      summary: h.summary
    }))

    const blockers = (parsed.blockers || []).map(b => ({
      featureId: b.feature_id,
      featureName: b.feature_id, // YAML 中可能没有 feature_name
      issue: b.issue,
      blockedSince: normalizeDate(b.blocked_since) || b.blocked_since
    }))

    const tomorrow = (parsed.tomorrow || []).map(t => ({
      featureId: t.feature_id,
      plan: t.plan
    }))

    const lastUpdated = parsed.meta?.generated_at || parsed.meta?.date || null

    return {
      highlights,
      blockers,
      tomorrow,
      lastUpdated,
      warnings: []
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error('[Dashboard] Failed to parse PROJECT_DAILY_STANDUP.yaml:', errMsg)
    return {
      ...emptyResponse,
      warnings: [`Failed to parse PROJECT_DAILY_STANDUP.yaml: ${errMsg}`]
    }
  }
}
