<script setup lang="ts">
/**
 * StatusBar 组件
 * 显示全局状态信息条
 */
import { computed } from 'vue'

export interface StatusBarProps {
  /** 当前 Phase 编号 (0-7) */
  currentPhase: number
  /** Phase 总数 */
  totalPhases: number
  /** Phase 名称 */
  phaseName: string
  /** 已完成任务数 */
  completedTasks: number
  /** 总任务数 */
  totalTasks: number
  /** 待审批项数 */
  pendingApprovals: number
  /** 上次同步时间 */
  lastSyncTime?: Date | string | null
  /** 是否正在同步 */
  syncing?: boolean
}

const props = withDefaults(defineProps<StatusBarProps>(), {
  syncing: false,
})

// 格式化时间
const formattedSyncTime = computed(() => {
  if (!props.lastSyncTime) return '未同步'

  const date = typeof props.lastSyncTime === 'string'
    ? new Date(props.lastSyncTime)
    : props.lastSyncTime

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟
  if (diff < 60000) return '刚刚'
  // 小于1小时
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  // 小于24小时
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

  // 显示日期
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
})

// 任务完成百分比
const taskProgress = computed(() => {
  if (props.totalTasks === 0) return 0
  return Math.round((props.completedTasks / props.totalTasks) * 100)
})
</script>

<template>
  <div class="status-bar">
    <!-- Phase 进度 -->
    <div class="status-item phase-status">
      <el-icon class="status-icon"><Flag /></el-icon>
      <span class="status-label">Phase {{ currentPhase }}/{{ totalPhases }}</span>
      <span class="status-value">{{ phaseName }}</span>
    </div>

    <!-- 分隔符 -->
    <div class="status-divider"></div>

    <!-- 任务完成度 -->
    <div class="status-item task-status">
      <el-icon class="status-icon"><List /></el-icon>
      <span class="status-label">任务</span>
      <span class="status-value">{{ completedTasks }}/{{ totalTasks }}</span>
      <el-progress
        :percentage="taskProgress"
        :stroke-width="4"
        :show-text="false"
        class="task-progress"
        color="#3fb950"
      />
    </div>

    <!-- 分隔符 -->
    <div class="status-divider"></div>

    <!-- 待审批项 -->
    <div class="status-item approval-status" :class="{ 'has-pending': pendingApprovals > 0 }">
      <el-icon class="status-icon"><Bell /></el-icon>
      <span v-if="pendingApprovals > 0" class="status-value pending">
        {{ pendingApprovals }} 项需要审批
      </span>
      <span v-else class="status-value">
        无待审批
      </span>
    </div>

    <!-- 右侧区域 -->
    <div class="status-right">
      <!-- 同步状态 -->
      <div class="status-item sync-status">
        <el-icon v-if="syncing" class="status-icon is-loading"><Loading /></el-icon>
        <el-icon v-else class="status-icon"><Refresh /></el-icon>
        <span class="status-label">{{ syncing ? '同步中...' : formattedSyncTime }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 10px 24px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
  font-size: 14px;
  height: var(--status-bar-height);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-icon {
  font-size: 18px;
  color: #6e7681;
}

.status-label {
  color: #8b949e;
  font-size: 14px;
}

.status-value {
  color: #e6edf3;
  font-weight: 600;
  font-size: 14px;
}

.status-divider {
  width: 1px;
  height: 20px;
  background: #30363d;
}

/* Phase Status */
.phase-status .status-icon {
  color: #58a6ff;
}

.phase-status .status-value {
  color: #58a6ff;
}

/* Task Status */
.task-status {
  gap: 10px;
}

.task-progress {
  width: 80px;
}

.task-progress :deep(.el-progress-bar__outer) {
  background: #21262d;
  height: 4px;
  border-radius: 2px;
}

.task-progress :deep(.el-progress-bar__inner) {
  border-radius: 2px;
}

/* Approval Status */
.approval-status.has-pending .status-icon {
  color: #f0883e;
}

.approval-status .status-value.pending {
  color: #f0883e;
  font-weight: 600;
}

/* Right Section */
.status-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Sync Status */
.sync-status .status-icon {
  font-size: 16px;
}

.sync-status .status-label {
  font-size: 14px;
  color: #6e7681;
}
</style>
