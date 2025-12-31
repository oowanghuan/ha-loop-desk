/**
 * Schema Discovery - ProjectConfig Defaults
 *
 * project.yaml 配置的默认值
 * @see docs/schema-discovery/specs/PROJECT_YAML_SPEC.md §4
 */

import type {
  ProjectConfig,
  ScannerConfig,
  FeatureSpec,
  MultiInstanceResolutionConfig,
  WritePolicy,
} from './project-config.types'

// ============================================================
// Scanner 默认配置
// ============================================================

/**
 * 默认忽略模式
 */
export const DEFAULT_IGNORE_PATTERNS: string[] = [
  // 依赖目录
  '**/node_modules/**',
  '**/vendor/**',
  '**/.venv/**',
  '**/venv/**',

  // 版本控制
  '**/.git/**',
  '**/.svn/**',

  // 构建输出
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',

  // IDE 配置
  '**/.idea/**',
  '**/.vscode/**',

  // 缓存
  '**/.cache/**',
  '**/coverage/**',

  // 临时文件
  '**/*.log',
  '**/*.tmp',
]

/**
 * 默认扫描器配置
 */
export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  ignore: DEFAULT_IGNORE_PATTERNS,
  maxDepth: 10,
  followSymlinks: false,
}

// ============================================================
// Feature 规格默认配置
// ============================================================

/**
 * 默认 Feature 规格
 */
export const DEFAULT_FEATURE_SPEC: FeatureSpec = {
  fileTypes: {
    'progress-log': {
      required: true,
      maxInstances: 1,
    },
    context: {
      required: true,
      maxInstances: 1,
    },
    design: {
      required: false,
      requiredFromPhase: 4,
      maxInstances: 1,
    },
    'test-plan': {
      required: false,
      requiredFromPhase: 6,
      maxInstances: 1,
    },
    'phase-gate-status': {
      required: false,
      maxInstances: 1,
    },
  },
}

// ============================================================
// 多实例决策默认配置
// ============================================================

/**
 * 默认多实例决策配置
 */
export const DEFAULT_MULTI_INSTANCE_RESOLUTION: MultiInstanceResolutionConfig = {
  priority: [
    'explicit_primary',
    'active_status',
    'latest_modified',
    'shallowest_path',
    'alphabetically_first',
  ],
  archivedStatuses: ['archived', 'backup', 'deprecated', 'obsolete'],
}

// ============================================================
// 写入策略默认配置
// ============================================================

/**
 * 默认写入策略
 */
export const DEFAULT_WRITE_POLICY: WritePolicy = {
  requireConfirmation: true,
  createBackup: false,
  backupSuffix: '.backup.{timestamp}',
}

// ============================================================
// 完整默认配置
// ============================================================

/**
 * 默认项目配置
 */
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  _schema: 'ai-coding/project@1.0',
  project: {
    name: 'unnamed-project',
  },
  scanner: DEFAULT_SCANNER_CONFIG,
  feature_spec: DEFAULT_FEATURE_SPEC,
  multi_instance_resolution: DEFAULT_MULTI_INSTANCE_RESOLUTION,
  write_policy: DEFAULT_WRITE_POLICY,
}

// ============================================================
// 配置合并工具
// ============================================================

/**
 * 深度合并两个对象
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  if (typeof target !== 'object' || target === null) {
    return target
  }

  const result = { ...target } as T

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (sourceValue === undefined) {
      continue
    }

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // 递归合并对象
      result[key] = deepMerge(targetValue, sourceValue as Partial<typeof targetValue>)
    } else {
      // 直接覆盖
      result[key] = sourceValue as T[keyof T]
    }
  }

  return result
}

/**
 * 合并用户配置与默认配置
 */
export function mergeWithDefaults(
  userConfig: Partial<ProjectConfig>
): ProjectConfig {
  return deepMerge(DEFAULT_PROJECT_CONFIG, userConfig) as ProjectConfig
}
