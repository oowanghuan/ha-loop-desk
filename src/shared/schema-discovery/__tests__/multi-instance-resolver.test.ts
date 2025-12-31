/**
 * MultiInstanceResolver 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MultiInstanceResolver } from '../multi-instance-resolver'
import type { DiscoveredFile } from '../types'

describe('MultiInstanceResolver', () => {
  let resolver: MultiInstanceResolver

  beforeEach(() => {
    resolver = new MultiInstanceResolver()
  })

  // 辅助函数：创建测试文件
  function createFile(
    path: string,
    options: Partial<DiscoveredFile> = {}
  ): DiscoveredFile {
    return {
      path,
      schema: 'ai-coding/progress-log@1.0',
      carrier: 'yaml',
      content: {},
      lastModified: options.lastModified ?? new Date('2024-01-01'),
      size: 1000,
      ...options,
    }
  }

  describe('无实例', () => {
    it('应该返回 no_instances', () => {
      const result = resolver.resolvePrimaryFile([], 'progress-log', 'test')

      expect(result.primary).toBeNull()
      expect(result.reason).toBe('no_instances')
      expect(result.confident).toBe(true)
      expect(result.allInstances).toHaveLength(0)
    })
  })

  describe('单实例', () => {
    it('应该返回 single_instance', () => {
      const file = createFile('docs/test/90_PROGRESS_LOG.yaml')
      const result = resolver.resolvePrimaryFile([file], 'progress-log', 'test')

      expect(result.primary).toBe(file)
      expect(result.reason).toBe('single_instance')
      expect(result.confident).toBe(true)
      expect(result.allInstances).toHaveLength(1)
    })
  })

  describe('显式 is_primary', () => {
    it('应该选择 is_primary: true 的文件', () => {
      const files = [
        createFile('docs/test/v1/90_PROGRESS_LOG.yaml'),
        createFile('docs/test/v2/90_PROGRESS_LOG.yaml', {
          meta: { is_primary: true },
        }),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.primary?.path).toBe('docs/test/v2/90_PROGRESS_LOG.yaml')
      expect(result.reason).toBe('explicit_primary')
      expect(result.confident).toBe(true)
    })

    it('多个 is_primary 时应该继续用其他规则', () => {
      const files = [
        createFile('docs/test/a/90_PROGRESS_LOG.yaml', {
          meta: { is_primary: true },
          lastModified: new Date('2024-01-01'),
        }),
        createFile('docs/test/b/90_PROGRESS_LOG.yaml', {
          meta: { is_primary: true },
          lastModified: new Date('2024-06-01'),
        }),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      // 多个 primary，fallback 到最新修改
      expect(result.primary?.path).toBe('docs/test/b/90_PROGRESS_LOG.yaml')
    })
  })

  describe('active_status 过滤', () => {
    it('应该过滤归档文件', () => {
      const files = [
        createFile('docs/test/v1/90_PROGRESS_LOG.yaml', {
          meta: { status: 'archived' },
        }),
        createFile('docs/test/v2/90_PROGRESS_LOG.yaml', {
          meta: { status: 'active' },
        }),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.primary?.path).toBe('docs/test/v2/90_PROGRESS_LOG.yaml')
      expect(result.reason).toBe('active_status')
      expect(result.confident).toBe(true)
    })

    it('应该过滤 backup 状态', () => {
      const files = [
        createFile('docs/test/backup/90_PROGRESS_LOG.yaml', {
          meta: { status: 'backup' },
        }),
        createFile('docs/test/current/90_PROGRESS_LOG.yaml'),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.primary?.path).toBe('docs/test/current/90_PROGRESS_LOG.yaml')
    })

    it('无状态视为活跃', () => {
      const files = [
        createFile('docs/test/v1/90_PROGRESS_LOG.yaml', {
          meta: { status: 'archived' },
        }),
        createFile('docs/test/v2/90_PROGRESS_LOG.yaml'), // 无 meta
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.primary?.path).toBe('docs/test/v2/90_PROGRESS_LOG.yaml')
    })
  })

  describe('latest_modified', () => {
    it('应该选择最新修改的文件', () => {
      const files = [
        createFile('docs/test/a/90_PROGRESS_LOG.yaml', {
          lastModified: new Date('2024-01-01'),
        }),
        createFile('docs/test/b/90_PROGRESS_LOG.yaml', {
          lastModified: new Date('2024-06-01'),
        }),
        createFile('docs/test/c/90_PROGRESS_LOG.yaml', {
          lastModified: new Date('2024-03-01'),
        }),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.primary?.path).toBe('docs/test/b/90_PROGRESS_LOG.yaml')
      expect(result.reason).toBe('latest_modified')
    })
  })

  describe('shallowest_path', () => {
    it('应该选择路径最浅的文件', () => {
      const now = new Date()
      const files = [
        createFile('docs/test/deep/nested/90_PROGRESS_LOG.yaml', {
          lastModified: now,
        }),
        createFile('docs/test/90_PROGRESS_LOG.yaml', {
          lastModified: now,
        }),
        createFile('docs/test/another/90_PROGRESS_LOG.yaml', {
          lastModified: now,
        }),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.primary?.path).toBe('docs/test/90_PROGRESS_LOG.yaml')
    })
  })

  describe('alphabetically_first', () => {
    it('应该按字母序选择第一个', () => {
      const now = new Date()
      const files = [
        createFile('docs/test/c/90_PROGRESS_LOG.yaml', { lastModified: now }),
        createFile('docs/test/a/90_PROGRESS_LOG.yaml', { lastModified: now }),
        createFile('docs/test/b/90_PROGRESS_LOG.yaml', { lastModified: now }),
      ]

      // 同深度、同时间时，按字母序
      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.primary?.path).toBe('docs/test/a/90_PROGRESS_LOG.yaml')
    })
  })

  describe('冲突报告', () => {
    it('应该生成 conflictUI', () => {
      const files = [
        createFile('docs/test/a/90_PROGRESS_LOG.yaml'),
        createFile('docs/test/b/90_PROGRESS_LOG.yaml'),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.conflictUI).toBeDefined()
      expect(result.conflictUI?.fileType).toBe('progress-log')
      expect(result.conflictUI?.instances).toHaveLength(2)
      expect(result.conflictUI?.hasExplicitPrimary).toBe(false)
    })

    it('应该生成 conflictRaw', () => {
      const files = [
        createFile('docs/test/a/90_PROGRESS_LOG.yaml'),
        createFile('docs/test/b/90_PROGRESS_LOG.yaml'),
      ]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.conflictRaw).toBeDefined()
      expect(result.conflictRaw?.decisionLog.length).toBeGreaterThan(0)
    })

    it('单实例不应生成冲突报告', () => {
      const files = [createFile('docs/test/90_PROGRESS_LOG.yaml')]

      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')

      expect(result.conflictUI).toBeUndefined()
      expect(result.conflictRaw).toBeUndefined()
    })
  })

  describe('confident 标记', () => {
    it('单实例应该 confident', () => {
      const result = resolver.resolvePrimaryFile(
        [createFile('test.yaml')],
        'progress-log',
        'test'
      )
      expect(result.confident).toBe(true)
    })

    it('显式 primary 应该 confident', () => {
      const files = [
        createFile('a.yaml'),
        createFile('b.yaml', { meta: { is_primary: true } }),
      ]
      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')
      expect(result.confident).toBe(true)
    })

    it('通过 active_status 筛选到一个应该 confident', () => {
      const files = [
        createFile('a.yaml', { meta: { status: 'archived' } }),
        createFile('b.yaml'),
      ]
      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')
      expect(result.confident).toBe(true)
    })

    it('latest_modified 选择不应该完全 confident', () => {
      const files = [
        createFile('a.yaml', { lastModified: new Date('2024-01-01') }),
        createFile('b.yaml', { lastModified: new Date('2024-06-01') }),
      ]
      const result = resolver.resolvePrimaryFile(files, 'progress-log', 'test')
      expect(result.confident).toBe(false)
    })
  })
})
