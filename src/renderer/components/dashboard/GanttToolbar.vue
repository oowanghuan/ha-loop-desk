<script setup lang="ts">
/**
 * GanttToolbar - 甘特图工具栏
 * 包含：显示已归档、时间刻度切换、状态图例
 */

type TimeScale = 'day' | 'week' | 'month'

interface Props {
  showArchived?: boolean
  timeScale?: TimeScale
}

const props = withDefaults(defineProps<Props>(), {
  showArchived: false,
  timeScale: 'day'
})

const emit = defineEmits<{
  (e: 'update:showArchived', value: boolean): void
  (e: 'update:timeScale', value: TimeScale): void
}>()

const timeScaleOptions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' }
]

const statusLegend = [
  { label: '已完成', color: '#67c23a' },
  { label: '进行中', color: '#409eff' },
  { label: '阻塞', color: '#f56c6c' },
  { label: '待开始', color: '#909399', outline: true }
]
</script>

<template>
  <div class="gantt-toolbar">
    <div class="toolbar-left">
      <!-- 显示已归档 -->
      <el-checkbox
        :model-value="showArchived"
        @update:model-value="emit('update:showArchived', $event)"
      >
        <el-icon><FolderOpened /></el-icon>
        显示已归档
      </el-checkbox>

      <!-- 时间刻度切换 -->
      <el-button-group class="time-scale-group">
        <el-button
          v-for="option in timeScaleOptions"
          :key="option.value"
          :type="timeScale === option.value ? 'primary' : 'default'"
          size="small"
          @click="emit('update:timeScale', option.value as TimeScale)"
        >
          {{ option.label }}
        </el-button>
      </el-button-group>
    </div>

    <div class="toolbar-right">
      <!-- 状态图例 -->
      <div class="status-legend">
        <div
          v-for="status in statusLegend"
          :key="status.label"
          class="legend-item"
        >
          <span
            class="legend-dot"
            :class="{ 'legend-dot--outline': status.outline }"
            :style="{ backgroundColor: status.outline ? 'transparent' : status.color, borderColor: status.color }"
          />
          <span class="legend-label">{{ status.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1e2735;
  border-bottom: 1px solid #3a4553;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

:deep(.el-checkbox) {
  color: #c0c4cc;
}

:deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #c0c4cc;
}

.time-scale-group {
  display: flex;
}

.time-scale-group :deep(.el-button) {
  min-width: 40px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.status-legend {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 2px solid transparent;
}

.legend-dot--outline {
  border-width: 2px;
  border-style: dashed;
}

.legend-label {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
