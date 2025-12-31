/**
 * Schema Discovery - Frontmatter Parser
 *
 * Markdown 文件 frontmatter 解析器
 */

import * as fs from 'fs'
import * as yaml from 'js-yaml'
import type { FrontmatterResult } from '../types'

/**
 * Frontmatter 分隔符正则
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/**
 * 解析 Markdown 文件的 frontmatter
 * @param filePath 文件路径
 * @returns 解析结果
 */
export async function parseFrontmatter(
  filePath: string
): Promise<FrontmatterResult> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return parseFrontmatterContent(content)
  } catch (error) {
    return {
      success: false,
      error: `无法读取文件: ${(error as Error).message}`,
    }
  }
}

/**
 * 同步版本的 frontmatter 解析
 */
export function parseFrontmatterSync(filePath: string): FrontmatterResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseFrontmatterContent(content)
  } catch (error) {
    return {
      success: false,
      error: `无法读取文件: ${(error as Error).message}`,
    }
  }
}

/**
 * 解析 frontmatter 内容字符串
 * @param content Markdown 内容
 * @returns 解析结果
 */
export function parseFrontmatterContent(content: string): FrontmatterResult {
  // 检查是否以 --- 开头
  if (!content.startsWith('---')) {
    return {
      success: true,
      frontmatter: undefined,
      body: content,
      schema: undefined,
    }
  }

  const match = content.match(FRONTMATTER_REGEX)

  if (!match) {
    // 可能只有开头的 ---，没有结束的 ---
    return {
      success: true,
      frontmatter: undefined,
      body: content,
      schema: undefined,
    }
  }

  const frontmatterYaml = match[1]
  const body = match[2]

  try {
    const parsed = yaml.load(frontmatterYaml)

    // 空 frontmatter
    if (parsed === null || parsed === undefined) {
      return {
        success: true,
        frontmatter: {},
        body,
        schema: undefined,
      }
    }

    // 非对象类型
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        success: false,
        error: `Frontmatter 必须是对象类型，当前为: ${typeof parsed}`,
      }
    }

    const obj = parsed as Record<string, unknown>

    // 提取 _schema 字段
    const schema =
      typeof obj._schema === 'string' ? obj._schema : undefined

    return {
      success: true,
      frontmatter: obj,
      body,
      schema,
    }
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      return {
        success: false,
        error: `Frontmatter YAML 语法错误: ${err.message}`,
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
 * 检查文件是否为 Markdown 文件
 */
export function isMarkdownFile(filePath: string): boolean {
  const ext = filePath.toLowerCase()
  return ext.endsWith('.md') || ext.endsWith('.markdown')
}

/**
 * 检查 Markdown 文件是否有 frontmatter
 */
export function hasFrontmatter(content: string): boolean {
  return content.startsWith('---')
}

/**
 * 从 frontmatter 中提取元信息
 */
export function extractMetaFromFrontmatter(
  frontmatter: Record<string, unknown>
): Record<string, unknown> | undefined {
  // 尝试从 meta 字段提取
  if (typeof frontmatter.meta === 'object' && frontmatter.meta !== null) {
    return frontmatter.meta as Record<string, unknown>
  }

  // 直接返回整个 frontmatter（作为 meta）
  return frontmatter
}

/**
 * 从 frontmatter 中提取 featureId
 */
export function extractFeatureIdFromFrontmatter(
  frontmatter: Record<string, unknown>,
  identifierField: string,
  legacyFields?: string[]
): string | undefined {
  // 尝试主字段路径
  const value = getNestedValue(frontmatter, identifierField)
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  // 尝试降级字段
  if (legacyFields) {
    for (const field of legacyFields) {
      const legacyValue = getNestedValue(frontmatter, field)
      if (typeof legacyValue === 'string' && legacyValue.length > 0) {
        return legacyValue
      }
    }
  }

  return undefined
}

/**
 * 获取嵌套对象的值
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
