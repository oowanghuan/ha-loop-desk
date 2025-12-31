/**
 * Output Matcher - 将 PHASE_GATE 定义的 outputs 与 Schema Discovery 发现的文件匹配
 *
 * 职责：
 * 1. 读取 PHASE_GATE.yaml 的 required_outputs
 * 2. 与 discoveredFiles 匹配
 * 3. 生成带 exists 状态的 artifacts 列表
 */

import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { parse as parseYaml } from 'yaml'
import type { Artifact } from '../types/project.types'
import type { DiscoveredFileInfo } from '../types/ipc.types'

/** PHASE_GATE 中定义的 output */
export interface RequiredOutput {
  path: string
  required: boolean
  description: string
  condition?: string
  base_path?: 'project_root' | 'feature_dir'
}

/** Phase 的 outputs 定义 */
export interface PhaseOutputs {
  phaseId: number
  phaseName: string
  requiredOutputs: RequiredOutput[]
}

/** 匹配结果 */
export interface MatchedOutput extends RequiredOutput {
  exists: boolean
  actualPath?: string
  matchedFile?: DiscoveredFileInfo
}

/**
 * 从 PHASE_GATE.yaml 读取所有 Phase 的 required_outputs
 */
export function loadPhaseOutputs(featurePath: string): PhaseOutputs[] {
  const phaseGatePath = join(featurePath, 'PHASE_GATE.yaml')

  if (!existsSync(phaseGatePath)) {
    // PHASE_GATE.yaml 不存在是正常的，使用默认配置
    return getDefaultPhaseOutputs()
  }

  try {
    const content = readFileSync(phaseGatePath, 'utf-8')
    const phaseGate = parseYaml(content) as Record<string, unknown>

    const phaseNames = [
      { key: 'phase_1_kickoff', name: 'Kickoff', id: 1 },
      { key: 'phase_2_spec', name: 'Spec', id: 2 },
      { key: 'phase_3_demo', name: 'Demo', id: 3 },
      { key: 'phase_4_design', name: 'Design', id: 4 },
      { key: 'phase_5_code', name: 'Code', id: 5 },
      { key: 'phase_6_test', name: 'Test', id: 6 },
      { key: 'phase_7_deploy', name: 'Deploy', id: 7 },
    ]

    return phaseNames.map(phase => {
      const phaseData = phaseGate[phase.key] as Record<string, unknown> | undefined
      const rawOutputs = (phaseData?.required_outputs || []) as Array<Record<string, unknown>>

      const requiredOutputs: RequiredOutput[] = rawOutputs.map(out => ({
        path: out.path as string,
        required: out.required !== false,
        description: (out.description as string) || '',
        condition: out.condition as string | undefined,
        base_path: out.base_path as 'project_root' | 'feature_dir' | undefined,
      }))

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        requiredOutputs,
      }
    })
  } catch (err) {
    console.error(`[OutputMatcher] Failed to parse PHASE_GATE.yaml:`, err)
    return getDefaultPhaseOutputs()
  }
}

/**
 * 将 required_outputs 与 discoveredFiles 匹配
 */
export function matchOutputs(
  requiredOutputs: RequiredOutput[],
  discoveredFiles: DiscoveredFileInfo[],
  featurePath: string,
  projectRoot: string
): MatchedOutput[] {
  return requiredOutputs.map(output => {
    const match = findMatchingFile(output, discoveredFiles, featurePath, projectRoot)

    return {
      ...output,
      exists: match !== null,
      actualPath: match?.path,
      matchedFile: match || undefined,
    }
  })
}

/**
 * 查找匹配的文件
 */
function findMatchingFile(
  output: RequiredOutput,
  discoveredFiles: DiscoveredFileInfo[],
  featurePath: string,
  projectRoot: string
): DiscoveredFileInfo | null {
  const outputPath = output.path

  // 处理通配符路径（如 "demos/{feature}/src/**/*.vue"）
  if (outputPath.includes('*') || outputPath.includes('{feature}')) {
    // 简单的通配符匹配
    const pattern = outputPath
      .replace('{feature}', '[^/]+')
      .replace('**/', '.*')
      .replace('*', '[^/]*')
    const regex = new RegExp(pattern)

    return discoveredFiles.find(f => regex.test(f.path)) || null
  }

  // 精确匹配（支持相对路径）
  const expectedFileName = basename(outputPath)

  // 尝试多种匹配方式
  for (const file of discoveredFiles) {
    const fileName = basename(file.path)

    // 1. 文件名完全匹配
    if (fileName === expectedFileName) {
      return file
    }

    // 2. 路径后缀匹配
    if (file.path.endsWith(outputPath)) {
      return file
    }
  }

  // 3. 检查文件是否实际存在于磁盘
  const basePath = output.base_path === 'project_root' ? projectRoot : featurePath
  const fullPath = join(basePath, outputPath)

  if (existsSync(fullPath)) {
    // 文件存在但未被 Schema Discovery 发现（可能是非 schema 文件）
    return {
      fileType: 'unknown',
      path: outputPath,
      displayName: basename(outputPath),
      schema: 'unknown',
    }
  }

  return null
}

/**
 * 将匹配结果转换为 Artifact 格式
 */
export function matchedOutputsToArtifacts(matchedOutputs: MatchedOutput[]): Artifact[] {
  return matchedOutputs.map((output, index) => ({
    id: `artifact-${index}`,
    name: output.description || basename(output.path),
    path: output.actualPath || output.path,
    type: getArtifactType(output.path),
    exists: output.exists,
    lastModified: output.exists ? new Date().toISOString() : undefined,
  }))
}

function getArtifactType(path: string): Artifact['type'] {
  if (path.endsWith('.md')) return 'markdown'
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.vue') || path.endsWith('.ts') || path.endsWith('.js')) return 'code'
  return 'other'
}

/**
 * 默认的 Phase Outputs（当 PHASE_GATE.yaml 不存在时使用）
 */
function getDefaultPhaseOutputs(): PhaseOutputs[] {
  return [
    {
      phaseId: 1,
      phaseName: 'Kickoff',
      requiredOutputs: [
        { path: '10_CONTEXT.md', required: true, description: '功能上下文文档' },
        { path: '90_PROGRESS_LOG.yaml', required: true, description: '进度日志' },
      ],
    },
    {
      phaseId: 2,
      phaseName: 'Spec',
      requiredOutputs: [
        { path: '20_SPEC.md', required: true, description: '功能规格文档' },
      ],
    },
    {
      phaseId: 3,
      phaseName: 'Demo',
      requiredOutputs: [],
    },
    {
      phaseId: 4,
      phaseName: 'Design',
      requiredOutputs: [
        { path: '40_DESIGN_FINAL.md', required: true, description: '详细设计文档' },
      ],
    },
    {
      phaseId: 5,
      phaseName: 'Code',
      requiredOutputs: [
        { path: '50_DEV_PLAN.md', required: true, description: '开发计划' },
      ],
    },
    {
      phaseId: 6,
      phaseName: 'Test',
      requiredOutputs: [
        { path: '60_TEST_PLAN.md', required: true, description: '测试计划' },
        { path: '61_TEST_REPORT.md', required: true, description: '测试报告' },
      ],
    },
    {
      phaseId: 7,
      phaseName: 'Deploy',
      requiredOutputs: [
        { path: '70_RELEASE_NOTE.md', required: true, description: '发布说明' },
      ],
    },
  ]
}
