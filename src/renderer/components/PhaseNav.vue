<script setup lang="ts">
/**
 * PhaseNav 组件
 * Phase 导航栏 - 方案B横向紧凑设计
 */
import { computed } from 'vue'
import type { Phase } from '../types'

export interface EnhancedPhase extends Phase {
  /** 完成百分比 (0-100) */
  progress?: number
  /** Phase 描述 */
  description?: string
}

const props = defineProps<{
  phases: EnhancedPhase[]
  currentIndex: number
}>()

const emit = defineEmits<{
  (e: 'select', index: number): void
}>()

// Phase 描述（默认值）
const phaseDescriptions: Record<string, string> = {
  'kickoff': '项目启动，需求确认',
  'spec': '需求规格说明书',
  'demo': '原型 Demo 开发',
  'design': '系统设计',
  'code': '编码实现',
  'test': '测试验证',
  'deploy': '部署发布',
}

// 获取状态图标
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed': return 'CircleCheck'
    case 'current': return 'Loading'
    case 'locked': return 'Lock'
    case 'blocked': return 'CircleClose'
    case 'skipped': return 'Right'
    default: return ''
  }
}

// 获取状态文本 - 根据状态智能显示
const getStatusText = (phase: EnhancedPhase): string => {
  switch (phase.status) {
    case 'passed': return '完成'
    case 'current': return `${getPhaseProgress(phase)}%`
    case 'blocked': return '阻塞'
    default: return ''
  }
}

const getStatusClass = (status: string, index: number) => {
  const classes = ['phase-tab']
  classes.push(`phase-tab--${status}`)
  if (index === props.currentIndex) {
    classes.push('phase-tab--selected')
  }
  return classes.join(' ')
}

const handleClick = (index: number, status: string) => {
  if (status !== 'locked') {
    emit('select', index)
  }
}

// 获取 Phase 进度
const getPhaseProgress = (phase: EnhancedPhase): number => {
  if (phase.progress !== undefined) return phase.progress
  if (phase.status === 'passed') return 100
  if (!phase.steps || phase.steps.length === 0) return 0
  const completed = phase.steps.filter((s: any) => s.status === 'approved' || s.status === 'verified').length
  return Math.round((completed / phase.steps.length) * 100)
}

// 获取 Tooltip 内容
const getTooltipContent = (phase: EnhancedPhase): string => {
  const desc = phase.description || phaseDescriptions[phase.id] || phase.name
  const progress = getPhaseProgress(phase)
  return `${desc}\n进度: ${progress}%`
}
</script>

<template>
  <div class="phase-nav">
    <el-tooltip
      v-for="(phase, index) in phases"
      :key="phase.id"
      :content="getTooltipContent(phase)"
      placement="bottom"
      :show-after="500"
    >
      <div
        :class="getStatusClass(phase.status, index)"
        @click="handleClick(index, phase.status)"
      >
        <!-- 数字 -->
        <div class="phase-tab__number">{{ index + 1 }}</div>

        <!-- 信息区 -->
        <div class="phase-tab__info">
          <div class="phase-tab__name">{{ phase.name }}</div>
          <div v-if="getStatusText(phase)" class="phase-tab__status">
            {{ getStatusText(phase) }}
          </div>
        </div>

        <!-- 状态图标 -->
        <el-icon v-if="getStatusIcon(phase.status)" class="phase-tab__icon">
          <component :is="getStatusIcon(phase.status)" />
        </el-icon>
      </div>
    </el-tooltip>
  </div>
</template>

<style scoped>
.phase-nav {
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  overflow-x: auto;
  height: var(--phase-nav-height);
  align-items: center;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.phase-nav::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.phase-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 2px solid #30363d;
  background: #21262d;
  cursor: pointer;
  transition: all 0.2s;
}

.phase-tab:hover:not(.phase-tab--locked) {
  background: #30363d;
  border-color: #484f58;
}

.phase-tab__number {
  font-size: 22px;
  font-weight: 700;
  color: #e6edf3;
}

.phase-tab__info {
  display: flex;
  flex-direction: column;
}

.phase-tab__name {
  font-size: 14px;
  font-weight: 500;
  color: #e6edf3;
  line-height: 1.2;
}

.phase-tab__status {
  font-size: 12px;
  color: #6e7681;
  margin-top: 2px;
}

.phase-tab__icon {
  font-size: 18px;
  margin-left: 6px;
}

/* ========== Passed 状态 ========== */
.phase-tab--passed {
  border-color: #3fb950;
  background: rgba(63, 185, 80, 0.12);
}

.phase-tab--passed .phase-tab__icon {
  color: #3fb950;
}

.phase-tab--passed .phase-tab__status {
  color: #3fb950;
}

/* ========== Current 状态 ========== */
.phase-tab--current {
  border-color: #58a6ff;
  background: rgba(88, 166, 255, 0.15);
}

.phase-tab--current .phase-tab__number {
  color: #58a6ff;
}

.phase-tab--current .phase-tab__status {
  color: #58a6ff;
}

.phase-tab--current .phase-tab__icon {
  color: #58a6ff;
  animation: spin 1s linear infinite;
}

/* ========== Selected 状态 (白色边框突出) ========== */
.phase-tab--selected {
  border-color: #e6edf3 !important;
  box-shadow: 0 0 0 1px rgba(230, 237, 243, 0.3);
}

/* ========== Pending 状态 ========== */
.phase-tab--pending {
  border-color: #30363d;
}

/* ========== Locked 状态 ========== */
.phase-tab--locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.phase-tab--locked .phase-tab__icon {
  color: #6e7681;
}

/* ========== Blocked 状态 ========== */
.phase-tab--blocked {
  border-color: #f85149;
}

.phase-tab--blocked .phase-tab__icon {
  color: #f85149;
}

.phase-tab--blocked .phase-tab__status {
  color: #f85149;
}

/* ========== Skipped 状态 ========== */
.phase-tab--skipped {
  border-style: dashed;
  border-color: #6e7681;
}

.phase-tab--skipped .phase-tab__icon {
  color: #6e7681;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
