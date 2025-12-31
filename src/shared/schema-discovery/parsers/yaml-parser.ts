/**
 * Schema Discovery - YAML Parser
 *
 * YAML 文件解析器，提取 _schema 字段
 */

import * as fs from 'fs'
import * as yaml from 'js-yaml'
import type { ParseResult } from '../types'

/**
 * 解析 YAML 文件
 * @param filePath 文件路径
 * @returns 解析结果
 */
export async function parseYamlFile(filePath: string): Promise<ParseResult> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return parseYamlContent(content)
  } catch (error) {
    return {
      success: false,
      error: `无法读取文件: ${(error as Error).message}`,
    }
  }
}

/**
 * 同步版本的 YAML 解析
 */
export function parseYamlFileSync(filePath: string): ParseResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseYamlContent(content)
  } catch (error) {
    return {
      success: false,
      error: `无法读取文件: ${(error as Error).message}`,
    }
  }
}

/**
 * 解析 YAML 内容字符串
 * @param content YAML 内容
 * @returns 解析结果
 */
export function parseYamlContent(content: string): ParseResult {
  try {
    const parsed = yaml.load(content)

    // 空文件或无效内容
    if (parsed === null || parsed === undefined) {
      return {
        success: true,
        content: null,
        schema: undefined,
      }
    }

    // 非对象类型
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        success: true,
        content: parsed,
        schema: undefined,
      }
    }

    const obj = parsed as Record<string, unknown>

    // 提取 _schema 字段
    const schema =
      typeof obj._schema === 'string' ? obj._schema : undefined

    return {
      success: true,
      content: parsed,
      schema,
    }
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      return {
        success: false,
        error: `YAML 语法错误: ${err.message} (行 ${err.mark?.line ?? '?'})`,
      }
    }
    const error = err as Error
    return {
      success: false,
      error: `解析错误: ${error.message}`,
    }
  }
}

/**
 * 检查文件是否为 YAML 文件
 */
export function isYamlFile(filePath: string): boolean {
  const ext = filePath.toLowerCase()
  return ext.endsWith('.yaml') || ext.endsWith('.yml')
}

/**
 * 从解析内容中提取元信息
 */
export function extractMeta(
  content: unknown
): Record<string, unknown> | undefined {
  if (typeof content !== 'object' || content === null) {
    return undefined
  }

  const obj = content as Record<string, unknown>

  // 尝试从 meta 字段提取
  if (typeof obj.meta === 'object' && obj.meta !== null) {
    return obj.meta as Record<string, unknown>
  }

  return undefined
}

/**
 * 从解析内容中提取 featureId
 * @param content 解析后的内容
 * @param identifierField 标识符字段路径（如 'meta.feature'）
 * @param legacyFields 降级字段列表
 */
export function extractFeatureId(
  content: unknown,
  identifierField: string,
  legacyFields?: string[]
): string | undefined {
  if (typeof content !== 'object' || content === null) {
    return undefined
  }

  const obj = content as Record<string, unknown>

  // 尝试主字段路径
  const value = getNestedValue(obj, identifierField)
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  // 尝试降级字段
  if (legacyFields) {
    for (const field of legacyFields) {
      const legacyValue = getNestedValue(obj, field)
      if (typeof legacyValue === 'string' && legacyValue.length > 0) {
        return legacyValue
      }
    }
  }

  return undefined
}

/**
 * 获取嵌套对象的值
 * @param obj 对象
 * @param path 路径（如 'meta.feature'）
 */
function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}
