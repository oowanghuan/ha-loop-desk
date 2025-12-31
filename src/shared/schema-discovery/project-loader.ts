/**
 * Schema Discovery - ProjectConfig Loader
 *
 * 加载和解析 project.yaml 配置文件
 * @see docs/schema-discovery/specs/PROJECT_YAML_SPEC.md
 */

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import type { ProjectConfig, LoadResult } from './project-config.types'
import {
  DEFAULT_PROJECT_CONFIG,
  mergeWithDefaults,
} from './project-config.defaults'

// ============================================================
// 配置文件查找
// ============================================================

/**
 * 配置文件优先级列表（从高到低）
 */
const CONFIG_FILE_PRIORITY = [
  'project.yaml',
  'ai-coding.project.yaml',
  '.ai-coding/project.yaml',
]

/**
 * 查找配置文件
 * @param projectRoot 项目根目录
 * @returns 找到的配置文件路径，或 null
 */
export function findConfigFile(projectRoot: string): string | null {
  for (const filename of CONFIG_FILE_PRIORITY) {
    const filePath = path.join(projectRoot, filename)
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  return null
}

// ============================================================
// 配置文件加载
// ============================================================

/**
 * 解析配置文件内容
 * @throws 配置文件语法错误时抛异常
 */
function parseConfigFile(filePath: string): Partial<ProjectConfig> {
  const content = fs.readFileSync(filePath, 'utf-8')

  try {
    const parsed = yaml.load(content) as Partial<ProjectConfig>

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error(`配置文件内容无效，期望对象类型`)
    }

    return parsed
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      throw new Error(
        `配置文件 YAML 语法错误: ${err.message}\n` +
          `位置: ${filePath}:${err.mark?.line ?? '?'}:${err.mark?.column ?? '?'}`
      )
    }
    throw err
  }
}

/**
 * 验证配置文件的 _schema 字段
 */
function validateSchema(
  config: Partial<ProjectConfig>,
  filePath: string
): string[] {
  const warnings: string[] = []

  if (!config._schema) {
    warnings.push(
      `配置文件缺少 _schema 字段，建议添加 _schema: 'ai-coding/project@1.0'`
    )
  } else if (!config._schema.startsWith('ai-coding/project@')) {
    warnings.push(
      `配置文件 _schema 值不正确: ${config._schema}，期望 'ai-coding/project@1.0'`
    )
  }

  return warnings
}

// ============================================================
// 配置 Lint 检查
// ============================================================

/**
 * 已知的命名约定键
 */
const KNOWN_NAMING_KEYS = new Set([
  'progress_log',
  'context',
  'design',
  'test_plan',
  'phase_gate_status',
])

/**
 * Lint 检查配置文件
 * @returns 警告列表
 */
export function lintProjectConfig(config: ProjectConfig): string[] {
  const warnings: string[] = []

  // 检查 feature_spec.fileTypes 中的未知键
  if (config.feature_spec?.fileTypes) {
    for (const key of Object.keys(config.feature_spec.fileTypes)) {
      // 转换为 snake_case 进行比较
      const normalizedKey = key.replace(/-/g, '_')
      if (!KNOWN_NAMING_KEYS.has(normalizedKey)) {
        warnings.push(
          `feature_spec.fileTypes 中包含未知键 '${key}'，可能是拼写错误`
        )
      }
    }
  }

  // 检查 scanner.ignore 是否包含危险模式
  if (config.scanner?.ignore) {
    for (const pattern of config.scanner.ignore) {
      if (pattern === '**' || pattern === '*') {
        warnings.push(
          `scanner.ignore 包含过于宽泛的模式 '${pattern}'，可能会忽略所有文件`
        )
      }
    }
  }

  // 检查 multi_instance_resolution.priority 长度
  if (config.multi_instance_resolution?.priority) {
    if (config.multi_instance_resolution.priority.length === 0) {
      warnings.push(`multi_instance_resolution.priority 不能为空数组`)
    }
  }

  return warnings
}

// ============================================================
// 主加载函数
// ============================================================

/**
 * 加载项目配置
 * @param projectRoot 项目根目录
 * @returns 加载结果
 */
export async function loadProjectConfig(
  projectRoot: string
): Promise<LoadResult> {
  const configPath = findConfigFile(projectRoot)

  if (!configPath) {
    // 无配置文件，返回默认配置 + 警告
    return {
      config: {
        ...DEFAULT_PROJECT_CONFIG,
        project: {
          name: path.basename(projectRoot),
        },
      },
      source: 'default',
      warnings: [
        `未找到配置文件，使用默认配置。建议创建 project.yaml 文件。`,
      ],
    }
  }

  // 解析配置文件
  const userConfig = parseConfigFile(configPath)

  // 验证 schema
  const schemaWarnings = validateSchema(userConfig, configPath)

  // 合并默认配置
  const mergedConfig = mergeWithDefaults(userConfig)

  // Lint 检查
  const lintWarnings = lintProjectConfig(mergedConfig)

  return {
    config: mergedConfig,
    source: configPath,
    warnings:
      schemaWarnings.length > 0 || lintWarnings.length > 0
        ? [...schemaWarnings, ...lintWarnings]
        : undefined,
  }
}

/**
 * 同步版本的加载函数
 */
export function loadProjectConfigSync(projectRoot: string): LoadResult {
  const configPath = findConfigFile(projectRoot)

  if (!configPath) {
    return {
      config: {
        ...DEFAULT_PROJECT_CONFIG,
        project: {
          name: path.basename(projectRoot),
        },
      },
      source: 'default',
      warnings: [
        `未找到配置文件，使用默认配置。建议创建 project.yaml 文件。`,
      ],
    }
  }

  const userConfig = parseConfigFile(configPath)
  const schemaWarnings = validateSchema(userConfig, configPath)
  const mergedConfig = mergeWithDefaults(userConfig)
  const lintWarnings = lintProjectConfig(mergedConfig)

  return {
    config: mergedConfig,
    source: configPath,
    warnings:
      schemaWarnings.length > 0 || lintWarnings.length > 0
        ? [...schemaWarnings, ...lintWarnings]
        : undefined,
  }
}
