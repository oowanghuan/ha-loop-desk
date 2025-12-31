<script setup lang="ts">
import { computed } from 'vue'
import type { ExecutionItem, ExecutionStatus } from '../types/workflow.types'
import { getStatusStyle, getBlockedReason, canExecute } from '../utils/executionStatus'

const props = defineProps<{
  step: ExecutionItem
}>()

const emit = defineEmits<{
  (e: 'execute', step: ExecutionItem): void
  (e: 'openTerminal', step: ExecutionItem): void
}>()

// 状态样式
const statusStyle = computed(() => getStatusStyle(props.step.status))

// 阻塞原因
const blockedReason = computed(() => {
  if (props.step.status !== 'blocked') return ''
  return getBlockedReason(props.step.prerequisite, {
    allTasksCompleted: false,
    expertReviewPassed: false,
    gateStatus: {},
    phaseHasExpertReview: true,
  })
})

// 是否可执行
const isExecutable = computed(() => canExecute(props.step.status))

// 是否显示为已完成
const isCompleted = computed(() =>
  ['verified', 'approved'].includes(props.step.status)
)

// 获取图标名称
const iconName = computed(() => {
  const iconMap: Record<string, string> = {
    'calendar-check': 'Calendar',
    'search': 'Search',
    'clipboard-check': 'Document',
    'check-circle': 'CircleCheck',
    'arrow-right': 'Right',
    'calendar-x': 'Calendar',
    'play': 'VideoPlay',
    'terminal': 'Monitor',
    'loading': 'Loading',
    'check': 'Check',
    'x-circle': 'CircleClose',
    'lock': 'Lock',
    'clock': 'Clock',
  }
  return iconMap[props.step.icon || ''] || 'Document'
})

// 按钮文案
const buttonLabel = computed(() => {
  const { status, executionMode } = props.step

  if (status === 'failed') return '重试'
  if (executionMode === 'interactive') return '在终端中打开'

  return '执行'
})

// 点击执行
const handleExecute = () => {
  if (props.step.executionMode === 'interactive') {
    emit('openTerminal', props.step)
  } else {
    emit('execute', props.step)
  }
}

// Owner 标签 (统一使用 info 类型，简化颜色)
const ownerLabel = computed(() => {
  switch (props.step.owner) {
    case 'cc': return 'CC'
    case 'human': return '人工'
    default: return '协作'
  }
})
</script>

<template>
  <div
    class="framework-step-card"
    :class="{
      'is-completed': isCompleted,
      'is-blocked': step.status === 'blocked',
      'is-running': step.status === 'running',
      'is-failed': step.status === 'failed',
    }"
  >
    <!-- 状态指示器 -->
    <div class="status-indicator" :style="{ backgroundColor: statusStyle.color }">
      <el-icon v-if="step.status === 'running'" class="is-loading">
        <Loading />
      </el-icon>
      <el-icon v-else-if="isCompleted">
        <Check />
      </el-icon>
      <el-icon v-else-if="step.status === 'blocked'">
        <Lock />
      </el-icon>
      <el-icon v-else-if="step.status === 'failed'">
        <Close />
      </el-icon>
    </div>

    <!-- 内容区域 -->
    <div class="step-content">
      <div class="step-header">
        <span class="step-name">{{ step.name }}</span>
        <div class="step-badges">
          <span class="owner-badge">{{ ownerLabel }}</span>
          <span class="command-badge">{{ step.command }}</span>
        </div>
      </div>

      <div class="step-description">{{ step.description }}</div>

      <!-- 阻塞提示 -->
      <div v-if="step.status === 'blocked'" class="blocked-hint">
        <el-icon><Lock /></el-icon>
        <span>{{ blockedReason }}</span>
      </div>

      <!-- 失败提示 -->
      <div v-if="step.status === 'failed' && step.failureRecovery" class="failure-hint">
        <el-icon><Warning /></el-icon>
        <span>{{ step.failureRecovery.suggestion }}</span>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="step-actions">
      <el-button
        v-if="!isCompleted && step.status !== 'skipped'"
        size="small"
        :type="step.status === 'failed' ? 'danger' : 'primary'"
        :disabled="!isExecutable"
        @click="handleExecute"
      >
        <el-icon v-if="step.executionMode === 'interactive'"><Monitor /></el-icon>
        <el-icon v-else><VideoPlay /></el-icon>
        {{ buttonLabel }}
      </el-button>

      <!-- Hybrid 模式的下拉菜单 -->
      <el-dropdown
        v-if="step.executionMode === 'hybrid' && isExecutable"
        trigger="click"
        @command="(cmd: string) => cmd === 'terminal' ? emit('openTerminal', step) : emit('execute', step)"
      >
        <el-button size="small" type="info" text>
          <el-icon><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="execute">直接执行</el-dropdown-item>
            <el-dropdown-item command="terminal">在终端中继续</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 完成状态 -->
      <el-tag v-if="isCompleted" type="success" size="small">
        {{ step.status === 'approved' ? '已通过' : '已完成' }}
      </el-tag>

      <!-- 跳过状态 -->
      <el-tag v-if="step.status === 'skipped'" type="info" size="small">
        已跳过
      </el-tag>
    </div>
  </div>
</template>

<style scoped>
.framework-step-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #1e222a;
  border-radius: 8px;
  border: 1px solid #30363d;
  transition: all 0.2s ease;
}

.framework-step-card:hover {
  border-color: #484f58;
}

.framework-step-card.is-completed {
  opacity: 0.7;
}

.framework-step-card.is-blocked {
  opacity: 0.6;
}

.framework-step-card.is-failed {
  border-color: #f85149;
}

.framework-step-card.is-running {
  border-color: #58a6ff;
}

.status-indicator {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: #30363d;
  color: #8b949e;
}

.is-completed .status-indicator {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
}

.is-running .status-indicator {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.is-blocked .status-indicator {
  background: #21262d;
  color: #6e7681;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.step-name {
  font-size: 14px;
  font-weight: 600;
  color: #e6edf3;
}

.step-badges {
  display: flex;
  gap: 6px;
}

.owner-badge,
.command-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #21262d;
  color: #8b949e;
  border: 1px solid #30363d;
}

.command-badge {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #7d8590;
}

.step-description {
  font-size: 12px;
  color: #8b949e;
  margin-bottom: 4px;
}

.blocked-hint,
.failure-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 4px;
}

.blocked-hint {
  color: #8b949e;
  background: #21262d;
}

.failure-hint {
  color: #f85149;
  background: rgba(248, 81, 73, 0.1);
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

:deep(.el-button--primary) {
  background: #238636;
  border-color: #238636;
}

:deep(.el-button--primary:hover) {
  background: #2ea043;
  border-color: #2ea043;
}

:deep(.el-tag--small) {
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
}

:deep(.el-tag--success) {
  background: rgba(63, 185, 80, 0.15);
  border-color: transparent;
  color: #3fb950;
}
</style>
