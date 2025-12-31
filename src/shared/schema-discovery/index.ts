/**
 * Schema Discovery
 *
 * 文件发现和校验模块
 * @see docs/schema-discovery/40_DESIGN.md
 */

// 核心类型
export * from './types'

// 配置类型和默认值
export * from './project-config.types'
export * from './project-config.defaults'
export { loadProjectConfig, loadProjectConfigSync, findConfigFile, lintProjectConfig } from './project-loader'

// Schema 注册表
export { SchemaRegistry, BUILTIN_SCHEMAS, defaultRegistry } from './registry'

// 扫描器
export { ProjectScanner, createScanner } from './scanner'
export type { ScannerOptions } from './scanner'

// 多实例决策器
export { MultiInstanceResolver, defaultResolver } from './multi-instance-resolver'

// 降级检测器
export { LegacyDetector, LEGACY_DETECTION_RULES, defaultLegacyDetector } from './legacy-detector'
export type { LegacyDetectionRule } from './legacy-detector'

// 校验器
export { Validator, defaultValidator } from './validator'

// 解析器
export * from './parsers'

// 校验器子模块
export * from './validators'
