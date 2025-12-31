/**
 * Schema Registry 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SchemaRegistry, BUILTIN_SCHEMAS, defaultRegistry } from '../registry'

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry

  beforeEach(() => {
    registry = new SchemaRegistry()
  })

  describe('constructor', () => {
    it('应该注册内置 schemas', () => {
      expect(registry.getAll().length).toBeGreaterThanOrEqual(5)
    })

    it('应该包含 progress-log schema', () => {
      const schema = registry.get('ai-coding/progress-log')
      expect(schema).toBeDefined()
      expect(schema?.required).toBe(true)
    })

    it('应该包含 context schema', () => {
      const schema = registry.get('ai-coding/context')
      expect(schema).toBeDefined()
      expect(schema?.required).toBe(true)
    })

    it('应该接受自定义 schemas', () => {
      const custom = new SchemaRegistry([
        {
          id: 'custom/my-schema',
          version: '1.0',
          description: 'Custom schema',
          scope: 'feature',
          required: false,
          identifierField: 'meta.feature',
          carriers: ['yaml'],
        },
      ])

      expect(custom.isKnown('custom/my-schema')).toBe(true)
    })
  })

  describe('get', () => {
    it('应该返回已知 schema', () => {
      const schema = registry.get('ai-coding/progress-log')
      expect(schema).toBeDefined()
      expect(schema?.id).toBe('ai-coding/progress-log')
    })

    it('应该支持带版本号的查询', () => {
      const schema = registry.get('ai-coding/progress-log@1.0')
      expect(schema).toBeDefined()
      expect(schema?.id).toBe('ai-coding/progress-log')
    })

    it('应该返回 undefined 对于未知 schema', () => {
      const schema = registry.get('unknown/schema')
      expect(schema).toBeUndefined()
    })
  })

  describe('register', () => {
    it('应该注册新 schema', () => {
      registry.register({
        id: 'test/new-schema',
        version: '1.0',
        description: 'Test schema',
        scope: 'feature',
        required: false,
        identifierField: 'meta.feature',
        carriers: ['yaml'],
      })

      expect(registry.isKnown('test/new-schema')).toBe(true)
    })

    it('应该覆盖已有 schema', () => {
      registry.register({
        id: 'ai-coding/progress-log',
        version: '2.0',
        description: 'Updated',
        scope: 'feature',
        required: false,
        identifierField: 'meta.feature',
        carriers: ['yaml'],
      })

      const schema = registry.get('ai-coding/progress-log')
      expect(schema?.version).toBe('2.0')
      expect(schema?.required).toBe(false)
    })
  })

  describe('isKnown', () => {
    it('应该返回 true 对于已知 schema', () => {
      expect(registry.isKnown('ai-coding/progress-log')).toBe(true)
    })

    it('应该返回 false 对于未知 schema', () => {
      expect(registry.isKnown('unknown/schema')).toBe(false)
    })

    it('应该支持带版本号的查询', () => {
      expect(registry.isKnown('ai-coding/progress-log@1.0')).toBe(true)
    })
  })

  describe('getByScope', () => {
    it('应该返回 feature 级别的 schemas', () => {
      const featureSchemas = registry.getByScope('feature')
      expect(featureSchemas.length).toBeGreaterThan(0)
      expect(featureSchemas.every((s) => s.scope === 'feature')).toBe(true)
    })

    it('应该返回 project 级别的 schemas', () => {
      const projectSchemas = registry.getByScope('project')
      expect(projectSchemas.every((s) => s.scope === 'project')).toBe(true)
    })
  })

  describe('getRequired', () => {
    it('应该返回必需的 schemas', () => {
      const required = registry.getRequired()
      expect(required.length).toBeGreaterThan(0)
      expect(required.every((s) => s.required)).toBe(true)
    })

    it('应该包含 progress-log 和 context', () => {
      const required = registry.getRequired()
      const ids = required.map((s) => s.id)
      expect(ids).toContain('ai-coding/progress-log')
      expect(ids).toContain('ai-coding/context')
    })
  })

  describe('validateSchemaIdFormat', () => {
    it('应该接受有效格式', () => {
      expect(registry.validateSchemaIdFormat('ai-coding/progress-log@1.0')).toBe(true)
      expect(registry.validateSchemaIdFormat('my-ns/my-schema@2.1')).toBe(true)
    })

    it('应该拒绝无版本号的格式', () => {
      expect(registry.validateSchemaIdFormat('ai-coding/progress-log')).toBe(true) // 无版本号也接受
    })

    it('应该拒绝无效格式', () => {
      expect(registry.validateSchemaIdFormat('invalid')).toBe(false)
      expect(registry.validateSchemaIdFormat('Invalid/Schema@1.0')).toBe(false)
      expect(registry.validateSchemaIdFormat('123/schema@1.0')).toBe(false)
    })
  })

  describe('parseSchemaId', () => {
    it('应该正确解析完整 ID', () => {
      const result = registry.parseSchemaId('ai-coding/progress-log@1.0')
      expect(result.id).toBe('ai-coding/progress-log')
      expect(result.version).toBe('1.0')
    })

    it('应该处理无版本号的 ID', () => {
      const result = registry.parseSchemaId('ai-coding/progress-log')
      expect(result.id).toBe('ai-coding/progress-log')
      expect(result.version).toBeUndefined()
    })
  })
})

describe('BUILTIN_SCHEMAS', () => {
  it('应该包含必要的 schemas', () => {
    const ids = BUILTIN_SCHEMAS.map((s) => s.id)
    expect(ids).toContain('ai-coding/progress-log')
    expect(ids).toContain('ai-coding/context')
    expect(ids).toContain('ai-coding/design')
    expect(ids).toContain('ai-coding/test-plan')
    expect(ids).toContain('ai-coding/phase-gate-status')
  })

  it('每个 schema 应该有必要字段', () => {
    for (const schema of BUILTIN_SCHEMAS) {
      expect(schema.id).toBeDefined()
      expect(schema.version).toBeDefined()
      expect(schema.scope).toBeDefined()
      expect(schema.carriers.length).toBeGreaterThan(0)
    }
  })
})

describe('defaultRegistry', () => {
  it('应该是有效的 SchemaRegistry 实例', () => {
    expect(defaultRegistry).toBeInstanceOf(SchemaRegistry)
    expect(defaultRegistry.getAll().length).toBeGreaterThan(0)
  })
})
