/**
 * Validator 单元测试
 */

import { describe, it, expect } from 'vitest'
import { Validator } from '../validator'
import { validateFeature, getFeaturePhase } from '../validators/feature-validator'
import {
  classifyUnknownSchema,
  isValidSchemaIdFormat,
} from '../validators/unknown-schema-classifier'
import type { FeatureScanResult, ScanResult, DiscoveredFile } from '../types'

describe('Feature Validator', () => {
  // 辅助函数
  function createFeature(
    featureId: string,
    files: Record<string, DiscoveredFile>
  ): FeatureScanResult {
    return {
      featureId,
      primaryFiles: files,
      allFiles: Object.fromEntries(
        Object.entries(files).map(([k, v]) => [k, [v]])
      ),
      conflicts: [],
    }
  }

  function createFile(type: string, content: unknown = {}): DiscoveredFile {
    return {
      path: `docs/test/${type}.yaml`,
      schema: `ai-coding/${type}@1.0`,
      carrier: 'yaml',
      content,
      lastModified: new Date(),
      size: 1000,
    }
  }

  describe('validateFeature', () => {
    it('应该通过完整的 feature', () => {
      const feature = createFeature('test', {
        'progress-log': createFile('progress-log'),
        context: createFile('context'),
      })

      const report = validateFeature(feature)

      expect(report.status).toBe('valid')
      expect(report.missingRequired).toHaveLength(0)
    })

    it('应该报告缺少必需文件', () => {
      const feature = createFeature('test', {
        'progress-log': createFile('progress-log'),
        // 缺少 context
      })

      const report = validateFeature(feature)

      expect(report.status).toBe('error')
      expect(report.missingRequired).toContain('context')
    })

    it('应该报告缺少 Phase 相关文件', () => {
      const feature = createFeature('test', {
        'progress-log': createFile('progress-log'),
        context: createFile('context'),
        // 缺少 design，在 Phase 4+ 需要
      })

      const report = validateFeature(feature, undefined, 5) // Phase 5

      expect(report.status).toBe('warning')
      expect(report.missingForPhase.length).toBeGreaterThan(0)
    })

    it('Phase 3 不应该警告缺少 design', () => {
      const feature = createFeature('test', {
        'progress-log': createFile('progress-log'),
        context: createFile('context'),
      })

      const report = validateFeature(feature, undefined, 3) // Phase 3

      expect(report.missingForPhase).not.toContainEqual(
        expect.stringContaining('design')
      )
    })
  })

  describe('getFeaturePhase', () => {
    it('应该从 progress-log 提取 phase', () => {
      const feature = createFeature('test', {
        'progress-log': createFile('progress-log', {
          meta: { current_phase: 4 },
        }),
      })

      const phase = getFeaturePhase(feature)
      expect(phase).toBe(4)
    })

    it('应该返回 undefined 如果没有 phase 信息', () => {
      const feature = createFeature('test', {
        'progress-log': createFile('progress-log', {}),
      })

      const phase = getFeaturePhase(feature)
      expect(phase).toBeUndefined()
    })
  })
})

describe('Unknown Schema Classifier', () => {
  describe('classifyUnknownSchema', () => {
    it('应该分类 legacy 文件', () => {
      const hint = classifyUnknownSchema('ai-coding/progress-log@1.0', true)

      expect(hint.category).toBe('legacy')
      expect(hint.suggestion).toContain('_schema')
    })

    it('应该分类无效格式', () => {
      const hint = classifyUnknownSchema('InvalidSchema')

      expect(hint.category).toBe('invalid')
    })

    it('应该分类未知但格式正确的 schema', () => {
      const hint = classifyUnknownSchema('custom/unknown-schema@1.0')

      expect(hint.category).toBe('unknown')
      expect(hint.suggestion).toContain('project.yaml')
    })
  })

  describe('isValidSchemaIdFormat', () => {
    it('应该接受有效格式', () => {
      expect(isValidSchemaIdFormat('ai-coding/progress-log@1.0')).toBe(true)
      expect(isValidSchemaIdFormat('my-ns/my-schema@2.1')).toBe(true)
    })

    it('应该拒绝无效格式', () => {
      expect(isValidSchemaIdFormat('invalid')).toBe(false)
      expect(isValidSchemaIdFormat('no-version')).toBe(false)
      expect(isValidSchemaIdFormat('Invalid/Schema@1.0')).toBe(false)
    })
  })
})

describe('Validator', () => {
  it('应该验证扫描结果', () => {
    const validator = new Validator()

    const scanResult: ScanResult = {
      features: new Map([
        [
          'test-feature',
          {
            featureId: 'test-feature',
            primaryFiles: {
              'progress-log': {
                path: 'docs/test/90_PROGRESS_LOG.yaml',
                schema: 'ai-coding/progress-log@1.0',
                carrier: 'yaml',
                content: {},
                lastModified: new Date(),
                size: 1000,
              },
              context: {
                path: 'docs/test/10_CONTEXT.md',
                schema: 'ai-coding/context@1.0',
                carrier: 'md-frontmatter',
                content: {},
                lastModified: new Date(),
                size: 500,
              },
            },
            allFiles: {},
            conflicts: [],
          },
        ],
      ]),
      projectConfig: {},
      unknownSchemas: [],
      stats: { totalFiles: 10, schemaFiles: 2, scanTime: 100 },
    }

    const report = validator.validate(scanResult)

    expect(report.status).toBe('valid')
    expect(report.featureReports.size).toBe(1)
    expect(report.unknownSchemaCount).toBe(0)
  })

  it('应该正确汇总多个 feature 的状态', () => {
    const validator = new Validator()

    const goodFeature: FeatureScanResult = {
      featureId: 'good-feature',
      primaryFiles: {
        'progress-log': {
          path: 'docs/good/90_PROGRESS_LOG.yaml',
          schema: 'ai-coding/progress-log@1.0',
          carrier: 'yaml',
          content: {},
          lastModified: new Date(),
          size: 1000,
        },
        context: {
          path: 'docs/good/10_CONTEXT.md',
          schema: 'ai-coding/context@1.0',
          carrier: 'md-frontmatter',
          content: {},
          lastModified: new Date(),
          size: 500,
        },
      },
      allFiles: {},
      conflicts: [],
    }

    const badFeature: FeatureScanResult = {
      featureId: 'bad-feature',
      primaryFiles: {
        'progress-log': {
          path: 'docs/bad/90_PROGRESS_LOG.yaml',
          schema: 'ai-coding/progress-log@1.0',
          carrier: 'yaml',
          content: {},
          lastModified: new Date(),
          size: 1000,
        },
        // 缺少 context
      },
      allFiles: {},
      conflicts: [],
    }

    const scanResult: ScanResult = {
      features: new Map([
        ['good-feature', goodFeature],
        ['bad-feature', badFeature],
      ]),
      projectConfig: {},
      unknownSchemas: [],
      stats: { totalFiles: 10, schemaFiles: 3, scanTime: 100 },
    }

    const report = validator.validate(scanResult)

    expect(report.status).toBe('error') // 有一个 feature error
    expect(report.featureReports.get('good-feature')?.status).toBe('valid')
    expect(report.featureReports.get('bad-feature')?.status).toBe('error')
  })

  it('应该计算 unknown schemas', () => {
    const validator = new Validator()

    const scanResult: ScanResult = {
      features: new Map(),
      projectConfig: {},
      unknownSchemas: [
        {
          file: {
            path: 'test.yaml',
            schema: 'unknown/schema@1.0',
            carrier: 'yaml',
            content: {},
            lastModified: new Date(),
            size: 100,
          },
          hint: {
            category: 'unknown',
            message: 'Unknown schema',
            suggestion: 'Register it',
          },
        },
      ],
      stats: { totalFiles: 1, schemaFiles: 1, scanTime: 50 },
    }

    const report = validator.validate(scanResult)

    expect(report.unknownSchemaCount).toBe(1)
    expect(report.status).toBe('warning')
  })
})
