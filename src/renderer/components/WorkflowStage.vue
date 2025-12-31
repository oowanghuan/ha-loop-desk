<script setup lang="ts">
/**
 * WorkflowStage 组件
 * 表示执行流程中的一个阶段（每日开始/执行流程/每日结束）
 */
import { computed } from 'vue'

export type StageStatus = 'completed' | 'active' | 'pending'

const props = defineProps<{
  /** 阶段编号 (1, 2, 3) */
  number: number
  /** 阶段标题 */
  title: string
  /** 阶段描述 */
  subtitle?: string
  /** 阶段状态 */
  status: StageStatus
  /** 状态文本（如 "已完成", "进行中 2/5"） */
  statusText?: string
  /** 是否可展开 */
  expandable?: boolean
}>()

const emit = defineEmits<{
  (e: 'execute'): void
}>()

// 计算样式类
const stageClass = computed(() => {
  return {
    'workflow-stage': true,
    [`workflow-stage--${props.status}`]: true,
  }
})

const numberClass = computed(() => {
  return {
    'stage-number': true,
    [`stage-number--${props.status}`]: true,
  }
})

const headerClass = computed(() => {
  return {
    'stage-header': true,
    [`stage-header--${props.status}`]: true,
  }
})

// 状态显示
const displayStatusText = computed(() => {
  if (props.statusText) return props.statusText
  switch (props.status) {
    case 'completed': return '✓ 已完成'
    case 'active': return '进行中'
    case 'pending': return '待执行'
  }
})

// 按钮配置
const buttonConfig = computed(() => {
  switch (props.status) {
    case 'completed':
      return { text: '已执行', disabled: true, type: 'secondary' }
    case 'active':
      return { text: '执行中', disabled: true, type: 'primary' }
    case 'pending':
      return { text: '执行', disabled: false, type: 'secondary' }
  }
})
</script>

<template>
  <div :class="stageClass">
    <div :class="headerClass">
      <!-- 编号 -->
      <div :class="numberClass">{{ number }}</div>

      <!-- 标题信息 -->
      <div class="stage-info">
        <div class="stage-title">{{ title }}</div>
        <div v-if="subtitle" class="stage-subtitle">{{ subtitle }}</div>
      </div>

      <!-- 状态和操作 -->
      <div class="stage-actions">
        <span :class="['stage-status', `stage-status--${status}`]">
          {{ displayStatusText }}
        </span>
        <el-button
          v-if="!expandable"
          size="small"
          :type="buttonConfig.type === 'primary' ? 'primary' : 'default'"
          :disabled="buttonConfig.disabled"
          @click="emit('execute')"
        >
          {{ buttonConfig.text }}
        </el-button>
      </div>
    </div>

    <!-- 展开内容 (始终展示) -->
    <div v-if="expandable" class="stage-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.workflow-stage {
  margin-bottom: 12px;
}

.workflow-stage:last-child {
  margin-bottom: 0;
}

/* 阶段头部 */
.stage-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 12px;
  transition: all 0.2s;
}

.stage-header--completed {
  background: #161b22;
  border-color: #3fb950;
}

.stage-header--active {
  background: rgba(88, 166, 255, 0.08);
  border-color: #58a6ff;
}

.stage-header--pending {
  background: #161b22;
  border-color: #30363d;
}

/* 编号 */
.stage-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.stage-number--completed {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
  border: 1px solid #3fb950;
}

.stage-number--active {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
  border: 1px solid #58a6ff;
}

.stage-number--pending {
  background: #21262d;
  border: 1px solid #30363d;
  color: #8b949e;
}

/* 标题信息 */
.stage-info {
  flex: 1;
  min-width: 0;
}

.stage-title {
  font-size: 14px;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 2px;
}

.stage-subtitle {
  font-size: 12px;
  color: #8b949e;
}

/* 状态和操作 */
.stage-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.stage-status {
  font-size: 12px;
  white-space: nowrap;
}

.stage-status--completed {
  color: #3fb950;
}

.stage-status--active {
  color: #58a6ff;
}

.stage-status--pending {
  color: #6e7681;
}

/* 展开内容 */
.stage-content {
  margin-top: -1px;
  margin-left: 16px;
  padding: 16px 16px 16px 32px;
  background: transparent;
  border-left: 2px solid var(--border-color, #30363d);
  border-radius: 0;
}

.workflow-stage--completed .stage-content {
  border-left-color: rgba(63, 185, 80, 0.4);
}

.workflow-stage--active .stage-content {
  border-left-color: rgba(88, 166, 255, 0.5);
}
</style>
