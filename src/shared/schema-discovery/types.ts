/**
 * Schema Discovery - Core Types
 *
 * 核心类型定义，用于文件发现、Schema 注册和多实例决策
 * @see docs/schema-discovery/40_DESIGN.md
 */

// ============================================================
// 基础类型
// ============================================================

/**
 * 文件载体类型
 */
export type FileCarrier = 'yaml' | 'md-frontmatter'

/**
 * Schema 作用域
 */
export type SchemaScope = 'feature' | 'project'

/**
 * 文件状态
 */
export type FileStatus = 'active' | 'archived' | 'backup'

/**
 * 多实例选择原因（5级优先级链）
 * @see docs/schema-discovery/specs/MULTI_INSTANCE_RESOLUTION_SPEC.md
 */
export type SelectionReason =
  | 'explicit_primary'    // 显式 is_primary: true
  | 'active_status'       // 过滤归档后只剩1个
  | 'latest_modified'     // 最新修改时间
  | 'shallowest_path'     // 最浅路径深度
  | 'alphabetically_first' // 字母序第一
  | 'single_instance'     // 只有单个实例
  | 'no_instances'        // 无实例

// ============================================================
// 发现的文件
// ============================================================

/**
 * 文件元信息（从文件内容中提取）
 */
export interface FileMeta {
  /** 是否为主文件 */
  is_primary?: boolean
  /** 文件版本 */
  version?: string
  /** 文件状态 */
  status?: FileStatus
  /** 功能 ID（从 meta.feature 提取） */
  feature?: string
}

/**
 * 发现的文件
 */
export interface DiscoveredFile {
  /** 相对于项目根目录的路径 */
  path: string
  /** Schema ID，格式：namespace/name@version */
  schema: string
  /** 文件载体类型 */
  carrier: FileCarrier
  /** 文件解析后的内容 */
  content: unknown
  /** 最后修改时间 */
  lastModified: Date
  /** 文件大小（字节） */
  size: number
  /** 是否为降级识别（无 _schema 但通过文件名匹配） */
  isLegacy?: boolean
  /** 文件元信息 */
  meta?: FileMeta
}

// ============================================================
// Schema 定义
// ============================================================

/**
 * Schema 定义
 */
export interface SchemaDefinition {
  /** Schema ID，格式：namespace/name */
  id: string
  /** Schema 版本，格式：major.minor */
  version: string
  /** Schema 描述 */
  description: string
  /** 作用域：feature 级别还是 project 级别 */
  scope: SchemaScope
  /** 是否为必需文件 */
  required: boolean
  /** 用于提取 featureId 的字段路径 */
  identifierField: string
  /** 降级识别的字段列表 */
  legacyFields?: string[]
  /** 支持的载体类型 */
  carriers: FileCarrier[]
}

/**
 * Schema 注册表接口
 */
export interface ISchemaRegistry {
  /** 获取 Schema 定义 */
  get(schemaId: string): SchemaDefinition | undefined
  /** 获取所有 Schema 定义 */
  getAll(): SchemaDefinition[]
  /** 注册新 Schema */
  register(schema: SchemaDefinition): void
  /** 检查 Schema 是否已知 */
  isKnown(schemaId: string): boolean
}

// ============================================================
// Feature 扫描结果
// ============================================================

/**
 * 文件类型到文件的映射
 */
export type FileTypeMap = Record<string, DiscoveredFile>

/**
 * 冲突报告 - UI 层（用于展示）
 */
export interface ConflictReportUI {
  /** 文件类型（如 'progress-log'） */
  fileType: string
  /** 所有实例的路径 */
  instances: string[]
  /** 选中的主文件路径 */
  selectedPath: string
  /** 选择原因的人类可读描述 */
  reasonText: string
  /** 是否有显式 is_primary */
  hasExplicitPrimary: boolean
}

/**
 * 冲突报告 - Raw 层（用于调试）
 */
export interface ConflictReportRaw {
  /** 文件类型 */
  fileType: string
  /** 所有实例详情 */
  instances: DiscoveredFile[]
  /** 选择原因 */
  reason: SelectionReason
  /** 决策过程日志 */
  decisionLog: string[]
}

/**
 * 多实例决策结果
 */
export interface ResolutionResult {
  /** 选中的主文件（可能为 null） */
  primary: DiscoveredFile | null
  /** 选择原因 */
  reason: SelectionReason
  /** 是否有信心（单实例或显式 primary 时为 true） */
  confident: boolean
  /** 所有实例 */
  allInstances: DiscoveredFile[]
  /** 冲突报告 - 调试用 */
  conflictRaw?: ConflictReportRaw
  /** 冲突报告 - UI 展示用 */
  conflictUI?: ConflictReportUI
}

/**
 * Feature 扫描结果
 */
export interface FeatureScanResult {
  /** Feature ID */
  featureId: string
  /** 主文件映射（文件类型 -> 主文件） */
  primaryFiles: FileTypeMap
  /** 所有文件（包括非主文件） */
  allFiles: Record<string, DiscoveredFile[]>
  /** 冲突列表 */
  conflicts: ConflictReportUI[]
  /** 推断的基础目录（仅用于 UI 展示） */
  baseDir?: string
}

// ============================================================
// 未知 Schema 分类
// ============================================================

/**
 * 未知 Schema 分类
 */
export type UnknownSchemaCategory = 'invalid' | 'unknown' | 'legacy'

/**
 * 未知 Schema 提示
 */
export interface UnknownSchemaHint {
  /** 分类 */
  category: UnknownSchemaCategory
  /** 提示消息 */
  message: string
  /** 建议操作 */
  suggestion: string
}

/**
 * 未知 Schema 项
 */
export interface UnknownSchemaItem {
  /** 文件信息 */
  file: DiscoveredFile
  /** 提示信息 */
  hint: UnknownSchemaHint
}

// ============================================================
// 扫描结果
// ============================================================

/**
 * 扫描统计
 */
export interface ScanStats {
  /** 扫描的总文件数 */
  totalFiles: number
  /** 带 schema 的文件数 */
  schemaFiles: number
  /** 扫描耗时（毫秒） */
  scanTime: number
}

/**
 * 项目级配置文件
 */
export interface ProjectLevelFiles {
  /** 工作流配置 */
  workflow?: DiscoveredFile
  /** Phase Gate 配置 */
  phaseGate?: DiscoveredFile
}

/**
 * 完整扫描结果
 */
export interface ScanResult {
  /** Feature 扫描结果映射 */
  features: Map<string, FeatureScanResult>
  /** 项目级配置文件 */
  projectConfig: ProjectLevelFiles
  /** 未知 Schema 列表 */
  unknownSchemas: UnknownSchemaItem[]
  /** 扫描统计 */
  stats: ScanStats
}

// ============================================================
// 校验相关类型
// ============================================================

/**
 * 校验状态
 */
export type ValidationStatus = 'valid' | 'warning' | 'error'

/**
 * 校验问题
 */
export interface ValidationIssue {
  /** 问题级别 */
  level: 'error' | 'warning' | 'info'
  /** 问题代码 */
  code: string
  /** 问题消息 */
  message: string
  /** 相关文件路径 */
  file?: string
  /** 建议操作 */
  suggestion?: string
}

/**
 * Feature 校验报告
 */
export interface FeatureValidationReport {
  /** Feature ID */
  featureId: string
  /** 校验状态 */
  status: ValidationStatus
  /** 缺少的必需文件 */
  missingRequired: string[]
  /** 当前 Phase 缺少的文件 */
  missingForPhase: string[]
  /** 警告列表 */
  warnings: string[]
  /** 详细问题列表 */
  issues: ValidationIssue[]
}

/**
 * 整体校验报告
 */
export interface ValidationReport {
  /** 整体状态 */
  status: ValidationStatus
  /** 各 Feature 的校验报告 */
  featureReports: Map<string, FeatureValidationReport>
  /** 未知 Schema 数量 */
  unknownSchemaCount: number
  /** 校验时间戳 */
  timestamp: Date
}

// ============================================================
// 解析相关类型
// ============================================================

/**
 * YAML 解析结果
 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean
  /** 解析后的内容 */
  content?: unknown
  /** 提取的 schema */
  schema?: string
  /** 错误信息 */
  error?: string
}

/**
 * Frontmatter 解析结果
 */
export interface FrontmatterResult {
  /** 是否成功 */
  success: boolean
  /** frontmatter 内容 */
  frontmatter?: Record<string, unknown>
  /** markdown body */
  body?: string
  /** 提取的 schema */
  schema?: string
  /** 错误信息 */
  error?: string
}
