<script setup lang="ts">
/**
 * RightPanel - 执行清单面板
 * 采用三层流程结构: 每日开始 → 执行流程 → 每日结束
 */
import { computed } from 'vue'
import { useExecutionEngine } from '../composables/useExecutionEngine'
import WorkflowStage from './WorkflowStage.vue'
import NextActionHint from './NextActionHint.vue'
import FrameworkStepCard from './FrameworkStepCard.vue'
import TaskCard from './TaskCard.vue'
import type { ExecutionItem } from '../types/workflow.types'
import type { StageStatus } from './WorkflowStage.vue'
import type { NextAction } from './NextActionHint.vue'

const props = defineProps<{
  phaseId: number
  featureId: string
}>()

const emit = defineEmits<{
  (e: 'execute', item: ExecutionItem): void
  (e: 'openTerminal', item: ExecutionItem): void
  (e: 'preview', path: string): void
  (e: 'approve', item: ExecutionItem): void
}>()

// 使用 ExecutionEngine
const {
  loading,
  error,
  localDataWarning,
  beforeTaskSteps,
  featureTasks,
  afterTaskSteps,
  endSteps,
  progress,
  completedSteps,
  totalSteps,
  refresh,
} = useExecutionEngine(
  () => props.phaseId,
  () => props.featureId
)

// === 三层流程数据计算 ===

// Stage 1: 每日开始 (从 beforeTaskSteps 提取 start-day)
const startDayStep = computed(() => {
  return beforeTaskSteps.value.find(step =>
    step.id.includes('start-day') || step.command?.includes('/start-day')
  )
})

// Stage 2: 执行流程内容
// - Feature Tasks
// - Phase Gate Steps (expert-review, check-gate, approve-gate)
const phaseGateSteps = computed(() => {
  return afterTaskSteps.value.filter(step =>
    step.id.includes('expert-review') ||
    step.id.includes('check-gate') ||
    step.id.includes('approve-gate') ||
    step.command?.includes('/expert-review') ||
    step.command?.includes('/check-gate') ||
    step.command?.includes('/approve-gate')
  )
})

// Stage 3: 每日结束 (从 endSteps 提取 end-day)
const endDayStep = computed(() => {
  return endSteps.value.find(step =>
    step.id.includes('end-day') || step.command?.includes('/end-day')
  )
})

// === 状态计算 ===

// Stage 1 状态
const stage1Status = computed<StageStatus>(() => {
  if (!startDayStep.value) return 'pending'
  if (['verified', 'approved', 'skipped'].includes(startDayStep.value.status)) return 'completed'
  if (startDayStep.value.status === 'running') return 'active'
  return 'pending'
})

// Stage 2 状态
const stage2Status = computed<StageStatus>(() => {
  // 如果 Stage 1 未完成，则 pending
  if (stage1Status.value !== 'completed') return 'pending'

  // 检查所有 feature tasks 和 phase gate steps
  const allStage2Items = [...featureTasks.value, ...phaseGateSteps.value]
  if (allStage2Items.length === 0) return 'pending'

  const allCompleted = allStage2Items.every(item =>
    ['verified', 'approved', 'skipped', 'generated'].includes(item.status)
  )
  if (allCompleted) return 'completed'

  // 有任何进行中或待处理的项目
  const hasActive = allStage2Items.some(item =>
    ['running', 'pending', 'ready', 'blocked'].includes(item.status)
  )
  if (hasActive) return 'active'

  return 'pending'
})

// Stage 3 状态
const stage3Status = computed<StageStatus>(() => {
  if (stage2Status.value !== 'completed') return 'pending'
  if (!endDayStep.value) return 'pending'
  if (['verified', 'approved', 'skipped'].includes(endDayStep.value.status)) return 'completed'
  if (endDayStep.value.status === 'running') return 'active'
  return 'pending'
})

// Stage 2 进度统计
const stage2Progress = computed(() => {
  const allItems = [...featureTasks.value, ...phaseGateSteps.value]
  const completed = allItems.filter(item =>
    ['verified', 'approved', 'skipped', 'generated'].includes(item.status)
  ).length
  return { completed, total: allItems.length }
})

// === 下一步提示计算 ===
const nextAction = computed<NextAction | null>(() => {
  // Stage 1: 需要执行每日开始
  if (stage1Status.value === 'pending' && startDayStep.value) {
    return {
      type: 'start-day',
      text: '建议先执行「每日开始」来同步今日工作状态',
      buttonText: '开始今天',
      executable: true,
    }
  }

  // Stage 2: 有待处理的任务
  if (stage2Status.value === 'active') {
    const pendingTask = featureTasks.value.find(t => t.status === 'pending' || t.status === 'running')
    if (pendingTask) {
      return {
        type: 'feature',
        text: `继续处理: ${pendingTask.command || pendingTask.id}`,
        executable: false,
      }
    }

    const pendingGate = phaseGateSteps.value.find(s => s.status === 'pending')
    if (pendingGate) {
      if (pendingGate.id.includes('expert-review')) {
        return {
          type: 'expert-review',
          text: '任务完成，建议进行专家评审',
          buttonText: '开始评审',
          executable: true,
        }
      }
      if (pendingGate.id.includes('check-gate')) {
        return {
          type: 'check-gate',
          text: '评审通过，检查 Phase Gate 状态',
          buttonText: '检查状态',
          executable: true,
        }
      }
      if (pendingGate.id.includes('approve-gate')) {
        return {
          type: 'approve-gate',
          text: 'Phase Gate 检查完成，等待审批',
          buttonText: '审批通过',
          executable: true,
        }
      }
    }
  }

  // Stage 3: 需要执行每日结束
  if (stage2Status.value === 'completed' && stage3Status.value === 'pending' && endDayStep.value) {
    return {
      type: 'end-day',
      text: '今日任务已完成，建议执行「每日结束」生成总结',
      buttonText: '结束今天',
      executable: true,
    }
  }

  return null
})

// === 事件处理 ===
const handleExecute = (item: ExecutionItem) => {
  emit('execute', item)
}

const handleOpenTerminal = (item: ExecutionItem) => {
  emit('openTerminal', item)
}

const handlePreview = (path: string) => {
  emit('preview', path)
}

const handleApprove = (item: ExecutionItem) => {
  emit('approve', item)
}

// 处理下一步提示按钮点击
const handleNextActionExecute = (action: NextAction) => {
  let item: ExecutionItem | undefined

  switch (action.type) {
    case 'start-day':
      item = startDayStep.value
      break
    case 'end-day':
      item = endDayStep.value
      break
    case 'expert-review':
    case 'check-gate':
    case 'approve-gate':
      item = phaseGateSteps.value.find(s => s.id.includes(action.type))
      break
  }

  if (item) {
    emit('execute', item)
  }
}

// 处理 Stage 执行
const handleStageExecute = (stage: 1 | 2 | 3) => {
  if (stage === 1 && startDayStep.value) {
    emit('execute', startDayStep.value)
  } else if (stage === 3 && endDayStep.value) {
    emit('execute', endDayStep.value)
  }
}
</script>

<template>
  <div class="right-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-title">
        <span class="title-text">执行清单</span>
        <el-tag size="small" type="info">{{ completedSteps }}/{{ totalSteps }}</el-tag>
      </div>
      <div class="header-actions">
        <el-button size="small" text @click="refresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-section">
      <el-progress
        :percentage="progress"
        :stroke-width="4"
        :show-text="false"
        color="#3fb950"
      />
      <span class="progress-text">{{ progress }}% 完成</span>
    </div>

    <!-- Local Data Warning -->
    <div v-if="localDataWarning" class="local-data-warning">
      <el-icon><InfoFilled /></el-icon>
      <span>{{ localDataWarning }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载执行清单...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <el-icon color="#ef4444"><WarningFilled /></el-icon>
      <span>{{ error }}</span>
      <el-button size="small" @click="refresh">重试</el-button>
    </div>

    <!-- Three-Stage Workflow -->
    <div v-else class="workflow-container">
      <!-- 下一步提示 -->
      <NextActionHint
        v-if="nextAction"
        :action="nextAction"
        @execute="handleNextActionExecute"
      />

      <!-- Stage 1: 每日开始 -->
      <WorkflowStage
        v-if="startDayStep"
        :number="1"
        title="每日开始"
        subtitle="同步今日工作状态"
        :status="stage1Status"
        @execute="handleStageExecute(1)"
      />

      <!-- Stage 2: 执行流程 -->
      <WorkflowStage
        :number="2"
        title="执行流程"
        :subtitle="`Feature 任务 + Phase Gate`"
        :status="stage2Status"
        :status-text="stage2Status === 'active' ? `进行中 ${stage2Progress.completed}/${stage2Progress.total}` : undefined"
        :expandable="true"
      >
        <!-- Feature Tasks -->
        <div v-if="featureTasks.length > 0" class="stage-section">
          <div class="section-label">
            <el-icon><List /></el-icon>
            <span>Feature 任务</span>
            <el-tag size="small" type="info">{{ featureTasks.length }} 项</el-tag>
          </div>
          <div class="task-list">
            <TaskCard
              v-for="(task, index) in featureTasks"
              :key="task.id"
              :task="task"
              :index="index"
              @execute="handleExecute"
              @approve="handleApprove"
              @preview="handlePreview"
            />
          </div>
        </div>

        <!-- Empty Tasks Hint -->
        <div v-else class="empty-tasks">
          <el-icon><Document /></el-icon>
          <span>暂无 Feature 任务</span>
          <span class="hint-sub">任务来自 90_PROGRESS_LOG.yaml</span>
        </div>

        <!-- Phase Gate Steps -->
        <div v-if="phaseGateSteps.length > 0" class="stage-section gate-section">
          <div class="section-label">
            <el-icon><Finished /></el-icon>
            <span>Phase Gate</span>
          </div>
          <div class="step-list">
            <FrameworkStepCard
              v-for="step in phaseGateSteps"
              :key="step.id"
              :step="step"
              @execute="handleExecute"
              @open-terminal="handleOpenTerminal"
            />
          </div>
        </div>
      </WorkflowStage>

      <!-- Stage 3: 每日结束 -->
      <WorkflowStage
        v-if="endDayStep"
        :number="3"
        title="每日结束"
        subtitle="生成工作总结"
        :status="stage3Status"
        @execute="handleStageExecute(3)"
      />
    </div>
  </div>
</template>

<style scoped>
.right-panel {
  flex: 1;
  background: #0d1117;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height) - var(--phase-nav-height) - var(--status-bar-height));
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #21262d;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-size: 14px;
  font-weight: 600;
  color: #f7fafc;
}

.progress-section {
  padding: 12px 16px;
  border-bottom: 1px solid #2d3748;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-section :deep(.el-progress) {
  flex: 1;
}

.progress-text {
  font-size: 12px;
  color: #a0aec0;
  white-space: nowrap;
}

.local-data-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(234, 179, 8, 0.1);
  border-bottom: 1px solid rgba(234, 179, 8, 0.2);
  color: #eab308;
  font-size: 12px;
}

.local-data-warning .el-icon {
  flex-shrink: 0;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #718096;
}

.error-state {
  color: #ef4444;
}

/* Workflow Container */
.workflow-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Stage Sections */
.stage-section {
  margin-bottom: 16px;
}

.stage-section:last-child {
  margin-bottom: 0;
}

.gate-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #30363d;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8b949e;
  margin-bottom: 12px;
}

.task-list,
.step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-list {
  gap: 12px;
}

.empty-tasks {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: #6e7681;
  gap: 6px;
}

.empty-tasks .hint-sub {
  font-size: 11px;
  color: #484f58;
}

:deep(.el-tag--small) {
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
}
</style>
