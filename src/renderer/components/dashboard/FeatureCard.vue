<script setup lang="ts">
/**
 * FeatureCard - Feature 卡片组件
 * 卡片视图中的单个 Feature 展示
 */
import { computed } from 'vue'
import type { FeatureInfo, PhaseStatus } from '../../types/dashboard.types'

interface Props {
  feature: FeatureInfo
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const statusTagType = computed(() => {
  switch (props.feature.status) {
    case 'wip': return 'primary'
    case 'done': return 'success'
    case 'blocked': return 'danger'
    default: return 'info'
  }
})

const statusLabel = computed(() => {
  switch (props.feature.status) {
    case 'wip': return '进行中'
    case 'done': return '已完成'
    case 'blocked': return '阻塞'
    default: return '待开始'
  }
})

const getPhaseClass = (phase: PhaseStatus): string => {
  return `phase-dot--${phase.status}`
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '未知'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div
    class="feature-card"
    :class="`feature-card--${feature.status}`"
    @click="emit('click')"
  >
    <div class="feature-card__header">
      <span class="feature-card__name">{{ feature.name }}</span>
      <el-tag :type="statusTagType" size="small">{{ statusLabel }}</el-tag>
    </div>

    <div class="feature-card__progress">
      <div class="progress-label">
        <span>Phase {{ feature.currentPhase }}: {{ feature.currentPhaseName }}</span>
        <span class="progress-value">{{ feature.progress }}%</span>
      </div>
      <el-progress
        :percentage="feature.progress"
        :stroke-width="6"
        :show-text="false"
        :status="feature.status === 'done' ? 'success' : undefined"
      />
    </div>

    <div class="feature-card__phases">
      <el-tooltip
        v-for="phase in feature.phases"
        :key="phase.phaseId"
        :content="`${phase.phaseName}: ${phase.progress}%`"
        placement="top"
      >
        <span
          class="phase-dot"
          :class="getPhaseClass(phase)"
        >
          {{ phase.phaseId }}
        </span>
      </el-tooltip>
    </div>

    <div class="feature-card__footer">
      <span class="last-updated">
        <el-icon size="12"><Clock /></el-icon>
        {{ formatDate(feature.lastUpdated) }}
      </span>
      <el-button size="small" type="primary">
        <el-icon><Right /></el-icon>
        进入
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.feature-card {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.feature-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.feature-card--blocked {
  border-left: 4px solid #f56c6c;
}

.feature-card--done {
  opacity: 0.8;
}

.feature-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feature-card__name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.feature-card__progress {
  margin-bottom: 12px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}

.progress-value {
  font-weight: 600;
  color: #409eff;
}

.feature-card__phases {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.phase-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  background: #c0c4cc;
}

.phase-dot--done {
  background: #67c23a;
}

.phase-dot--wip {
  background: #409eff;
}

.phase-dot--pending {
  background: #c0c4cc;
}

.phase-dot--blocked {
  background: #f56c6c;
}

.phase-dot--skipped {
  background: #909399;
}

.feature-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.last-updated {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
