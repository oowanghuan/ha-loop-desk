/**
 * Schema Discovery - ProjectConfig Types
 *
 * project.yaml 配置文件的类型定义
 * @see docs/schema-discovery/specs/PROJECT_YAML_SPEC.md
 */

import type { SchemaDefinition } from './types'

// ============================================================
// Scanner 配置
// ============================================================

/**
 * 扫描器配置
 */
export interface ScannerConfig {
  /** 要忽略的 glob 模式列表 */
  ignore: string[]
  /** 额外包含的 glob 模式（覆盖 ignore） */
  include?: string[]
  /** 最大扫描深度 */
  maxDepth?: number
  /** 是否跟踪符号链接 */
  followSymlinks?: boolean
}

// ============================================================
// Schema 扩展配置
// ============================================================

/**
 * Schema 扩展配置
 */
export interface SchemaExtensions {
  /** 自定义 Schema 列表 */
  custom?: SchemaDefinition[]
  /** Schema 覆盖配置 */
  overrides?: Record<string, Partial<SchemaDefinition>>
}

// ============================================================
// Feature 规格配置
// ============================================================

/**
 * 文件类型规格
 */
export interface FileTypeSpec {
  /** 是否必需 */
  required: boolean
  /** 从哪个 Phase 开始需要 */
  requiredFromPhase?: number
  /** 最多允许几个实例 */
  maxInstances?: number
}

/**
 * Feature 规格配置
 */
export interface FeatureSpec {
  /** 各文件类型的规格 */
  fileTypes: Record<string, FileTypeSpec>
}

// ============================================================
// 多实例决策配置
// ============================================================

/**
 * 优先级枚举
 */
export type ResolutionPriority =
  | 'explicit_primary'
  | 'active_status'
  | 'latest_modified'
  | 'shallowest_path'
  | 'alphabetically_first'

/**
 * 多实例决策配置
 */
export interface MultiInstanceResolutionConfig {
  /** 优先级链 */
  priority: ResolutionPriority[]
  /** 归档状态值列表 */
  archivedStatuses: string[]
}

// ============================================================
// 写入策略配置
// ============================================================

/**
 * 写入策略
 */
export interface WritePolicy {
  /** 是否需要确认 */
  requireConfirmation: boolean
  /** 是否创建备份 */
  createBackup: boolean
  /** 备份后缀模板 */
  backupSuffix?: string
}

// ============================================================
// 项目信息
// ============================================================

/**
 * 项目基本信息
 */
export interface ProjectInfo {
  /** 项目名称 */
  name: string
  /** 项目版本 */
  version?: string
  /** 项目描述 */
  description?: string
}

// ============================================================
// 完整项目配置
// ============================================================

/**
 * 项目配置（project.yaml）
 */
export interface ProjectConfig {
  /** Schema 自描述 */
  _schema: 'ai-coding/project@1.0'
  /** 项目信息 */
  project: ProjectInfo
  /** 扫描器配置 */
  scanner?: ScannerConfig
  /** Schema 扩展 */
  schema_extensions?: SchemaExtensions
  /** Feature 规格 */
  feature_spec?: FeatureSpec
  /** 写入策略 */
  write_policy?: WritePolicy
  /** 多实例决策配置 */
  multi_instance_resolution?: MultiInstanceResolutionConfig
}

// ============================================================
// 加载结果
// ============================================================

/**
 * 配置加载来源
 */
export type ConfigSource = 'default' | string

/**
 * 配置加载结果
 */
export interface LoadResult {
  /** 加载的配置 */
  config: ProjectConfig
  /** 配置来源（'default' 或文件路径） */
  source: ConfigSource
  /** 加载警告 */
  warnings?: string[]
}
