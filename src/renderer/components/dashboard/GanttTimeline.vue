<script setup lang="ts">
/**
 * GanttTimeline - 甘特图时间轴
 * 包含：日期导航、日期列头、TODAY指示器
 */
import { ref, computed, watch } from 'vue'

type TimeScale = 'day' | 'week' | 'month'

interface Props {
  timeScale?: TimeScale
  cellWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  timeScale: 'day',
  cellWidth: 60
})

const emit = defineEmits<{
  (e: 'date-change', startDate: Date, endDate: Date): void
  (e: 'update:startDate', date: Date): void
}>()

// 当前日期范围的起始日期
const startDate = ref(getInitialStartDate())

// 获取初始起始日期（当前日期前7天）
function getInitialStartDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  date.setHours(0, 0, 0, 0)
  return date
}

// 根据时间刻度计算显示的天数
const daysToShow = computed(() => {
  switch (props.timeScale) {
    case 'day': return 17  // 约 2.5 周
    case 'week': return 56 // 8 周
    case 'month': return 90 // 3 个月
    default: return 17
  }
})

// 计算日期列表
const dates = computed(() => {
  const result: Date[] = []
  const current = new Date(startDate.value)

  for (let i = 0; i < daysToShow.value; i++) {
    result.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return result
})

// 结束日期
const endDate = computed(() => {
  const d = new Date(startDate.value)
  d.setDate(d.getDate() + daysToShow.value - 1)
  return d
})

// 日期范围显示
const dateRangeDisplay = computed(() => {
  const start = startDate.value
  const end = endDate.value
  const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${formatDate(start)} ~ ${formatDate(end)}`
})

// 今天是否在可视范围内
const todayInRange = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today >= startDate.value && today <= endDate.value
})

// 格式化日期显示
function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 获取星期几
function getDayOfWeek(date: Date): string {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return days[date.getDay()]
}

// 判断是否是今天
function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

// 判断是否是周末
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

// 导航方法
function goEarlier() {
  const newDate = new Date(startDate.value)
  newDate.setDate(newDate.getDate() - 7)
  startDate.value = newDate
}

function goLater() {
  const newDate = new Date(startDate.value)
  newDate.setDate(newDate.getDate() + 7)
  startDate.value = newDate
}

function goToday() {
  startDate.value = getInitialStartDate()
}

function reset() {
  startDate.value = getInitialStartDate()
}

// TODAY 指示器位置（相对于可视区域的偏移）
const todayOffset = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate.value)
  const oneDay = 24 * 60 * 60 * 1000
  const days = Math.round((today.getTime() - start.getTime()) / oneDay)
  return days * props.cellWidth + props.cellWidth / 2 // 居中在当天格子
})

// 暴露 startDate 给父组件
defineExpose({
  startDate: computed(() => startDate.value),
  daysToShow
})

// 监听日期变化
watch([startDate, endDate], () => {
  emit('date-change', startDate.value, endDate.value)
  emit('update:startDate', startDate.value)
}, { immediate: true })
</script>

<template>
  <div class="gantt-timeline">
    <!-- 日期导航 -->
    <div class="timeline-nav">
      <div class="nav-left">
        <!-- 占位，与功能模块列对齐 -->
      </div>
      <div class="nav-right">
        <el-button text size="small" @click="goEarlier">
          <el-icon><ArrowLeft /></el-icon>
          更早
        </el-button>
        <span class="date-range">{{ dateRangeDisplay }}</span>
        <el-button
          text
          size="small"
          :type="todayInRange ? 'primary' : 'default'"
          @click="goToday"
        >
          <el-icon><Location /></el-icon>
          今天
        </el-button>
        <el-button text size="small" @click="reset">
          重置
        </el-button>
        <el-button text size="small" @click="goLater">
          更晚
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 日期头部 -->
    <div class="timeline-header">
      <div class="header-left">
        <span class="header-label">进度</span>
      </div>
      <div class="header-dates">
        <div
          v-for="(date, index) in dates"
          :key="index"
          class="date-cell"
          :class="{
            'date-cell--today': isToday(date),
            'date-cell--weekend': isWeekend(date)
          }"
          :style="{ width: `${cellWidth}px` }"
        >
          <!-- TODAY 标签 -->
          <span v-if="isToday(date)" class="today-badge">TODAY</span>
          <span class="date-label">{{ formatDateLabel(date) }}</span>
          <span class="day-label">{{ getDayOfWeek(date) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-timeline {
  background: #1e2735;
}

.timeline-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #3a4553;
}

.nav-left {
  width: 240px;
  min-width: 240px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
}

.nav-right :deep(.el-button) {
  color: #c0c4cc;
}

.nav-right :deep(.el-button:hover) {
  color: #409eff;
}

.nav-right :deep(.el-button--primary) {
  color: #409eff;
}

.date-range {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
  padding: 0 12px;
}

.timeline-header {
  display: flex;
  border-bottom: 1px solid #3a4553;
}

.header-left {
  width: 240px;
  min-width: 240px;
  padding: 12px 16px;
  border-right: 1px solid #3a4553;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header-label {
  font-size: 13px;
  font-weight: 600;
  color: #a0a4a8;
}

.header-dates {
  display: flex;
  overflow-x: auto;
  flex: 1;
  position: relative;
  overflow-y: visible;
}

.date-cell {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  border-right: 1px solid #3a4553;
  position: relative;
  overflow: visible;
}

.date-cell--today {
  background: rgba(245, 108, 108, 0.15);
}

.date-cell--today .date-label,
.date-cell--today .day-label {
  color: #f56c6c;
}

.today-badge {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: #f56c6c;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  z-index: 10;
}

.date-cell--weekend {
  background: rgba(144, 147, 153, 0.1);
}

.date-label {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
}

.day-label {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

/* Hide scrollbar but allow scrolling */
.header-dates::-webkit-scrollbar {
  height: 0;
}
</style>
