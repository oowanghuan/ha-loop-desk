/**
 * Schema Discovery - Project Scanner
 *
 * 项目扫描器，发现所有带 _schema 的文件
 * @see docs/schema-discovery/40_DESIGN.md
 */

import * as fs from 'fs'
import * as path from 'path'
import { minimatch } from 'minimatch'
import type {
  DiscoveredFile,
  ScanResult,
  FeatureScanResult,
  FileTypeMap,
  UnknownSchemaItem,
  UnknownSchemaHint,
  ScanStats,
  ProjectLevelFiles,
  ConflictReportUI,
  FileMeta,
} from './types'
import type { ProjectConfig } from './project-config.types'
import { SchemaRegistry, defaultRegistry } from './registry'
import { MultiInstanceResolver, defaultResolver } from './multi-instance-resolver'
import { LegacyDetector, defaultLegacyDetector } from './legacy-detector'
import { parseYamlFileSync, isYamlFile, extractFeatureId } from './parsers/yaml-parser'
import {
  parseFrontmatterSync,
  isMarkdownFile,
  extractFeatureIdFromFrontmatter,
} from './parsers/frontmatter-parser'
import { DEFAULT_PROJECT_CONFIG } from './project-config.defaults'

// ============================================================
// ProjectScanner 类
// ============================================================

/**
 * 项目扫描器选项
 */
export interface ScannerOptions {
  /** Schema 注册表 */
  registry?: SchemaRegistry
  /** 多实例决策器 */
  resolver?: MultiInstanceResolver
  /** 降级检测器 */
  legacyDetector?: LegacyDetector
}

/**
 * 项目扫描器
 */
export class ProjectScanner {
  private registry: SchemaRegistry
  private resolver: MultiInstanceResolver
  private legacyDetector: LegacyDetector
  private config: ProjectConfig

  constructor(config?: Partial<ProjectConfig>, options?: ScannerOptions) {
    this.config = { ...DEFAULT_PROJECT_CONFIG, ...config } as ProjectConfig
    this.registry = options?.registry ?? defaultRegistry
    this.resolver = options?.resolver ?? defaultResolver
    this.legacyDetector = options?.legacyDetector ?? defaultLegacyDetector
  }

  /**
   * 扫描项目
   * @param projectRoot 项目根目录
   */
  async scan(projectRoot: string): Promise<ScanResult> {
    const startTime = Date.now()

    // 收集所有文件
    const allFiles = this.collectFiles(projectRoot)
    const totalFiles = allFiles.length

    // 解析文件
    const discovered: DiscoveredFile[] = []
    const unknownSchemas: UnknownSchemaItem[] = []

    for (const filePath of allFiles) {
      const result = this.parseFile(projectRoot, filePath)
      if (result) {
        if (result.type === 'discovered') {
          discovered.push(result.file)
        } else if (result.type === 'unknown') {
          unknownSchemas.push(result.item)
        }
      }
    }

    // 按 featureId 分组
    const featureMap = this.groupByFeature(discovered)

    // 处理多实例冲突
    const features = this.resolveConflicts(featureMap)

    // 提取项目级配置文件
    const projectConfig = this.extractProjectLevelFiles(discovered)

    const scanTime = Date.now() - startTime

    return {
      features,
      projectConfig,
      unknownSchemas,
      stats: {
        totalFiles,
        schemaFiles: discovered.length,
        scanTime,
      },
    }
  }

  /**
   * 同步版本的扫描
   */
  scanSync(projectRoot: string): ScanResult {
    const startTime = Date.now()

    const allFiles = this.collectFiles(projectRoot)
    const totalFiles = allFiles.length

    const discovered: DiscoveredFile[] = []
    const unknownSchemas: UnknownSchemaItem[] = []

    for (const filePath of allFiles) {
      const result = this.parseFile(projectRoot, filePath)
      if (result) {
        if (result.type === 'discovered') {
          discovered.push(result.file)
        } else if (result.type === 'unknown') {
          unknownSchemas.push(result.item)
        }
      }
    }

    const featureMap = this.groupByFeature(discovered)
    const features = this.resolveConflicts(featureMap)
    const projectConfig = this.extractProjectLevelFiles(discovered)

    const scanTime = Date.now() - startTime

    return {
      features,
      projectConfig,
      unknownSchemas,
      stats: {
        totalFiles,
        schemaFiles: discovered.length,
        scanTime,
      },
    }
  }

  /**
   * 收集所有需要扫描的文件
   */
  private collectFiles(projectRoot: string): string[] {
    const files: string[] = []
    const ignorePatterns = this.config.scanner?.ignore ?? []
    const maxDepth = this.config.scanner?.maxDepth ?? 10

    this.walkDir(projectRoot, '', files, ignorePatterns, maxDepth, 0)

    return files
  }

  /**
   * 递归遍历目录
   */
  private walkDir(
    projectRoot: string,
    relativePath: string,
    files: string[],
    ignorePatterns: string[],
    maxDepth: number,
    currentDepth: number
  ): void {
    if (currentDepth > maxDepth) {
      return
    }

    const fullPath = path.join(projectRoot, relativePath)

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(fullPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const entryRelPath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name

      // 检查是否匹配忽略模式
      if (this.shouldIgnore(entryRelPath, ignorePatterns)) {
        continue
      }

      if (entry.isDirectory()) {
        this.walkDir(
          projectRoot,
          entryRelPath,
          files,
          ignorePatterns,
          maxDepth,
          currentDepth + 1
        )
      } else if (entry.isFile()) {
        // 只处理 YAML 和 Markdown 文件
        if (isYamlFile(entry.name) || isMarkdownFile(entry.name)) {
          files.push(entryRelPath)
        }
      }
    }
  }

  /**
   * 检查路径是否应被忽略
   */
  private shouldIgnore(relativePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (minimatch(relativePath, pattern, { dot: true })) {
        return true
      }
    }
    return false
  }

  /**
   * 解析单个文件
   */
  private parseFile(
    projectRoot: string,
    relativePath: string
  ):
    | { type: 'discovered'; file: DiscoveredFile }
    | { type: 'unknown'; item: UnknownSchemaItem }
    | null {
    const fullPath = path.join(projectRoot, relativePath)

    let stat: fs.Stats
    try {
      stat = fs.statSync(fullPath)
    } catch {
      return null
    }

    const lastModified = stat.mtime
    const size = stat.size

    // 根据文件类型解析
    if (isYamlFile(relativePath)) {
      return this.parseYamlAndClassify(
        relativePath,
        fullPath,
        lastModified,
        size
      )
    } else if (isMarkdownFile(relativePath)) {
      return this.parseMarkdownAndClassify(
        relativePath,
        fullPath,
        lastModified,
        size
      )
    }

    return null
  }

  /**
   * 解析 YAML 文件并分类
   */
  private parseYamlAndClassify(
    relativePath: string,
    fullPath: string,
    lastModified: Date,
    size: number
  ):
    | { type: 'discovered'; file: DiscoveredFile }
    | { type: 'unknown'; item: UnknownSchemaItem }
    | null {
    const result = parseYamlFileSync(fullPath)

    if (!result.success) {
      return null
    }

    // 有 _schema 字段
    if (result.schema) {
      return this.classifyWithSchema(
        relativePath,
        result.schema,
        'yaml',
        result.content,
        lastModified,
        size
      )
    }

    // 无 _schema，尝试降级检测
    const legacyFile = this.legacyDetector.detect(
      relativePath,
      result.content,
      lastModified,
      size
    )

    if (legacyFile) {
      return { type: 'discovered', file: legacyFile }
    }

    return null
  }

  /**
   * 解析 Markdown 文件并分类
   */
  private parseMarkdownAndClassify(
    relativePath: string,
    fullPath: string,
    lastModified: Date,
    size: number
  ):
    | { type: 'discovered'; file: DiscoveredFile }
    | { type: 'unknown'; item: UnknownSchemaItem }
    | null {
    const result = parseFrontmatterSync(fullPath)

    if (!result.success) {
      return null
    }

    // 有 _schema 字段
    if (result.schema) {
      return this.classifyWithSchema(
        relativePath,
        result.schema,
        'md-frontmatter',
        result.frontmatter,
        lastModified,
        size
      )
    }

    // 无 _schema，尝试降级检测
    const legacyFile = this.legacyDetector.detect(
      relativePath,
      result.frontmatter,
      lastModified,
      size
    )

    if (legacyFile) {
      return { type: 'discovered', file: legacyFile }
    }

    return null
  }

  /**
   * 分类带 _schema 的文件
   */
  private classifyWithSchema(
    relativePath: string,
    schema: string,
    carrier: 'yaml' | 'md-frontmatter',
    content: unknown,
    lastModified: Date,
    size: number
  ):
    | { type: 'discovered'; file: DiscoveredFile }
    | { type: 'unknown'; item: UnknownSchemaItem } {
    // 检查 schema 格式是否有效
    if (!this.registry.validateSchemaIdFormat(schema)) {
      const file: DiscoveredFile = {
        path: relativePath,
        schema,
        carrier,
        content,
        lastModified,
        size,
      }
      return {
        type: 'unknown',
        item: {
          file,
          hint: {
            category: 'invalid',
            message: `Schema ID 格式无效: ${schema}`,
            suggestion: `格式应为 namespace/name@major.minor，如 ai-coding/progress-log@1.0`,
          },
        },
      }
    }

    // 检查 schema 是否已知
    const schemaDef = this.registry.get(schema)
    if (!schemaDef) {
      const file: DiscoveredFile = {
        path: relativePath,
        schema,
        carrier,
        content,
        lastModified,
        size,
      }
      return {
        type: 'unknown',
        item: {
          file,
          hint: {
            category: 'unknown',
            message: `未知的 Schema: ${schema}`,
            suggestion: `请检查 Schema ID 是否正确，或在 project.yaml 中注册自定义 Schema`,
          },
        },
      }
    }

    // 提取元信息
    const meta = this.extractMeta(content, schemaDef.identifierField, schemaDef.legacyFields)

    const file: DiscoveredFile = {
      path: relativePath,
      schema,
      carrier,
      content,
      lastModified,
      size,
      meta,
    }

    return { type: 'discovered', file }
  }

  /**
   * 提取元信息
   */
  private extractMeta(
    content: unknown,
    identifierField: string,
    legacyFields?: string[]
  ): FileMeta | undefined {
    if (typeof content !== 'object' || content === null) {
      return undefined
    }

    const obj = content as Record<string, unknown>
    const meta: FileMeta = {}

    // 提取 featureId
    const featureId = extractFeatureId(content, identifierField, legacyFields)
    if (featureId) {
      meta.feature = featureId
    }

    // 提取其他元信息
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
   * 按 featureId 分组
   */
  private groupByFeature(
    files: DiscoveredFile[]
  ): Map<string, DiscoveredFile[]> {
    const map = new Map<string, DiscoveredFile[]>()

    for (const file of files) {
      // 跳过项目级文件
      const schemaDef = this.registry.get(file.schema)
      if (schemaDef?.scope === 'project') {
        continue
      }

      const featureId = file.meta?.feature ?? this.inferFeatureId(file.path)
      if (!featureId) {
        continue
      }

      if (!map.has(featureId)) {
        map.set(featureId, [])
      }
      map.get(featureId)!.push(file)
    }

    return map
  }

  /**
   * 从路径推断 featureId
   */
  private inferFeatureId(filePath: string): string | undefined {
    const docsMatch = filePath.match(/docs\/([^/]+)\//)
    if (docsMatch) {
      return docsMatch[1]
    }

    const featuresMatch = filePath.match(/features\/([^/]+)\//)
    if (featuresMatch) {
      return featuresMatch[1]
    }

    return undefined
  }

  /**
   * 解决多实例冲突
   */
  private resolveConflicts(
    featureMap: Map<string, DiscoveredFile[]>
  ): Map<string, FeatureScanResult> {
    const result = new Map<string, FeatureScanResult>()

    for (const [featureId, files] of featureMap) {
      // 按文件类型分组
      const filesByType = new Map<string, DiscoveredFile[]>()

      for (const file of files) {
        const fileType = this.getFileType(file.schema)
        if (!filesByType.has(fileType)) {
          filesByType.set(fileType, [])
        }
        filesByType.get(fileType)!.push(file)
      }

      // 解决每种类型的冲突
      const primaryFiles: FileTypeMap = {}
      const allFiles: Record<string, DiscoveredFile[]> = {}
      const conflicts: ConflictReportUI[] = []

      for (const [fileType, instances] of filesByType) {
        allFiles[fileType] = instances

        const resolution = this.resolver.resolvePrimaryFile(
          instances,
          fileType,
          featureId
        )

        if (resolution.primary) {
          primaryFiles[fileType] = resolution.primary
        }

        // 多实例时记录冲突
        if (instances.length > 1 && resolution.conflictUI) {
          conflicts.push(resolution.conflictUI)
        }
      }

      // 推断 baseDir
      const baseDir = this.inferBaseDir(files)

      result.set(featureId, {
        featureId,
        primaryFiles,
        allFiles,
        conflicts,
        baseDir,
      })
    }

    return result
  }

  /**
   * 获取文件类型
   */
  private getFileType(schema: string): string {
    const { id } = this.registry.parseSchemaId(schema)
    // ai-coding/progress-log -> progress-log
    const parts = id.split('/')
    return parts[parts.length - 1]
  }

  /**
   * 推断 baseDir
   */
  private inferBaseDir(files: DiscoveredFile[]): string | undefined {
    if (files.length === 0) {
      return undefined
    }

    // 找最短公共路径前缀
    const paths = files.map((f) => f.path.split('/').slice(0, -1).join('/'))
    if (paths.length === 0) {
      return undefined
    }

    let common = paths[0]
    for (let i = 1; i < paths.length; i++) {
      while (!paths[i].startsWith(common)) {
        common = common.split('/').slice(0, -1).join('/')
        if (!common) {
          return undefined
        }
      }
    }

    return common || undefined
  }

  /**
   * 提取项目级配置文件
   */
  private extractProjectLevelFiles(
    files: DiscoveredFile[]
  ): ProjectLevelFiles {
    const result: ProjectLevelFiles = {}

    for (const file of files) {
      const schemaDef = this.registry.get(file.schema)
      if (schemaDef?.scope !== 'project') {
        continue
      }

      if (file.schema.includes('phase-gate') && !file.schema.includes('status')) {
        result.phaseGate = file
      }
    }

    return result
  }
}

// ============================================================
// 导出默认实例工厂
// ============================================================

/**
 * 创建扫描器
 */
export function createScanner(
  config?: Partial<ProjectConfig>,
  options?: ScannerOptions
): ProjectScanner {
  return new ProjectScanner(config, options)
}
