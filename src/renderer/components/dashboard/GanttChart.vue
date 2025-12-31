<script setup lang="ts">
/**
 * GanttChart - 甘特图组件
 * 以甘特图形式展示所有 Features 的 Phase 进度
 *
 * 滚动机制：
 * - 使用单一滚动容器，支持横向和纵向滚动
 * - 左侧列使用 CSS sticky 定位，始终可见
 * - 时间轴宽度始终超过视口，确保可滚动
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { FeatureInfo, PhaseStatus } from '../../types/dashboard.types'
import GanttToolbar from './GanttToolbar.vue'

type TimeScale = 'day' | 'week' | 'month'

interface Props {
  features: FeatureInfo[]
  cellWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  cellWidth: 60
})

const emit = defineEmits<{
  (e: 'feature-click', featureId: string): void
  (e: 'phase-click', featureId: string, phaseId: number): void
  (e: 'view-progress', featureId: string): void
}>()

// 工具栏状态
const showArchived = ref(false)
const timeScale = ref<TimeScale>('day')

// 容器 ref
const scrollWrapperRef = ref<HTMLElement | null>(null)
const containerWidth = ref(1200)

// 监听容器宽度变化
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (scrollWrapperRef.value) {
    containerWidth.value = scrollWrapperRef.value.clientWidth
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(scrollWrapperRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// 时间轴起始日期 - 从所有 features 的最早日期开始
const timelineStartDate = computed(() => {
  let earliest = new Date()
  earliest.setDate(earliest.getDate() - 7) // 默认从7天前开始

  // 查找所有 phases 的最早日期
  for (const feature of props.features) {
    for (const phase of (feature.phases || [])) {
      if (phase.startDate) {
        const d = new Date(phase.startDate)
        if (!isNaN(d.getTime()) && d < earliest) {
          earliest = d
        }
      }
    }
  }

  // 再往前推3天作为缓冲
  const result = new Date(earliest)
  result.setDate(result.getDate() - 3)
  result.setHours(0, 0, 0, 0)
  return result
})

// 时间轴结束日期 - 确保覆盖所有 phases + 未来7天
const timelineEndDate = computed(() => {
  let latest = new Date()
  latest.setDate(latest.getDate() + 7) // 默认到未来7天

  // 查找所有 phases 的最晚日期
  for (const feature of props.features) {
    for (const phase of (feature.phases || [])) {
      if (phase.endDate) {
        const d = new Date(phase.endDate)
        if (!isNaN(d.getTime()) && d > latest) {
          latest = d
        }
      }
    }
  }

  // 再往后推7天作为缓冲
  const result = new Date(latest)
  result.setDate(result.getDate() + 7)
  result.setHours(0, 0, 0, 0)
  return result
})

// 根据容器宽度和时间刻度计算显示的天数
const daysToShow = computed(() => {
  // 左侧固定列宽度
  const fixedWidth = 240
  // 可用于时间轴的宽度
  const availableWidth = containerWidth.value - fixedWidth

  // 根据时间刻度计算每天需要的宽度
  const cellW = props.cellWidth

  // 基于数据范围计算需要的天数
  const dataRangeDays = Math.ceil(
    (timelineEndDate.value.getTime() - timelineStartDate.value.getTime()) / (24 * 60 * 60 * 1000)
  )

  // 至少显示足够覆盖数据范围的天数，并且至少比视口多一些确保可滚动
  const minDaysForScroll = Math.ceil(availableWidth / cellW) + 10

  return Math.max(dataRangeDays, minDaysForScroll, 30)
})

// 手动设置的起始日期偏移
const startDateOffset = ref(0)

// 实际使用的起始日期
const startDate = computed(() => {
  const d = new Date(timelineStartDate.value)
  d.setDate(d.getDate() + startDateOffset.value)
  return d
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
  const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${formatDate(startDate.value)} ~ ${formatDate(endDate.value)}`
})

// 今天是否在可视范围内
const todayInRange = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today >= startDate.value && today <= endDate.value
})

// TODAY 线位置
const todayLineOffset = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneDay = 24 * 60 * 60 * 1000
  const days = Math.round((today.getTime() - startDate.value.getTime()) / oneDay)
  return days * props.cellWidth + props.cellWidth / 2
})

// 导航方法
function goEarlier() {
  startDateOffset.value -= 7
}

function goLater() {
  startDateOffset.value += 7
}

function goToday() {
  // 计算今天相对于 timelineStartDate 的偏移
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - timelineStartDate.value.getTime()) / (24 * 60 * 60 * 1000))
  startDateOffset.value = Math.max(0, diff - 7) // 今天显示在左边一周位置
}

function resetTimeline() {
  startDateOffset.value = 0
}

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

// 展开/折叠状态
const expandedFeatures = ref<Set<string>>(new Set())

// 初始化时展开所有
watch(() => props.features, (newFeatures) => {
  newFeatures.forEach(f => expandedFeatures.value.add(f.id))
}, { immediate: true })

const isExpanded = (featureId: string): boolean => {
  return expandedFeatures.value.has(featureId)
}

const toggleExpand = (featureId: string) => {
  if (expandedFeatures.value.has(featureId)) {
    expandedFeatures.value.delete(featureId)
  } else {
    expandedFeatures.value.add(featureId)
  }
}

// 过滤后的 features
const filteredFeatures = computed(() => {
  if (showArchived.value) {
    return props.features
  }
  return props.features.filter(f => !(f.status === 'done' && f.progress === 100))
})

// 统计信息
const stats = computed(() => {
  const total = props.features.length
  const wip = props.features.filter(f => f.status === 'wip').length
  const done = props.features.filter(f => f.status === 'done').length
  const blocked = props.features.filter(f => f.status === 'blocked').length
  return { total, wip, done, blocked }
})

// 检查是否有进度记录
function hasProgress(feature: FeatureInfo): boolean {
  return feature.phases?.some(p => p.status !== 'pending') || false
}

// 状态 Tag 类型
function getStatusTagType(status: string): string {
  switch (status) {
    case 'wip': return 'primary'
    case 'done': return 'success'
    case 'blocked': return 'danger'
    default: return 'info'
  }
}

// 获取状态对应的颜色
function getStatusColor(status: string): string {
  switch (status) {
    case 'done': return '#3ecf8e'
    case 'wip': return '#409eff'
    case 'blocked': return '#f56c6c'
    default: return '#909399'
  }
}

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

// 计算 Phase 条的样式
function getPhaseStyle(phase: PhaseStatus) {
  const phaseStart = parseDate(phase.startDate)
  const phaseEnd = parseDate(phase.endDate)

  // 最小显示宽度（2天）
  const minDuration = 2

  if (!phaseStart && !phaseEnd) {
    // 如果没有日期信息，返回默认样式（按 phaseId 排列）
    return {
      left: `${(phase.phaseId - 1) * (props.cellWidth * 2 + 8)}px`,
      width: `${props.cellWidth * minDuration}px`
    }
  }

  // 如果只有开始日期，假设持续 minDuration 天
  const effectiveStart = phaseStart || phaseEnd!
  const effectiveEnd = phaseEnd || phaseStart!

  const startOffset = daysBetween(startDate.value, effectiveStart)
  let duration = daysBetween(effectiveStart, effectiveEnd) + 1

  // 确保最小宽度
  duration = Math.max(duration, minDuration)

  return {
    left: `${startOffset * props.cellWidth}px`,
    width: `${duration * props.cellWidth - 4}px`
  }
}

// 获取 Feature 的可见 phases（过滤 pending 和 skipped）
function getVisiblePhases(feature: FeatureInfo): PhaseStatus[] {
  return (feature.phases || []).filter(p => p.status !== 'pending' && p.status !== 'skipped')
}

// 计算 phases 的行分配（处理重叠）
interface PhaseWithRow extends PhaseStatus {
  row: number
  style: { left: string; width: string }
}

function getPhasesWithRows(feature: FeatureInfo): PhaseWithRow[] {
  const phases = getVisiblePhases(feature)
  const result: PhaseWithRow[] = []
  const rows: { endDay: number }[] = []

  // 按开始日期排序
  const sortedPhases = [...phases].sort((a, b) => {
    const aStart = parseDate(a.startDate)?.getTime() || 0
    const bStart = parseDate(b.startDate)?.getTime() || 0
    return aStart - bStart
  })

  for (const phase of sortedPhases) {
    const phaseStart = parseDate(phase.startDate)
    const phaseEnd = parseDate(phase.endDate)

    const startDay = phaseStart
      ? daysBetween(startDate.value, phaseStart)
      : (phase.phaseId - 1) * 3

    // 确保最小 2 天宽度
    let duration = phaseEnd && phaseStart
      ? Math.max(daysBetween(phaseStart, phaseEnd) + 1, 2)
      : 2
    const endDay = startDay + duration

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
}

// 计算 Feature 行需要多少行来显示 phases
function getRowCount(feature: FeatureInfo): number {
  const phasesWithRows = getPhasesWithRows(feature)
  if (phasesWithRows.length === 0) return 1
  return Math.max(...phasesWithRows.map(p => p.row)) + 1
}

// Feature 行高度
function getFeatureRowHeight(feature: FeatureInfo): number {
  const rowCount = getRowCount(feature)
  return Math.max(rowCount * 36 + 16, 56) // 每行 36px + 上下 padding
}

// 时间轴总宽度
const timelineWidth = computed(() => daysToShow.value * props.cellWidth)

// 左侧固定列宽度
const fixedColumnWidth = 240
</script>

<template>
  <div class="gantt-chart">
    <!-- 工具栏 -->
    <GanttToolbar
      v-model:show-archived="showArchived"
      v-model:time-scale="timeScale"
    />

    <!-- 时间轴导航 -->
    <div class="timeline-nav">
      <div class="nav-left">
        <!-- 占位 -->
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
        <el-button text size="small" @click="resetTimeline">
          重置
        </el-button>
        <el-button text size="small" @click="goLater">
          更晚
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 甘特图主体 - 单一滚动容器 -->
    <div class="gantt-scroll-wrapper" ref="scrollWrapperRef">
      <div class="gantt-content" :style="{ minWidth: `${fixedColumnWidth + timelineWidth}px` }">
        <!-- TODAY 线 -->
        <div
          v-if="todayInRange"
          class="today-line"
          :style="{ left: `${fixedColumnWidth + todayLineOffset}px` }"
        />

        <!-- 表头行 -->
        <div class="gantt-header-row">
          <!-- 左侧固定表头 -->
          <div class="fixed-header" :style="{ width: `${fixedColumnWidth}px` }">
            <span class="header-label">功能模块</span>
          </div>
          <!-- 时间轴表头 -->
          <div class="timeline-header" :style="{ width: `${timelineWidth}px` }">
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
              <span v-if="isToday(date)" class="today-badge">TODAY</span>
              <span class="date-label">{{ formatDateLabel(date) }}</span>
              <span class="day-label">{{ getDayOfWeek(date) }}</span>
            </div>
          </div>
        </div>

        <!-- 数据行 -->
        <div
          v-for="feature in filteredFeatures"
          :key="feature.id"
          class="gantt-row"
          :style="{ height: `${getFeatureRowHeight(feature)}px` }"
        >
          <!-- 左侧固定信息 -->
          <div
            class="feature-info"
            :class="`feature-info--${feature.status}`"
            :style="{ width: `${fixedColumnWidth}px` }"
          >
            <button class="expand-btn" @click="toggleExpand(feature.id)">
              <el-icon>
                <ArrowRight v-if="!isExpanded(feature.id)" />
                <ArrowDown v-else />
              </el-icon>
            </button>
            <div class="feature-details" @click="emit('feature-click', feature.id)">
              <div class="feature-name">{{ feature.name }}</div>
              <div class="feature-meta">
                <el-tag :type="getStatusTagType(feature.status)" size="small" effect="plain">
                  Phase {{ feature.currentPhase }}
                </el-tag>
                <span class="feature-progress">{{ feature.progress }}%</span>
              </div>
            </div>
            <el-tooltip content="查看进度文件" placement="top">
              <button
                class="progress-btn"
                :class="{ 'progress-btn--active': hasProgress(feature) }"
                @click="emit('view-progress', feature.id)"
              >
                <el-icon><Document /></el-icon>
              </button>
            </el-tooltip>
          </div>

          <!-- 右侧时间轴 -->
          <div class="feature-timeline" :style="{ width: `${timelineWidth}px` }">
            <!-- 背景格子 -->
            <div class="timeline-grid">
              <div
                v-for="(date, i) in dates"
                :key="i"
                class="timeline-cell"
                :class="{
                  'timeline-cell--weekend': isWeekend(date)
                }"
                :style="{ width: `${cellWidth}px` }"
              />
            </div>

            <!-- Phase 条 -->
            <div class="phases-container">
              <div
                v-for="phase in getPhasesWithRows(feature)"
                :key="phase.phaseId"
                class="phase-bar"
                :style="{
                  ...phase.style,
                  top: `${phase.row * 36 + 8}px`,
                  backgroundColor: getStatusColor(phase.status)
                }"
                :title="`${phase.phaseName}: ${phase.startDate || '?'} ~ ${phase.endDate || '?'}`"
                @click="emit('phase-click', feature.id, phase.phaseId)"
              >
                <span class="phase-label">{{ phase.phaseName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredFeatures.length === 0" class="gantt-empty">
          <el-empty description="暂无功能模块">
            <template #image>
              <el-icon :size="64" color="#606266"><Document /></el-icon>
            </template>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- 底部统计栏 -->
    <div class="gantt-footer">
      <div class="stat-item">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">总计</span>
      </div>
      <div class="stat-item stat-item--wip">
        <span class="stat-value">{{ stats.wip }}</span>
        <span class="stat-label">进行中</span>
      </div>
      <div class="stat-item stat-item--done">
        <span class="stat-value">{{ stats.done }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat-item stat-item--blocked">
        <span class="stat-value">{{ stats.blocked }}</span>
        <span class="stat-label">阻塞</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e2735;
  border-radius: 8px;
  overflow: hidden;
}

/* 时间轴导航 */
.timeline-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #3a4553;
  background: #1e2735;
  flex-shrink: 0;
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

/* 甘特图滚动容器 - 关键：单一滚动容器 */
.gantt-scroll-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* 甘特图内容 */
.gantt-content {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* TODAY 线 */
.today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f56c6c;
  z-index: 100;
  pointer-events: none;
}

/* 表头行 */
.gantt-header-row {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 50;
  background: #1e2735;
  border-bottom: 1px solid #3a4553;
}

/* 左侧固定表头 */
.fixed-header {
  position: sticky;
  left: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  height: 52px;
  background: #1e2735;
  border-right: 2px solid #3a4553;
  flex-shrink: 0;
}

.header-label {
  font-size: 13px;
  font-weight: 600;
  color: #a0a4a8;
}

/* 时间轴表头 */
.timeline-header {
  display: flex;
  flex-shrink: 0;
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
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  background: #f56c6c;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
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

/* 数据行 */
.gantt-row {
  display: flex;
  border-bottom: 1px solid #3a4553;
}

/* 左侧固定信息 */
.feature-info {
  position: sticky;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #252d3a;
  border-right: 2px solid #3a4553;
  flex-shrink: 0;
}

.feature-info--blocked {
  background: rgba(245, 108, 108, 0.15);
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
  flex-shrink: 0;
}

.expand-btn:hover {
  background: #3a4553;
  color: #c0c4cc;
}

.feature-details {
  flex: 1;
  min-width: 0;
  cursor: pointer;
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

/* 右侧时间轴 */
.feature-timeline {
  position: relative;
  flex-shrink: 0;
  background: #252d3a;
}

.gantt-row:hover .feature-timeline {
  background: #2d3748;
}

.gantt-row:hover .feature-info {
  background: #2d3748;
}

.gantt-row:hover .feature-info--blocked {
  background: rgba(245, 108, 108, 0.2);
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

.timeline-cell--weekend {
  background: rgba(144, 147, 153, 0.05);
}

.phases-container {
  position: relative;
  height: 100%;
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
  min-width: 60px;
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

/* 空状态 */
.gantt-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #252d3a;
}

/* 底部统计栏 */
.gantt-footer {
  display: flex;
  gap: 24px;
  padding: 12px 20px;
  background: #252d3a;
  border-top: 1px solid #3a4553;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #e0e0e0;
}

.stat-label {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.stat-item--wip .stat-value {
  color: #409eff;
}

.stat-item--done .stat-value {
  color: #67c23a;
}

.stat-item--blocked .stat-value {
  color: #f56c6c;
}

/* Scrollbar styling */
.gantt-scroll-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.gantt-scroll-wrapper::-webkit-scrollbar-track {
  background: #1e2735;
}

.gantt-scroll-wrapper::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 4px;
}

.gantt-scroll-wrapper::-webkit-scrollbar-thumb:hover {
  background: #606266;
}

.gantt-scroll-wrapper::-webkit-scrollbar-corner {
  background: #1e2735;
}
</style>
