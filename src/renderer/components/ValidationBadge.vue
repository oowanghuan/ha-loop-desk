<script setup lang="ts">
/**
 * ValidationBadge - Schema Discovery 校验状态徽章
 *
 * 展示 Feature 的校验状态：
 * - valid (绿色 ✓): 所有必需文件完整
 * - warning (橙色 ⚠): 缺少可选文件或有冲突
 * - error (红色 ✗): 缺少必需文件
 */

import { computed } from 'vue'
import { ElTooltip, ElTag } from 'element-plus'

const props = defineProps<{
  /** 校验状态 */
  status: 'valid' | 'warning' | 'error'
  /** 缺失的必需文件 */
  missingRequired?: string[]
  /** 缺失的阶段相关文件 */
  missingForPhase?: string[]
  /** 是否有冲突 */
  hasConflicts?: boolean
  /** 紧凑模式（只显示图标） */
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

// 状态配置
const statusConfig = computed(() => {
  switch (props.status) {
    case 'valid':
      return {
        type: 'success' as const,
        icon: '✓',
        label: '校验通过',
        description: '所有必需文件完整'
      }
    case 'warning':
      return {
        type: 'warning' as const,
        icon: '⚠',
        label: '存在警告',
        description: buildWarningDescription()
      }
    case 'error':
      return {
        type: 'danger' as const,
        icon: '✗',
        label: '校验失败',
        description: buildErrorDescription()
      }
  }
})

function buildWarningDescription(): string {
  const parts: string[] = []

  if (props.missingForPhase && props.missingForPhase.length > 0) {
    parts.push(`缺少阶段文件: ${props.missingForPhase.join(', ')}`)
  }

  if (props.hasConflicts) {
    parts.push('存在多实例冲突')
  }

  return parts.length > 0 ? parts.join('；') : '存在潜在问题'
}

function buildErrorDescription(): string {
  if (props.missingRequired && props.missingRequired.length > 0) {
    return `缺少必需文件: ${props.missingRequired.join(', ')}`
  }
  return '校验失败'
}

function handleClick() {
  emit('click')
}
</script>

<template>
  <el-tooltip
    :content="statusConfig.description"
    placement="top"
    :show-after="300"
  >
    <el-tag
      :type="statusConfig.type"
      :class="['validation-badge', { 'validation-badge--compact': compact }]"
      :effect="compact ? 'plain' : 'light'"
      size="small"
      @click="handleClick"
    >
      <span class="validation-badge__icon">{{ statusConfig.icon }}</span>
      <span v-if="!compact" class="validation-badge__label">
        {{ statusConfig.label }}
      </span>
    </el-tag>
  </el-tooltip>
</template>

<style scoped>
.validation-badge {
  cursor: pointer;
  transition: all 0.2s ease;
}

.validation-badge:hover {
  transform: scale(1.05);
}

.validation-badge--compact {
  padding: 0 6px;
  min-width: 24px;
  justify-content: center;
}

.validation-badge__icon {
  font-size: 12px;
}

.validation-badge__label {
  margin-left: 4px;
  font-size: 12px;
}
</style>
