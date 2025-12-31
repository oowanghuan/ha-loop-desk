<script setup lang="ts">
/**
 * PhaseBar - Phase 进度条组件
 * 甘特图中的单个 Phase 进度条
 */
import { computed } from 'vue'
import type { PhaseStatus } from '../../types/dashboard.types'

interface Props {
  phase: PhaseStatus
  cellWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  cellWidth: 60
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const barClass = computed(() => `phase-bar--${props.phase.status}`)

const barWidth = computed(() => {
  // 每个 phase 占 1 个单位宽度
  return `${props.cellWidth}px`
})

const progressWidth = computed(() => {
  return `${props.phase.progress}%`
})

const statusIcon = computed(() => {
  switch (props.phase.status) {
    case 'done': return 'CircleCheckFilled'
    case 'wip': return 'Loading'
    case 'blocked': return 'WarningFilled'
    case 'skipped': return 'RemoveFilled'
    default: return 'Clock'
  }
})
</script>

<template>
  <div
    class="phase-bar"
    :class="barClass"
    :style="{ width: barWidth }"
    @click="emit('click')"
  >
    <div class="phase-bar__progress" :style="{ width: progressWidth }"></div>
    <div class="phase-bar__content">
      <el-icon size="12">
        <component :is="statusIcon" />
      </el-icon>
      <span class="phase-name">{{ phase.phaseName }}</span>
    </div>
    <el-tooltip
      :content="`${phase.phaseName}: ${phase.progress}% (${phase.status})`"
      placement="top"
    >
      <div class="phase-bar__overlay"></div>
    </el-tooltip>
  </div>
</template>

<style scoped>
.phase-bar {
  position: relative;
  height: 28px;
  border-radius: 4px;
  background: #ebeef5;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.phase-bar:hover {
  transform: scaleY(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.phase-bar__progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  transition: width 0.3s;
}

.phase-bar--done .phase-bar__progress {
  background: linear-gradient(90deg, #67c23a, #85ce61);
}

.phase-bar--wip .phase-bar__progress {
  background: linear-gradient(90deg, #409eff, #66b1ff);
}

.phase-bar--pending .phase-bar__progress {
  background: #c0c4cc;
}

.phase-bar--blocked .phase-bar__progress {
  background: linear-gradient(90deg, #f56c6c, #f78989);
}

.phase-bar--skipped .phase-bar__progress {
  background: #909399;
}

.phase-bar__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 100%;
  color: #ffffff;
  font-size: 11px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.phase-bar--pending .phase-bar__content {
  color: #606266;
  text-shadow: none;
}

.phase-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.phase-bar__overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
}
</style>
