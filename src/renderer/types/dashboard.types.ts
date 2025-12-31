/**
 * Dashboard View 类型定义
 * 基于 40_DESIGN_FINAL.md v1.1
 */

// ============================================================
// Feature 信息
// ============================================================

export type FeatureStatus = 'wip' | 'done' | 'blocked' | 'pending'
export type PhaseStatusType = 'done' | 'wip' | 'pending' | 'blocked' | 'skipped'

export interface PhaseStatus {
  phaseId: number
  phaseName: string
  status: PhaseStatusType
  progress: number
  startDate?: string  // ISO date string
  endDate?: string    // ISO date string
}

export interface FeatureInfo {
  id: string
  name: string
  description?: string
  status: FeatureStatus
  currentPhase: number
  currentPhaseName: string
  progress: number
  phases: PhaseStatus[]
  lastUpdated: string | null
}

// ============================================================
// Gantt Chart 类型
// ============================================================

export interface GanttFeature extends FeatureInfo {
  collapsed: boolean
  startDate?: string
  endDate?: string
}

export interface GanttPhase extends PhaseStatus {
  startDate?: string
  endDate?: string
}

export interface DateRange {
  start: string
  end: string
}

// ============================================================
// Daily Standup 类型
// ============================================================

export interface StandupItem {
  featureId: string
  featureName: string
  summary: string
}

export interface BlockerItem {
  featureId: string
  featureName: string
  issue: string
  blockedSince: string
}

export interface PlanItem {
  featureId?: string
  plan: string
}

export interface StandupData {
  highlights: StandupItem[]
  blockers: BlockerItem[]
  tomorrow: PlanItem[]
}

// ============================================================
// 视图模式
// ============================================================

export type ViewMode = 'gantt' | 'card' | 'list'
export type FilterMode = 'all' | 'wip' | 'done' | 'blocked'

// ============================================================
// IPC 响应类型
// ============================================================

export interface DashboardFeaturesResponse {
  features: FeatureInfo[]
  warnings?: string[]
}
