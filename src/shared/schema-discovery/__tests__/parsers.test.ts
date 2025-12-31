/**
 * Parsers 单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  parseYamlContent,
  isYamlFile,
  extractFeatureId,
} from '../parsers/yaml-parser'
import {
  parseFrontmatterContent,
  isMarkdownFile,
  hasFrontmatter,
} from '../parsers/frontmatter-parser'

describe('YAML Parser', () => {
  describe('parseYamlContent', () => {
    it('应该解析有效 YAML', () => {
      const yaml = `
_schema: ai-coding/progress-log@1.0
meta:
  feature: test-feature
status: wip
`
      const result = parseYamlContent(yaml)

      expect(result.success).toBe(true)
      expect(result.schema).toBe('ai-coding/progress-log@1.0')
      expect(result.content).toBeDefined()
    })

    it('应该处理无 _schema 的 YAML', () => {
      const yaml = `
meta:
  feature: test-feature
status: wip
`
      const result = parseYamlContent(yaml)

      expect(result.success).toBe(true)
      expect(result.schema).toBeUndefined()
    })

    it('应该处理空文件', () => {
      const result = parseYamlContent('')

      expect(result.success).toBe(true)
      expect(result.content).toBeNull()
    })

    it('应该处理纯值（非对象）', () => {
      const result = parseYamlContent('hello world')

      expect(result.success).toBe(true)
      expect(result.schema).toBeUndefined()
    })

    it('应该报告语法错误', () => {
      const yaml = `
invalid: [
  unclosed bracket
`
      const result = parseYamlContent(yaml)

      expect(result.success).toBe(false)
      expect(result.error).toContain('YAML')
    })
  })

  describe('isYamlFile', () => {
    it('应该识别 .yaml 文件', () => {
      expect(isYamlFile('test.yaml')).toBe(true)
      expect(isYamlFile('/path/to/file.yaml')).toBe(true)
    })

    it('应该识别 .yml 文件', () => {
      expect(isYamlFile('test.yml')).toBe(true)
    })

    it('应该忽略大小写', () => {
      expect(isYamlFile('test.YAML')).toBe(true)
      expect(isYamlFile('test.YML')).toBe(true)
    })

    it('应该拒绝非 YAML 文件', () => {
      expect(isYamlFile('test.json')).toBe(false)
      expect(isYamlFile('test.md')).toBe(false)
    })
  })

  describe('extractFeatureId', () => {
    it('应该从 meta.feature 提取', () => {
      const content = {
        meta: { feature: 'my-feature' },
      }

      const result = extractFeatureId(content, 'meta.feature')
      expect(result).toBe('my-feature')
    })

    it('应该使用降级字段', () => {
      const content = {
        feature_id: 'legacy-feature',
      }

      const result = extractFeatureId(content, 'meta.feature', ['feature_id'])
      expect(result).toBe('legacy-feature')
    })

    it('应该返回 undefined 如果找不到', () => {
      const content = { other: 'data' }

      const result = extractFeatureId(content, 'meta.feature')
      expect(result).toBeUndefined()
    })

    it('应该处理非对象内容', () => {
      const result = extractFeatureId('string', 'meta.feature')
      expect(result).toBeUndefined()
    })
  })
})

describe('Frontmatter Parser', () => {
  describe('parseFrontmatterContent', () => {
    it('应该解析有效 frontmatter', () => {
      const md = `---
_schema: ai-coding/context@1.0
meta:
  feature: test-feature
---

# Content here
`
      const result = parseFrontmatterContent(md)

      expect(result.success).toBe(true)
      expect(result.schema).toBe('ai-coding/context@1.0')
      expect(result.frontmatter?._schema).toBe('ai-coding/context@1.0')
      expect(result.body).toContain('# Content here')
    })

    it('应该处理无 frontmatter 的文件', () => {
      const md = `# Just content

No frontmatter here.
`
      const result = parseFrontmatterContent(md)

      expect(result.success).toBe(true)
      expect(result.frontmatter).toBeUndefined()
      expect(result.body).toBe(md)
    })

    it('应该处理空 frontmatter', () => {
      const md = `---
title: test
---

# Content
`
      const result = parseFrontmatterContent(md)

      expect(result.success).toBe(true)
      expect(result.frontmatter).toEqual({ title: 'test' })
    })

    it('应该处理无结束标记的情况', () => {
      const md = `---
only_start: true

# Content without end marker
`
      const result = parseFrontmatterContent(md)

      expect(result.success).toBe(true)
      expect(result.frontmatter).toBeUndefined()
    })

    it('应该报告语法错误', () => {
      const md = `---
invalid: [
  unclosed
---

# Content
`
      const result = parseFrontmatterContent(md)

      expect(result.success).toBe(false)
      expect(result.error).toContain('YAML')
    })
  })

  describe('isMarkdownFile', () => {
    it('应该识别 .md 文件', () => {
      expect(isMarkdownFile('test.md')).toBe(true)
      expect(isMarkdownFile('/path/to/file.md')).toBe(true)
    })

    it('应该识别 .markdown 文件', () => {
      expect(isMarkdownFile('test.markdown')).toBe(true)
    })

    it('应该忽略大小写', () => {
      expect(isMarkdownFile('test.MD')).toBe(true)
      expect(isMarkdownFile('test.MARKDOWN')).toBe(true)
    })

    it('应该拒绝非 Markdown 文件', () => {
      expect(isMarkdownFile('test.yaml')).toBe(false)
      expect(isMarkdownFile('test.txt')).toBe(false)
    })
  })

  describe('hasFrontmatter', () => {
    it('应该检测有 frontmatter', () => {
      expect(hasFrontmatter('---\ntest: value\n---\n')).toBe(true)
    })

    it('应该检测无 frontmatter', () => {
      expect(hasFrontmatter('# Just markdown')).toBe(false)
    })
  })
})
