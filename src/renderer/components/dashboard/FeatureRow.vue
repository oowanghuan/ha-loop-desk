<script setup lang="ts">
/**
 * FeatureRow - Feature 行组件
 * 甘特图中的单行 Feature 展示
 * 支持按日期定位和重叠多行显示
 */
import { computed } from 'vue'
import type { FeatureInfo, PhaseStatus } from '../../types/dashboard.types'

interface Props {
  feature: FeatureInfo
  cellWidth?: number
  expanded?: boolean
  startDate: Date    // 可视区域起始日期
  daysToShow?: number
}

const props = withDefaults(defineProps<Props>(), {
  cellWidth: 60,
  expanded: true,
  daysToShow: 17
})

const emit = defineEmits<{
  (e: 'feature-click', featureId: string): void
  (e: 'phase-click', featureId: string, phaseId: number): void
  (e: 'toggle-expand'): void
  (e: 'view-progress', featureId: string): void
}>()

const statusClass = computed(() => `feature-row--${props.feature.status}`)

const statusTagType = computed(() => {
  switch (props.feature.status) {
    case 'wip': return 'primary'
    case 'done': return 'success'
    case 'blocked': return 'danger'
    default: return 'info'
  }
})

// 检查是否有进度记录
const hasProgress = computed(() => {
  // 如果有任何非 pending 的 phase，说明有进度
  return props.feature.phases?.some(p => p.status !== 'pending')
})

// 计算两个日期之间的天数
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round((date2.getTime() - date1.getTime()) / oneDay)
}

// 解析日期字符串
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

// 计算 phase 条的样式
function getPhaseStyle(phase: PhaseStatus) {
  const startDateParsed = parseDate(phase.startDate)
  const endDateParsed = parseDate(phase.endDate)

  if (!startDateParsed || !endDateParsed) {
    // 如果没有日期信息，返回默认样式
    return {
      left: `${(phase.phaseId - 1) * (props.cellWidth + 4)}px`,
      width: `${props.cellWidth}px`
    }
  }

  const startOffset = daysBetween(props.startDate, startDateParsed)
  const duration = daysBetween(startDateParsed, endDateParsed) + 1 // 包含结束日期

  return {
    left: `${startOffset * props.cellWidth}px`,
    width: `${Math.max(duration, 1) * props.cellWidth - 4}px`  // -4 for gap
  }
}

// 计算重叠的行（将重叠的 phases 分配到不同的行）
interface PhaseWithRow extends PhaseStatus {
  row: number
  style: { left: string; width: string }
}

const phasesWithRows = computed((): PhaseWithRow[] => {
  const phases = props.feature.phases || []
  const result: PhaseWithRow[] = []
  const rows: { endDay: number }[] = [] // 每行的结束日

  // 按开始日期排序
  const sortedPhases = [...phases]
    .filter(p => p.status !== 'pending' && p.status !== 'skipped')
    .sort((a, b) => {
      const aStart = parseDate(a.startDate)?.getTime() || 0
      const bStart = parseDate(b.startDate)?.getTime() || 0
      return aStart - bStart
    })

  for (const phase of sortedPhases) {
    const startDateParsed = parseDate(phase.startDate)
    const endDateParsed = parseDate(phase.endDate)

    const startDay = startDateParsed
      ? daysBetween(props.startDate, startDateParsed)
      : (phase.phaseId - 1) * 2
    const endDay = endDateParsed
      ? daysBetween(props.startDate, endDateParsed)
      : startDay + 1

    // 找到可以放置的行
    let rowIndex = rows.findIndex(row => row.endDay < startDay)
    if (rowIndex === -1) {
      rowIndex = rows.length
      rows.push({ endDay: endDay })
    } else {
      rows[rowIndex].endDay = endDay
    }

    result.push({
      ...phase,
      row: rowIndex,
      style: getPhaseStyle(phase)
    })
  }

  return result
})

// 计算需要多少行
const rowCount = computed(() => {
  if (phasesWithRows.value.length === 0) return 1
  return Math.max(...phasesWithRows.value.map(p => p.row)) + 1
})

// 获取状态对应的颜色
function getStatusColor(status: string): string {
  switch (status) {
    case 'done': return '#3ecf8e'
    case 'wip': return '#409eff'
    case 'blocked': return '#f56c6c'
    default: return '#909399'
  }
}
</script>

<template>
  <div class="feature-row" :class="statusClass">
    <!-- 左侧：Feature 信息 -->
    <div class="feature-row__info" @click="emit('feature-click', feature.id)">
      <button class="expand-btn" @click.stop="emit('toggle-expand')">
        <el-icon>
          <ArrowRight v-if="!expanded" />
          <ArrowDown v-else />
        </el-icon>
      </button>
      <div class="feature-details">
        <div class="feature-name">{{ feature.name }}</div>
        <div class="feature-meta">
          <el-tag :type="statusTagType" size="small" effect="plain">
            Phase {{ feature.currentPhase }}
          </el-tag>
          <span class="feature-progress">{{ feature.progress }}%</span>
        </div>
      </div>
      <!-- 查看进度文件按钮 -->
      <el-tooltip content="查看进度文件" placement="top">
        <button
          class="progress-btn"
          :class="{ 'progress-btn--active': hasProgress }"
          @click.stop="emit('view-progress', feature.id)"
        >
          <el-icon><Document /></el-icon>
        </button>
      </el-tooltip>
    </div>

    <!-- 右侧：时间轴甘特条 -->
    <div class="feature-row__timeline">
      <!-- 背景格子 -->
      <div class="timeline-grid">
        <div
          v-for="i in daysToShow"
          :key="i"
          class="timeline-cell"
          :style="{ width: `${cellWidth}px` }"
        />
      </div>

      <!-- Phase 条容器（支持多行） -->
      <div
        class="phases-container"
        :style="{ height: `${rowCount * 32 + (rowCount - 1) * 4}px` }"
      >
        <div
          v-for="phase in phasesWithRows"
          :key="phase.phaseId"
          class="phase-bar"
          :style="{
            ...phase.style,
            top: `${phase.row * 36}px`,
            backgroundColor: getStatusColor(phase.status)
          }"
          @click="emit('phase-click', feature.id, phase.phaseId)"
        >
          <span class="phase-label">{{ phase.phaseName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #3a4553;
  background: #252d3a;
  transition: background 0.2s;
  min-height: 56px;
}

.feature-row:hover {
  background: #2d3748;
}

.feature-row--blocked {
  background: rgba(245, 108, 108, 0.15);
}

.feature-row--blocked:hover {
  background: rgba(245, 108, 108, 0.2);
}

.feature-row__info {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 240px;
  min-width: 240px;
  padding: 12px 16px;
  cursor: pointer;
  border-right: 1px solid #3a4553;
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  color: #909399;
}

.expand-btn:hover {
  background: #3a4553;
  color: #c0c4cc;
}

.feature-details {
  flex: 1;
  min-width: 0;
}

.feature-name {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.feature-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-progress {
  font-size: 12px;
  color: #909399;
}

.progress-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #4a5568;
  background: #1e2735;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  color: #909399;
  flex-shrink: 0;
}

.progress-btn:hover {
  background: #3a4553;
  border-color: #606266;
  color: #c0c4cc;
}

.progress-btn--active {
  border-color: #d4a84b;
  color: #d4a84b;
  background: rgba(212, 168, 75, 0.1);
}

.progress-btn--active:hover {
  background: rgba(212, 168, 75, 0.2);
}

.feature-row__timeline {
  position: relative;
  flex: 1;
  overflow-x: auto;
  padding: 8px 0;
}

.timeline-grid {
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.timeline-cell {
  flex-shrink: 0;
  border-right: 1px solid #3a4553;
  height: 100%;
}

.phases-container {
  position: relative;
  min-height: 32px;
}

.phase-bar {
  position: absolute;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.phase-bar:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.phase-label {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
}

/* Hide scrollbar but allow scrolling */
.feature-row__timeline::-webkit-scrollbar {
  height: 0;
}
</style>
