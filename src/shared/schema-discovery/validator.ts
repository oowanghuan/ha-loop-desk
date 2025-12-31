/**
 * Schema Discovery - Validator
 *
 * 校验器主类
 * @see docs/schema-discovery/50_DEV_PLAN.md P3-T3
 */

import type {
  ScanResult,
  ValidationReport,
  ValidationStatus,
  FeatureValidationReport,
} from './types'
import type { FeatureSpec } from './project-config.types'
import { DEFAULT_FEATURE_SPEC } from './project-config.defaults'
import { validateFeature, getFeaturePhase } from './validators/feature-validator'

/**
 * 校验器
 */
export class Validator {
  private featureSpec: FeatureSpec

  constructor(featureSpec: FeatureSpec = DEFAULT_FEATURE_SPEC) {
    this.featureSpec = featureSpec
  }

  /**
   * 校验扫描结果
   * @param scanResult 扫描结果
   */
  validate(scanResult: ScanResult): ValidationReport {
    const featureReports = new Map<string, FeatureValidationReport>()
    let overallStatus: ValidationStatus = 'valid'

    // 校验每个 Feature
    for (const [featureId, feature] of scanResult.features) {
      // 获取当前 Phase
      const currentPhase = getFeaturePhase(feature)

      // 校验 Feature
      const report = validateFeature(feature, this.featureSpec, currentPhase)
      featureReports.set(featureId, report)

      // 更新整体状态
      if (report.status === 'error') {
        overallStatus = 'error'
      } else if (report.status === 'warning' && overallStatus !== 'error') {
        overallStatus = 'warning'
      }
    }

    // 检查 unknownSchemas
    if (scanResult.unknownSchemas.length > 0 && overallStatus === 'valid') {
      overallStatus = 'warning'
    }

    return {
      status: overallStatus,
      featureReports,
      unknownSchemaCount: scanResult.unknownSchemas.length,
      timestamp: new Date(),
    }
  }

  /**
   * 获取校验摘要
   */
  getSummary(report: ValidationReport): string {
    const lines: string[] = []

    lines.push(`校验状态: ${this.getStatusText(report.status)}`)
    lines.push(`Feature 数量: ${report.featureReports.size}`)

    // 统计各状态数量
    let validCount = 0
    let warningCount = 0
    let errorCount = 0

    for (const [, featureReport] of report.featureReports) {
      switch (featureReport.status) {
        case 'valid':
          validCount++
          break
        case 'warning':
          warningCount++
          break
        case 'error':
          errorCount++
          break
      }
    }

    lines.push(
      `  - 通过: ${validCount}, 警告: ${warningCount}, 错误: ${errorCount}`
    )

    if (report.unknownSchemaCount > 0) {
      lines.push(`未知 Schema: ${report.unknownSchemaCount}`)
    }

    return lines.join('\n')
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: ValidationStatus): string {
    switch (status) {
      case 'valid':
        return '✅ 通过'
      case 'warning':
        return '⚠️ 有警告'
      case 'error':
        return '❌ 有错误'
    }
  }
}

// ============================================================
// 导出默认实例
// ============================================================

/**
 * 默认校验器
 */
export const defaultValidator = new Validator()
