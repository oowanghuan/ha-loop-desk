/**
 * Schema Discovery - Unknown Schema Classifier
 *
 * 未知 Schema 分类器
 * @see docs/schema-discovery/50_DEV_PLAN.md P3-T2
 */

import type { UnknownSchemaHint, UnknownSchemaCategory } from '../types'

/**
 * Schema ID 格式正则
 */
const SCHEMA_ID_PATTERN = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*@\d+\.\d+$/

/**
 * 分类未知 Schema
 * @param schemaId Schema ID
 * @param isLegacy 是否为降级识别
 */
export function classifyUnknownSchema(
  schemaId: string,
  isLegacy: boolean = false
): UnknownSchemaHint {
  // 降级识别的文件
  if (isLegacy) {
    return {
      category: 'legacy',
      message: `文件通过文件名降级识别，建议添加 _schema 字段`,
      suggestion: `在文件开头添加 _schema: '${schemaId}'`,
    }
  }

  // 格式无效
  if (!SCHEMA_ID_PATTERN.test(schemaId)) {
    return {
      category: 'invalid',
      message: `Schema ID 格式无效: ${schemaId}`,
      suggestion: getFormatSuggestion(schemaId),
    }
  }

  // 格式正确但未注册
  return {
    category: 'unknown',
    message: `未注册的 Schema: ${schemaId}`,
    suggestion: `请检查 Schema ID 是否正确，或在 project.yaml 的 schema_extensions.custom 中注册`,
  }
}

/**
 * 获取格式建议
 */
function getFormatSuggestion(schemaId: string): string {
  const issues: string[] = []

  // 检查是否缺少版本号
  if (!schemaId.includes('@')) {
    issues.push(`缺少版本号，应添加 @major.minor（如 @1.0）`)
  }

  // 检查是否缺少命名空间
  if (!schemaId.includes('/')) {
    issues.push(`缺少命名空间，格式应为 namespace/name@version`)
  }

  // 检查是否有大写字母
  if (/[A-Z]/.test(schemaId)) {
    issues.push(`不应包含大写字母，请使用 kebab-case`)
  }

  // 检查是否以数字开头
  const parts = schemaId.split('/')
  for (const part of parts) {
    const name = part.split('@')[0]
    if (/^\d/.test(name)) {
      issues.push(`命名空间和名称不能以数字开头`)
      break
    }
  }

  if (issues.length > 0) {
    return issues.join('；')
  }

  return `正确格式示例: ai-coding/progress-log@1.0`
}

/**
 * 检查 Schema ID 格式是否有效
 */
export function isValidSchemaIdFormat(schemaId: string): boolean {
  return SCHEMA_ID_PATTERN.test(schemaId)
}

/**
 * 解析 Schema ID
 */
export function parseSchemaId(
  schemaId: string
): { namespace: string; name: string; version: string } | null {
  const match = schemaId.match(
    /^([a-z][a-z0-9-]*)\/([a-z][a-z0-9-]*)@(\d+\.\d+)$/
  )

  if (!match) {
    return null
  }

  return {
    namespace: match[1],
    name: match[2],
    version: match[3],
  }
}
