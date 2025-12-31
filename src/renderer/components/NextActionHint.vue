<script setup lang="ts">
/**
 * NextActionHint 组件
 * 显示建议的下一步操作提示
 */
import { computed } from 'vue'

export interface NextAction {
  /** 动作类型 */
  type: 'start-day' | 'feature' | 'expert-review' | 'check-gate' | 'approve-gate' | 'end-day' | 'custom'
  /** 提示文本 */
  text: string
  /** 按钮文本 */
  buttonText?: string
  /** 是否可执行 */
  executable?: boolean
}

const props = defineProps<{
  /** 下一步动作 */
  action?: NextAction | null
}>()

const emit = defineEmits<{
  (e: 'execute', action: NextAction): void
}>()

// 默认提示配置
const defaultHints: Record<string, { icon: string; color: string }> = {
  'start-day': { icon: '🌅', color: '#58a6ff' },
  'feature': { icon: '🚀', color: '#a371f7' },
  'expert-review': { icon: '👀', color: '#f0883e' },
  'check-gate': { icon: '🔍', color: '#f0883e' },
  'approve-gate': { icon: '✅', color: '#3fb950' },
  'end-day': { icon: '🌙', color: '#6e7681' },
  'custom': { icon: '💡', color: '#58a6ff' },
}

const hintConfig = computed(() => {
  if (!props.action) return null
  return defaultHints[props.action.type] || defaultHints['custom']
})

const handleExecute = () => {
  if (props.action && props.action.executable !== false) {
    emit('execute', props.action)
  }
}
</script>

<template>
  <div v-if="action" class="next-action-hint">
    <span v-if="hintConfig" class="hint-icon">{{ hintConfig.icon }}</span>
    <span class="hint-text">{{ action.text }}</span>
    <el-button
      v-if="action.buttonText && action.executable !== false"
      size="small"
      type="primary"
      @click="handleExecute"
    >
      {{ action.buttonText }}
    </el-button>
  </div>
</template>

<style scoped>
.next-action-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.1), rgba(163, 113, 247, 0.1));
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 10px;
  margin-bottom: 16px;
}

.hint-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.hint-text {
  flex: 1;
  font-size: 13px;
  color: #e6edf3;
}

.next-action-hint :deep(.el-button) {
  flex-shrink: 0;
}
</style>
