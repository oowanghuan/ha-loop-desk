/**
 * Schema Discovery - Legacy Detector
 *
 * 降级检测器，识别无 _schema 但符合命名约定的文件
 * @see docs/schema-discovery/40_DESIGN.md
 */

import * as path from 'path'
import type { DiscoveredFile, FileCarrier, FileMeta } from './types'
import { extractFeatureId } from './parsers/yaml-parser'
import { extractFeatureIdFromFrontmatter } from './parsers/frontmatter-parser'

// ============================================================
// 降级检测规则
// ============================================================

/**
 * 降级检测规则
 */
export interface LegacyDetectionRule {
  /** 文件名匹配模式 */
  pattern: RegExp
  /** 对应的 Schema ID */
  schema: string
  /** 载体类型 */
  carrier: FileCarrier
  /** 文件类型（如 'progress-log'） */
  fileType: string
  /** 标识符字段路径 */
  identifierField: string
  /** 降级字段列表 */
  legacyFields?: string[]
}

/**
 * 内置降级检测规则
 */
export const LEGACY_DETECTION_RULES: LegacyDetectionRule[] = [
  // 进度日志
  {
    pattern: /90_PROGRESS_LOG\.ya?ml$/i,
    schema: 'ai-coding/progress-log@1.0',
    carrier: 'yaml',
    fileType: 'progress-log',
    identifierField: 'meta.feature',
    legacyFields: ['feature', 'feature_id'],
  },
  // 上下文文档
  {
    pattern: /10_CONTEXT\.md$/i,
    schema: 'ai-coding/context@1.0',
    carrier: 'md-frontmatter',
    fileType: 'context',
    identifierField: 'meta.feature',
    legacyFields: ['feature'],
  },
  // 设计文档
  {
    pattern: /40_DESIGN(?:_FINAL)?\.md$/i,
    schema: 'ai-coding/design@1.0',
    carrier: 'md-frontmatter',
    fileType: 'design',
    identifierField: 'meta.feature',
    legacyFields: ['feature'],
  },
  // 测试计划
  {
    pattern: /60_TEST_PLAN\.(?:md|ya?ml)$/i,
    schema: 'ai-coding/test-plan@1.0',
    carrier: 'yaml', // 会根据实际扩展名调整
    fileType: 'test-plan',
    identifierField: 'meta.feature',
    legacyFields: ['feature'],
  },
  // Phase Gate 状态
  {
    pattern: /PHASE_GATE_STATUS\.ya?ml$/i,
    schema: 'ai-coding/phase-gate-status@1.0',
    carrier: 'yaml',
    fileType: 'phase-gate-status',
    identifierField: 'meta.feature',
    legacyFields: ['feature'],
  },
]

// ============================================================
// LegacyDetector 类
// ============================================================

/**
 * 降级检测器
 */
export class LegacyDetector {
  private rules: LegacyDetectionRule[]

  constructor(customRules?: LegacyDetectionRule[]) {
    this.rules = customRules ?? LEGACY_DETECTION_RULES
  }

  /**
   * 检测文件是否符合降级规则
   * @param filePath 文件路径
   * @param content 文件解析后的内容
   * @param lastModified 最后修改时间
   * @param size 文件大小
   * @returns 识别的 DiscoveredFile 或 null
   */
  detect(
    filePath: string,
    content: unknown,
    lastModified: Date,
    size: number
  ): DiscoveredFile | null {
    const fileName = path.basename(filePath)

    for (const rule of this.rules) {
      if (rule.pattern.test(fileName)) {
        // 匹配成功，构建 DiscoveredFile
        const carrier = this.detectCarrier(filePath, rule)
        const featureId = this.extractFeatureIdByRule(
          filePath,
          content,
          rule
        )
        const meta = this.extractMetaFromContent(content)

        return {
          path: filePath,
          schema: rule.schema,
          carrier,
          content,
          lastModified,
          size,
          isLegacy: true,
          meta: {
            ...meta,
            feature: featureId,
          },
        }
      }
    }

    return null
  }

  /**
   * 检测文件载体类型
   */
  private detectCarrier(
    filePath: string,
    rule: LegacyDetectionRule
  ): FileCarrier {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.md' || ext === '.markdown') {
      return 'md-frontmatter'
    }
    return 'yaml'
  }

  /**
   * 根据规则提取 featureId
   */
  private extractFeatureIdByRule(
    filePath: string,
    content: unknown,
    rule: LegacyDetectionRule
  ): string | undefined {
    // 尝试从内容中提取
    if (rule.carrier === 'yaml') {
      const featureId = extractFeatureId(
        content,
        rule.identifierField,
        rule.legacyFields
      )
      if (featureId) {
        return featureId
      }
    } else if (rule.carrier === 'md-frontmatter') {
      if (typeof content === 'object' && content !== null) {
        const featureId = extractFeatureIdFromFrontmatter(
          content as Record<string, unknown>,
          rule.identifierField,
          rule.legacyFields
        )
        if (featureId) {
          return featureId
        }
      }
    }

    // 从路径推断（如 docs/coding-GUI/90_PROGRESS_LOG.yaml -> coding-GUI）
    return this.inferFeatureIdFromPath(filePath)
  }

  /**
   * 从路径推断 featureId
   */
  private inferFeatureIdFromPath(filePath: string): string | undefined {
    // 查找 docs/ 目录下的子目录名
    const docsMatch = filePath.match(/docs\/([^/]+)\//)
    if (docsMatch) {
      return docsMatch[1]
    }

    // 查找 features/ 目录下的子目录名
    const featuresMatch = filePath.match(/features\/([^/]+)\//)
    if (featuresMatch) {
      return featuresMatch[1]
    }

    return undefined
  }

  /**
   * 从内容中提取元信息
   */
  private extractMetaFromContent(content: unknown): FileMeta | undefined {
    if (typeof content !== 'object' || content === null) {
      return undefined
    }

    const obj = content as Record<string, unknown>
    const meta: FileMeta = {}

    // 提取 meta 字段
    if (typeof obj.meta === 'object' && obj.meta !== null) {
      const metaObj = obj.meta as Record<string, unknown>
      if (typeof metaObj.is_primary === 'boolean') {
        meta.is_primary = metaObj.is_primary
      }
      if (typeof metaObj.status === 'string') {
        meta.status = metaObj.status as FileMeta['status']
      }
      if (typeof metaObj.version === 'string') {
        meta.version = metaObj.version
      }
    }

    return Object.keys(meta).length > 0 ? meta : undefined
  }

  /**
   * 检查文件名是否匹配任何降级规则
   */
  matchesAnyRule(filePath: string): boolean {
    const fileName = path.basename(filePath)
    return this.rules.some((rule) => rule.pattern.test(fileName))
  }

  /**
   * 获取匹配的规则
   */
  getMatchingRule(filePath: string): LegacyDetectionRule | undefined {
    const fileName = path.basename(filePath)
    return this.rules.find((rule) => rule.pattern.test(fileName))
  }
}

// ============================================================
// 导出默认实例
// ============================================================

/**
 * 默认降级检测器
 */
export const defaultLegacyDetector = new LegacyDetector()
