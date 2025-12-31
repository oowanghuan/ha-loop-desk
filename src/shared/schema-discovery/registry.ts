/**
 * Schema Discovery - Schema Registry
 *
 * Schema 注册表，管理内置和自定义 Schema 定义
 * @see docs/schema-discovery/40_DESIGN.md
 */

import type { SchemaDefinition, ISchemaRegistry, FileCarrier } from './types'

// ============================================================
// 内置 Schema 定义
// ============================================================

/**
 * 内置 Schema 列表
 * @see docs/schema-discovery/specs/PROJECT_YAML_SPEC.md
 */
export const BUILTIN_SCHEMAS: SchemaDefinition[] = [
  {
    id: 'ai-coding/progress-log',
    version: '1.0',
    description: '功能进度日志，追踪开发任务和状态',
    scope: 'feature',
    required: true,
    identifierField: 'meta.feature',
    legacyFields: ['feature', 'feature_id'],
    carriers: ['yaml'],
  },
  {
    id: 'ai-coding/context',
    version: '1.0',
    description: '功能上下文文档，定义背景、边界和用户故事',
    scope: 'feature',
    required: true,
    identifierField: 'meta.feature',
    legacyFields: ['feature'],
    carriers: ['md-frontmatter'],
  },
  {
    id: 'ai-coding/design',
    version: '1.0',
    description: '技术设计文档',
    scope: 'feature',
    required: false,
    identifierField: 'meta.feature',
    carriers: ['md-frontmatter'],
  },
  {
    id: 'ai-coding/test-plan',
    version: '1.0',
    description: '测试计划文档',
    scope: 'feature',
    required: false,
    identifierField: 'meta.feature',
    carriers: ['md-frontmatter', 'yaml'],
  },
  {
    id: 'ai-coding/phase-gate-status',
    version: '1.0',
    description: 'Phase Gate 状态追踪',
    scope: 'feature',
    required: false,
    identifierField: 'meta.feature',
    carriers: ['yaml'],
  },
  // 项目级 Schema
  {
    id: 'ai-coding/project',
    version: '1.0',
    description: '项目配置文件',
    scope: 'project',
    required: false,
    identifierField: 'project.name',
    carriers: ['yaml'],
  },
  {
    id: 'ai-coding/phase-gate',
    version: '1.0',
    description: 'Phase Gate 规则定义',
    scope: 'project',
    required: false,
    identifierField: 'phase_gate.name',
    carriers: ['yaml'],
  },
]

// ============================================================
// Schema Registry 实现
// ============================================================

/**
 * Schema 注册表
 */
export class SchemaRegistry implements ISchemaRegistry {
  /** Schema 存储（schemaId -> SchemaDefinition） */
  private schemas: Map<string, SchemaDefinition> = new Map()

  /**
   * 构造函数
   * @param customSchemas 自定义 Schema 列表
   */
  constructor(customSchemas?: SchemaDefinition[]) {
    // 注册内置 Schema
    for (const schema of BUILTIN_SCHEMAS) {
      this.register(schema)
    }

    // 注册自定义 Schema
    if (customSchemas) {
      for (const schema of customSchemas) {
        this.register(schema)
      }
    }
  }

  /**
   * 获取 Schema 定义
   * @param schemaId Schema ID，支持带版本号（如 'ai-coding/progress-log@1.0'）
   */
  get(schemaId: string): SchemaDefinition | undefined {
    // 解析 schemaId，移除版本号
    const baseId = this.parseSchemaId(schemaId).id
    return this.schemas.get(baseId)
  }

  /**
   * 获取所有 Schema 定义
   */
  getAll(): SchemaDefinition[] {
    return Array.from(this.schemas.values())
  }

  /**
   * 注册新 Schema（或覆盖已有）
   */
  register(schema: SchemaDefinition): void {
    this.schemas.set(schema.id, schema)
  }

  /**
   * 检查 Schema 是否已知
   */
  isKnown(schemaId: string): boolean {
    const baseId = this.parseSchemaId(schemaId).id
    return this.schemas.has(baseId)
  }

  /**
   * 按作用域获取 Schema 列表
   */
  getByScope(scope: 'feature' | 'project'): SchemaDefinition[] {
    return this.getAll().filter((s) => s.scope === scope)
  }

  /**
   * 获取必需的 Schema 列表
   */
  getRequired(): SchemaDefinition[] {
    return this.getAll().filter((s) => s.required)
  }

  /**
   * 检查载体类型是否支持
   */
  supportsCarrier(schemaId: string, carrier: FileCarrier): boolean {
    const schema = this.get(schemaId)
    if (!schema) return false
    return schema.carriers.includes(carrier)
  }

  /**
   * 解析 Schema ID
   * @param schemaId 完整 ID（如 'ai-coding/progress-log@1.0'）
   * @returns { id, version }
   */
  parseSchemaId(schemaId: string): { id: string; version?: string } {
    const match = schemaId.match(/^(.+?)(?:@(\d+\.\d+))?$/)
    if (!match) {
      return { id: schemaId }
    }
    return {
      id: match[1],
      version: match[2],
    }
  }

  /**
   * 格式化完整 Schema ID
   */
  formatSchemaId(id: string, version?: string): string {
    if (version) {
      return `${id}@${version}`
    }
    const schema = this.get(id)
    if (schema) {
      return `${id}@${schema.version}`
    }
    return id
  }

  /**
   * 验证 Schema ID 格式
   * @returns 是否为有效格式
   */
  validateSchemaIdFormat(schemaId: string): boolean {
    // 格式：namespace/name@major.minor
    const pattern = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*(@\d+\.\d+)?$/
    return pattern.test(schemaId)
  }
}

// ============================================================
// 导出默认实例
// ============================================================

/**
 * 默认 Schema 注册表实例
 */
export const defaultRegistry = new SchemaRegistry()
