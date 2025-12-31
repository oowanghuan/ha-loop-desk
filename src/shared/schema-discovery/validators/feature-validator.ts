/**
 * Schema Discovery - Feature Validator
 *
 * Feature 完整性校验
 * @see docs/schema-discovery/50_DEV_PLAN.md P3-T1
 */

import type {
  FeatureScanResult,
  FeatureValidationReport,
  ValidationStatus,
  ValidationIssue,
} from '../types'
import type { FeatureSpec, FileTypeSpec } from '../project-config.types'
import { DEFAULT_FEATURE_SPEC } from '../project-config.defaults'

/**
 * 校验 Feature 完整性
 * @param feature Feature 扫描结果
 * @param spec Feature 规格
 * @param currentPhase 当前 Phase（用于检查 requiredFromPhase）
 */
export function validateFeature(
  feature: FeatureScanResult,
  spec: FeatureSpec = DEFAULT_FEATURE_SPEC,
  currentPhase?: number
): FeatureValidationReport {
  const issues: ValidationIssue[] = []
  const missingRequired: string[] = []
  const missingForPhase: string[] = []
  const warnings: string[] = []

  // 检查每种文件类型
  for (const [fileType, fileSpec] of Object.entries(spec.fileTypes)) {
    const hasFile = fileType in feature.primaryFiles

    if (!hasFile) {
      // 检查是否为必需文件
      if (fileSpec.required) {
        missingRequired.push(fileType)
        issues.push({
          level: 'error',
          code: 'MISSING_REQUIRED_FILE',
          message: `缺少必需文件: ${fileType}`,
          suggestion: `请创建 ${fileType} 文件并添加 _schema 字段`,
        })
      }
      // 检查当前 Phase 是否需要
      else if (
        currentPhase !== undefined &&
        fileSpec.requiredFromPhase !== undefined &&
        currentPhase >= fileSpec.requiredFromPhase
      ) {
        missingForPhase.push(`${fileType} (Phase ${fileSpec.requiredFromPhase}+)`)
        issues.push({
          level: 'warning',
          code: 'MISSING_PHASE_FILE',
          message: `当前 Phase ${currentPhase} 建议有 ${fileType} 文件`,
          suggestion: `从 Phase ${fileSpec.requiredFromPhase} 开始需要此文件`,
        })
      }
    }

    // 检查多实例限制
    if (hasFile && fileSpec.maxInstances !== undefined) {
      const allInstances = feature.allFiles[fileType] ?? []
      if (allInstances.length > fileSpec.maxInstances) {
        warnings.push(
          `${fileType} 有 ${allInstances.length} 个实例，超过限制 ${fileSpec.maxInstances}`
        )
        issues.push({
          level: 'warning',
          code: 'TOO_MANY_INSTANCES',
          message: `${fileType} 实例数量 (${allInstances.length}) 超过限制 (${fileSpec.maxInstances})`,
          suggestion: `请归档或删除多余的 ${fileType} 文件`,
        })
      }
    }
  }

  // 检查冲突
  if (feature.conflicts.length > 0) {
    for (const conflict of feature.conflicts) {
      if (!conflict.hasExplicitPrimary) {
        warnings.push(
          `${conflict.fileType} 有 ${conflict.instances.length} 个实例但无显式主文件`
        )
        issues.push({
          level: 'warning',
          code: 'IMPLICIT_PRIMARY',
          message: `${conflict.fileType} 没有显式指定主文件，当前使用: ${conflict.selectedPath}`,
          suggestion: `建议在主文件中添加 meta.is_primary: true`,
        })
      }
    }
  }

  // 确定整体状态
  let status: ValidationStatus = 'valid'
  if (missingRequired.length > 0) {
    status = 'error'
  } else if (missingForPhase.length > 0 || warnings.length > 0) {
    status = 'warning'
  }

  return {
    featureId: feature.featureId,
    status,
    missingRequired,
    missingForPhase,
    warnings,
    issues,
  }
}

/**
 * 获取 Feature 当前 Phase
 * 从 progress-log 或 phase-gate-status 中提取
 */
export function getFeaturePhase(feature: FeatureScanResult): number | undefined {
  // 尝试从 progress-log 提取
  const progressLog = feature.primaryFiles['progress-log']
  if (progressLog) {
    const content = progressLog.content as Record<string, unknown>
    if (typeof content?.meta === 'object' && content.meta !== null) {
      const meta = content.meta as Record<string, unknown>
      if (typeof meta.current_phase === 'number') {
        return meta.current_phase
      }
    }
  }

  // 尝试从 phase-gate-status 提取
  const phaseGateStatus = feature.primaryFiles['phase-gate-status']
  if (phaseGateStatus) {
    const content = phaseGateStatus.content as Record<string, unknown>
    if (typeof content?.current_phase === 'number') {
      return content.current_phase
    }
  }

  return undefined
}
