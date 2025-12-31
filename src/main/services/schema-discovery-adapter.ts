/**
 * Schema Discovery 到 GUI 的适配器
 *
 * 将 Scanner 的扫描结果转换为 GUI 的 Feature 类型
 * 这是 Schema Discovery 与现有 GUI 系统的桥接层
 */

import { join } from 'path'
import type { Feature, Phase, Step, Artifact } from '../../shared/types/project.types'
import type {
  ScanResult,
  FeatureScanResult,
  DiscoveredFile,
  ValidationReport,
  FeatureValidationReport,
} from '../../shared/schema-discovery/types'
import { ProjectScanner } from '../../shared/schema-discovery/scanner'
import { Validator } from '../../shared/schema-discovery/validator'
import {
  loadPhaseOutputs,
  matchOutputs,
  matchedOutputsToArtifacts,
  type PhaseOutputs,
} from '../../shared/schema-discovery/output-matcher'
import {
  scanTemplates,
  getTemplatesForPhase,
  type TemplateScanResult,
  type ScannedTemplate,
} from '../../shared/schema-discovery/template-scanner'

// ============================================================
// 导出类型 - 包含 Schema Discovery 特有信息
// ============================================================

/** 发现的文件信息（简化版，用于 GUI） */
export interface DiscoveredFileInfo {
  /** 文件类型（如 'progress-log', 'context', 'design'） */
  fileType: string
  /** 相对于项目根目录的路径 */
  path: string
  /** 显示名称 */
  displayName: string
  /** Schema ID */
  schema: string
}

/** 扩展的 Feature 类型，包含校验信息 */
export interface FeatureWithValidation extends Feature {
  /** 校验状态 */
  validationStatus: 'valid' | 'warning' | 'error'
  /** 缺失的必需文件 */
  missingRequired: string[]
  /** 缺失的阶段相关文件 */
  missingForPhase: string[]
  /** 是否有多实例冲突 */
  hasConflicts: boolean
  /** 冲突详情 */
  conflicts: ConflictInfo[]
  /** 发现的文件列表 */
  discoveredFiles: DiscoveredFileInfo[]
}

/** 冲突信息 */
export interface ConflictInfo {
  fileType: string
  instances: Array<{
    path: string
    isPrimary: boolean
    selectionReason?: string
  }>
}

/** 完整的扫描结果（供 GUI 使用） */
export interface ScanResultForGUI {
  features: FeatureWithValidation[]
  unknownSchemaCount: number
  scanStats: {
    totalFiles: number
    schemaFiles: number
    scanTime: number
  }
  warnings: string[]
  /** 扫描到的模板（按 Phase 分组） */
  templates?: TemplateScanResult
}

// ============================================================
// 适配器实现
// ============================================================

/**
 * 执行项目扫描并转换为 GUI 格式
 */
export async function scanProjectForGUI(
  projectRoot: string
): Promise<ScanResultForGUI> {
  // 1. 执行 Feature 扫描
  const scanner = new ProjectScanner()
  const scanResult = await scanner.scan(projectRoot)

  // 2. 执行校验
  const validator = new Validator()
  const validationReport = validator.validate(scanResult)

  // 3. 扫描模板目录
  const templates = scanTemplates(projectRoot)
  console.log(`[Template Scanner] Found ${templates.stats.totalTemplates} templates`)

  // 4. 转换为 GUI 格式
  return convertToGUIFormat(scanResult, validationReport, projectRoot, templates)
}

/**
 * 同步版本的扫描
 */
export function scanProjectForGUISync(projectRoot: string): ScanResultForGUI {
  const scanner = new ProjectScanner()
  const scanResult = scanner.scanSync(projectRoot)

  const validator = new Validator()
  const validationReport = validator.validate(scanResult)

  // 扫描模板目录
  const templates = scanTemplates(projectRoot)
  console.log(`[Template Scanner] Found ${templates.stats.totalTemplates} templates`)

  return convertToGUIFormat(scanResult, validationReport, projectRoot, templates)
}

/**
 * 将扫描结果转换为 GUI 格式
 */
function convertToGUIFormat(
  scanResult: ScanResult,
  validationReport: ValidationReport,
  projectRoot: string,
  templates?: TemplateScanResult
): ScanResultForGUI {
  const features: FeatureWithValidation[] = []
  const warnings: string[] = []

  // 转换每个 feature
  for (const [featureId, featureScan] of scanResult.features) {
    const featureReport = validationReport.featureReports.get(featureId)
    const feature = convertFeature(
      featureId,
      featureScan,
      featureReport,
      projectRoot
    )
    features.push(feature)
  }

  // 处理 unknown schemas 警告
  if (scanResult.unknownSchemas.length > 0) {
    warnings.push(
      `发现 ${scanResult.unknownSchemas.length} 个未知 schema 的文件`
    )
  }

  return {
    features,
    unknownSchemaCount: scanResult.unknownSchemas.length,
    scanStats: scanResult.stats,
    warnings,
    templates,
  }
}

/**
 * 转换单个 Feature
 */
function convertFeature(
  featureId: string,
  featureScan: FeatureScanResult,
  featureReport: FeatureValidationReport | undefined,
  projectRoot: string
): FeatureWithValidation {
  // 获取 progress-log 文件内容
  const progressLogFile = featureScan.primaryFiles['progress-log']
  const progressLogContent = progressLogFile?.content as Record<
    string,
    unknown
  > | null

  // 从 progress-log 提取元信息
  const meta = (progressLogContent?.meta || {}) as Record<string, unknown>
  const featureName = (meta.feature_name as string) || formatFeatureName(featureId)
  const currentPhase = (meta.current_phase as number) || 1
  const startedAt = (meta.started_at as string) || new Date().toISOString()
  const lastUpdated =
    (meta.last_updated as string) || new Date().toISOString()

  // 计算 feature 路径
  const featurePath = progressLogFile
    ? join(projectRoot, progressLogFile.path.replace(/\/[^/]+$/, ''))
    : join(projectRoot, 'docs', featureId)

  // 构建发现的文件列表（先构建，供后续匹配使用）
  const discoveredFiles = buildDiscoveredFiles(featureScan)

  // 加载 PHASE_GATE.yaml 定义的 required_outputs
  const phaseOutputs = loadPhaseOutputs(featurePath)

  // 构建 phases（含 artifacts 匹配）
  const phases = progressLogContent
    ? buildPhasesFromProgressLog(progressLogContent, phaseOutputs, discoveredFiles, featurePath, projectRoot)
    : buildDefaultPhases(phaseOutputs, discoveredFiles, featurePath, projectRoot)

  // 构建冲突信息
  const conflicts = buildConflictInfo(featureScan)

  // 构建校验状态
  const validationStatus = featureReport?.status || 'valid'
  const missingRequired = featureReport?.missingRequired || []
  const missingForPhase = featureReport?.missingForPhase || []

  return {
    id: featureId,
    name: featureName,
    path: featurePath,
    description: (meta.description as string) || undefined,
    phases,
    currentPhase,
    createdAt: startedAt,
    updatedAt: lastUpdated,
    // Schema Discovery 扩展字段
    validationStatus,
    missingRequired,
    missingForPhase,
    hasConflicts: conflicts.length > 0,
    conflicts,
    discoveredFiles,
  }
}

/**
 * 构建发现的文件列表
 */
function buildDiscoveredFiles(featureScan: FeatureScanResult): DiscoveredFileInfo[] {
  const files: DiscoveredFileInfo[] = []

  // 文件类型显示名称映射
  const displayNames: Record<string, string> = {
    'progress-log': 'Progress Log',
    'context': 'Context 文档',
    'design': 'Design 设计文档',
    'test-plan': 'Test Plan 测试计划',
    'phase-gate-status': 'Phase Gate 状态',
    'phase-gate': 'Phase Gate 配置',
  }

  for (const [fileType, file] of Object.entries(featureScan.primaryFiles)) {
    if (file) {
      files.push({
        fileType,
        path: file.path,
        displayName: displayNames[fileType] || fileType,
        schema: file.schema,
      })
    }
  }

  return files
}

/**
 * 格式化 feature ID 为显示名称
 */
function formatFeatureName(featureId: string): string {
  return featureId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * 构建冲突信息
 */
function buildConflictInfo(featureScan: FeatureScanResult): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []

  for (const conflict of featureScan.conflicts) {
    // conflict.instances 是 string[] 路径数组
    const instances = conflict.instances.map((instPath) => ({
      path: instPath,
      isPrimary: instPath === conflict.selectedPath,
      selectionReason:
        instPath === conflict.selectedPath
          ? conflict.reasonText
          : undefined,
    }))

    conflicts.push({
      fileType: conflict.fileType,
      instances,
    })
  }

  return conflicts
}

// ============================================================
// Phase 构建逻辑（复用现有逻辑）
// ============================================================

/**
 * 构建默认的 phases（含 artifacts 匹配）
 */
function buildDefaultPhases(
  phaseOutputs: PhaseOutputs[],
  discoveredFiles: DiscoveredFileInfo[],
  featurePath: string,
  projectRoot: string
): Phase[] {
  const phaseNames = [
    { id: 'kickoff', name: 'Kickoff', phaseId: 1 },
    { id: 'spec', name: 'Spec', phaseId: 2 },
    { id: 'demo', name: 'Demo', phaseId: 3 },
    { id: 'design', name: 'Design', phaseId: 4 },
    { id: 'code', name: 'Code', phaseId: 5 },
    { id: 'test', name: 'Test', phaseId: 6 },
    { id: 'deploy', name: 'Deploy', phaseId: 7 },
  ]

  return phaseNames.map((phase, index) => {
    // 获取该 phase 的 required_outputs
    const phaseOutput = phaseOutputs.find(p => p.phaseId === phase.phaseId)
    const requiredOutputs = phaseOutput?.requiredOutputs || []

    // 匹配发现的文件
    const matchedOutputs = matchOutputs(requiredOutputs, discoveredFiles, featurePath, projectRoot)
    const artifacts = matchedOutputsToArtifacts(matchedOutputs)

    // 为每个 phase 创建一个汇总 step
    const steps: Step[] = artifacts.length > 0 ? [{
      id: `${phase.id}-outputs`,
      name: `${phase.name} 交付物`,
      description: `Phase ${phase.phaseId} 需要的输出文件`,
      status: artifacts.every(a => a.exists) ? 'generated' : 'pending',
      artifacts,
      interactions: [],
      preflightChecks: [],
      canApprove: artifacts.every(a => a.exists),
      canRollback: false,
    }] : []

    return {
      id: phase.id,
      name: phase.name,
      description: `Phase ${index + 1}`,
      status: 'pending' as Phase['status'],
      steps,
      gateStatus: 'open' as const,
    }
  })
}

/**
 * 从 progress log 构建 phases（含 artifacts 匹配）
 */
function buildPhasesFromProgressLog(
  progressLog: Record<string, unknown>,
  phaseOutputs: PhaseOutputs[],
  discoveredFiles: DiscoveredFileInfo[],
  featurePath: string,
  projectRoot: string
): Phase[] {
  const phaseNames = [
    { key: 'phase_1_kickoff', name: 'Kickoff', id: 'kickoff', phaseId: 1 },
    { key: 'phase_2_spec', name: 'Spec', id: 'spec', phaseId: 2 },
    { key: 'phase_3_demo', name: 'Demo', id: 'demo', phaseId: 3 },
    { key: 'phase_4_design', name: 'Design', id: 'design', phaseId: 4 },
    { key: 'phase_5_code', name: 'Code', id: 'code', phaseId: 5 },
    { key: 'phase_6_test', name: 'Test', id: 'test', phaseId: 6 },
    { key: 'phase_7_deploy', name: 'Deploy', id: 'deploy', phaseId: 7 },
  ]

  return phaseNames.map((phase, index) => {
    const phaseData = progressLog[phase.key] as Record<string, unknown> | undefined
    const status = (phaseData?.status as string) || 'pending'
    const tasks = (phaseData?.tasks || []) as Array<Record<string, unknown>>

    // 获取该 phase 的 required_outputs 并匹配
    const phaseOutput = phaseOutputs.find(p => p.phaseId === phase.phaseId)
    const requiredOutputs = phaseOutput?.requiredOutputs || []
    const matchedOutputs = matchOutputs(requiredOutputs, discoveredFiles, featurePath, projectRoot)
    const phaseArtifacts = matchedOutputsToArtifacts(matchedOutputs)

    // 构建 steps（来自 progress log 的 tasks）
    const steps: Step[] = tasks.map((task) => ({
      id: task.id as string,
      name: task.task as string,
      description: (task.notes as string) || '',
      status: mapTaskStatus(task.status as string),
      artifacts: [],
      interactions: [],
      preflightChecks: [],
      command: task.command as string | undefined,
      canApprove: task.status === 'done',
      canRollback: false,
    }))

    // 如果有 required_outputs，添加一个"交付物检查"step
    if (phaseArtifacts.length > 0) {
      const outputsStep: Step = {
        id: `${phase.id}-outputs`,
        name: '交付物检查',
        description: `Phase ${phase.phaseId} 需要的输出文件`,
        status: phaseArtifacts.every(a => a.exists) ? 'generated' : 'pending',
        artifacts: phaseArtifacts,
        interactions: [],
        preflightChecks: [],
        canApprove: phaseArtifacts.every(a => a.exists),
        canRollback: false,
      }
      // 将交付物检查放在最前面
      steps.unshift(outputsStep)
    }

    return {
      id: phase.id,
      name: phase.name,
      description: `Phase ${index + 1}`,
      status: mapPhaseStatus(status),
      steps,
      gateStatus: phaseData?.gate_passed ? 'passed' : 'open',
    }
  })
}

function mapTaskStatus(status: string): Step['status'] {
  switch (status) {
    case 'done':
      return 'generated'
    case 'wip':
      return 'running'
    case 'pending':
      return 'pending'
    case 'failed':
      return 'failed'
    case 'skipped':
      return 'skipped'
    default:
      return 'pending'
  }
}

function mapPhaseStatus(status: string): Phase['status'] {
  switch (status) {
    case 'done':
      return 'completed'
    case 'wip':
      return 'active'
    case 'pending':
      return 'pending'
    case 'blocked':
      return 'blocked'
    case 'skipped':
      return 'skipped'
    default:
      return 'pending'
  }
}
