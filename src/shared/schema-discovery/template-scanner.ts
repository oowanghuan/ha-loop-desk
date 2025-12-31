/**
 * Template Scanner - 扫描模板目录，自动发现各 Phase 的参考模板
 *
 * 扫描规则：
 * - 目录名 `0X_name` → Phase X 的模板目录
 * - 文件名 `*_TEMPLATE.md` 或 `*_TEMPLATE.yaml` → 模板文件
 * - _common/ 目录 → 所有 Phase 通用的模板
 */

import { readdirSync, statSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'

/** 扫描到的模板信息 */
export interface ScannedTemplate {
  /** 模板名称（文件名） */
  name: string
  /** 相对于项目根目录的路径 */
  path: string
  /** 描述（从文件名推断） */
  description: string
  /** 适用的 Phase ID（0-7），null 表示通用 */
  phaseId: number | null
  /** 文件类型 */
  type: 'markdown' | 'yaml'
  /** 是否为本地文件 */
  isLocal: true
}

/** Phase 目录映射 */
interface PhaseDirMapping {
  dir: string
  phaseId: number
  phaseName: string
}

/** 扫描结果 */
export interface TemplateScanResult {
  /** 按 Phase 分组的模板（使用 Record 以支持 IPC 序列化） */
  byPhase: Record<number, ScannedTemplate[]>
  /** 通用模板（适用于所有 Phase） */
  common: ScannedTemplate[]
  /** 所有模板 */
  all: ScannedTemplate[]
  /** 扫描统计 */
  stats: {
    totalTemplates: number
    scanTime: number
  }
}

/**
 * 扫描模板目录
 */
export function scanTemplates(projectRoot: string): TemplateScanResult {
  const startTime = Date.now()
  const templateDir = join(projectRoot, 'CC_COLLABORATION', '03_templates')

  // 使用 Record 而非 Map 以支持 IPC 序列化
  const byPhase: Record<number, ScannedTemplate[]> = {}
  const common: ScannedTemplate[] = []
  const all: ScannedTemplate[] = []

  // 初始化 Phase 分组
  for (let i = 0; i <= 7; i++) {
    byPhase[i] = []
  }

  if (!existsSync(templateDir)) {
    // 模板目录不存在是正常的，返回空结果
    return {
      byPhase,
      common,
      all,
      stats: { totalTemplates: 0, scanTime: Date.now() - startTime },
    }
  }

  // 扫描目录
  const entries = readdirSync(templateDir)

  for (const entry of entries) {
    const entryPath = join(templateDir, entry)
    const stat = statSync(entryPath)

    if (!stat.isDirectory()) continue

    // 解析目录名，提取 Phase ID
    const phaseMapping = parsePhaseDirName(entry)

    if (entry === '_common' || entry === '_foundation') {
      // 通用模板目录
      const templates = scanDirectory(entryPath, projectRoot, null)
      common.push(...templates)
      all.push(...templates)
    } else if (phaseMapping) {
      // Phase 特定的模板目录
      const templates = scanDirectory(entryPath, projectRoot, phaseMapping.phaseId)
      byPhase[phaseMapping.phaseId].push(...templates)
      all.push(...templates)
    }
  }

  return {
    byPhase,
    common,
    all,
    stats: {
      totalTemplates: all.length,
      scanTime: Date.now() - startTime,
    },
  }
}

/**
 * 扫描单个目录中的模板文件
 */
function scanDirectory(
  dir: string,
  projectRoot: string,
  phaseId: number | null
): ScannedTemplate[] {
  const templates: ScannedTemplate[] = []

  const scanRecursive = (currentDir: string) => {
    const entries = readdirSync(currentDir)

    for (const entry of entries) {
      const entryPath = join(currentDir, entry)
      const stat = statSync(entryPath)

      if (stat.isDirectory()) {
        // 递归扫描子目录
        scanRecursive(entryPath)
      } else if (isTemplateFile(entry)) {
        // 模板文件
        const relativePath = entryPath.replace(projectRoot + '/', '')
        templates.push({
          name: entry,
          path: relativePath,
          description: generateDescription(entry),
          phaseId,
          type: getFileType(entry),
          isLocal: true,
        })
      }
    }
  }

  scanRecursive(dir)
  return templates
}

/**
 * 解析 Phase 目录名
 * 例如：'01_kickoff' → { phaseId: 1, phaseName: 'kickoff' }
 */
function parsePhaseDirName(dirName: string): PhaseDirMapping | null {
  // 匹配 0X_name 格式
  const match = dirName.match(/^0?(\d)_(\w+)$/)
  if (match) {
    return {
      dir: dirName,
      phaseId: parseInt(match[1], 10),
      phaseName: match[2],
    }
  }
  return null
}

/**
 * 判断是否为模板文件
 */
function isTemplateFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  return (
    (lower.endsWith('_template.md') || lower.endsWith('_template.yaml') || lower.endsWith('_template.yml')) ||
    (lower.includes('template') && (lower.endsWith('.md') || lower.endsWith('.yaml') || lower.endsWith('.yml')))
  )
}

/**
 * 获取文件类型
 */
function getFileType(filename: string): 'markdown' | 'yaml' {
  const ext = extname(filename).toLowerCase()
  return ext === '.yaml' || ext === '.yml' ? 'yaml' : 'markdown'
}

/**
 * 从文件名生成描述
 */
function generateDescription(filename: string): string {
  // 移除扩展名和 _TEMPLATE 后缀
  let name = basename(filename, extname(filename))
  name = name.replace(/_TEMPLATE$/i, '')

  // 移除数字前缀
  name = name.replace(/^\d+_/, '')

  // 转换为可读格式
  const descriptions: Record<string, string> = {
    'CONTEXT': '功能上下文模板',
    'UI_FLOW_SPEC': 'UI 流程规格模板',
    'API_SPEC': 'API 规格模板',
    'DEMO_REVIEW': 'Demo 评审模板',
    'DESIGN': '设计文档模板',
    'DEV_PLAN': '开发计划模板',
    'TEST_PLAN': '测试计划模板',
    'TEST_REPORT': '测试报告模板',
    'RELEASE_NOTE': '发布说明模板',
    'CHANGELOG': '变更记录模板',
    'PHASE_GATE': 'Phase Gate 配置模板',
    'DAILY_SUMMARY': '每日总结模板',
    'REVIEW_REPORT': '评审报告模板',
  }

  return descriptions[name] || `${name} 模板`
}

/**
 * 获取指定 Phase 的模板（含通用模板）
 */
export function getTemplatesForPhase(
  scanResult: TemplateScanResult,
  phaseId: number
): ScannedTemplate[] {
  const phaseTemplates = scanResult.byPhase[phaseId] || []
  // 合并 Phase 特定模板和通用模板
  return [...phaseTemplates, ...scanResult.common]
}
