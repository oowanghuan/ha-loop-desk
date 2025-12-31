<script setup lang="ts">
/**
 * CollapsibleSection 组件
 * 可折叠的分组面板，支持展开/折叠状态持久化
 */
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** 分组唯一标识，用于 localStorage 持久化 */
  id: string
  /** 分组标题 */
  title: string
  /** 图标 (Element Plus icon name) */
  icon?: string
  /** 右侧徽章文本 */
  badge?: string | number
  /** 徽章类型 */
  badgeType?: 'info' | 'success' | 'warning' | 'danger'
  /** 默认是否展开 */
  defaultExpanded?: boolean
  /** 是否禁用折叠功能 */
  collapsible?: boolean
}>(), {
  defaultExpanded: true,
  collapsible: true,
  badgeType: 'info',
})

const STORAGE_KEY_PREFIX = 'coding-gui-section-'

// 展开状态
const isExpanded = ref(props.defaultExpanded)

// 从 localStorage 恢复状态
onMounted(() => {
  if (!props.collapsible) {
    isExpanded.value = true
    return
  }

  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + props.id)
  if (stored !== null) {
    isExpanded.value = stored === 'true'
  }
})

// 保存状态到 localStorage
watch(isExpanded, (value) => {
  if (props.collapsible) {
    localStorage.setItem(STORAGE_KEY_PREFIX + props.id, String(value))
  }
})

// 切换展开状态
const toggle = () => {
  if (props.collapsible) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
  <div class="collapsible-section" :class="{ 'is-collapsed': !isExpanded }">
    <!-- Header -->
    <div
      class="section-header"
      :class="{ 'is-clickable': collapsible }"
      @click="toggle"
    >
      <!-- 展开/折叠图标 -->
      <el-icon v-if="collapsible" class="expand-icon">
        <ArrowRight />
      </el-icon>

      <!-- 自定义图标 -->
      <el-icon v-if="icon" class="section-icon">
        <component :is="icon" />
      </el-icon>

      <!-- 标题 -->
      <span class="section-title">{{ title }}</span>

      <!-- 徽章 -->
      <el-tag
        v-if="badge !== undefined && badge !== ''"
        :type="badgeType"
        size="small"
        class="section-badge"
      >
        {{ badge }}
      </el-tag>
    </div>

    <!-- Content -->
    <el-collapse-transition>
      <div v-show="isExpanded" class="section-content">
        <slot></slot>
      </div>
    </el-collapse-transition>
  </div>
</template>

<style scoped>
.collapsible-section {
  margin-bottom: 16px;
}

.collapsible-section:last-child {
  margin-bottom: 0;
}

/* Header */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary, #21262d);
  border-radius: 8px;
  user-select: none;
}

.section-header.is-clickable {
  cursor: pointer;
  transition: background 0.2s;
}

.section-header.is-clickable:hover {
  background: var(--bg-hover, #30363d);
}

/* 展开图标 */
.expand-icon {
  font-size: 12px;
  color: #6e7681;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.collapsible-section:not(.is-collapsed) .expand-icon {
  transform: rotate(90deg);
}

/* Section 图标 */
.section-icon {
  font-size: 14px;
  color: #8b949e;
  flex-shrink: 0;
}

/* 标题 */
.section-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #e6edf3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 徽章 */
.section-badge {
  flex-shrink: 0;
}

/* 内容区 */
.section-content {
  padding: 12px 0 0 0;
}

/* 深色模式下的 el-tag 样式优化 */
:deep(.el-tag--small) {
  height: 18px;
  padding: 0 6px;
  font-size: 10px;
  border-radius: 9px;
}

:deep(.el-tag--info) {
  background: rgba(88, 166, 255, 0.15);
  border-color: transparent;
  color: #58a6ff;
}

:deep(.el-tag--success) {
  background: rgba(63, 185, 80, 0.15);
  border-color: transparent;
  color: #3fb950;
}

:deep(.el-tag--warning) {
  background: rgba(210, 153, 34, 0.15);
  border-color: transparent;
  color: #d29922;
}

:deep(.el-tag--danger) {
  background: rgba(248, 81, 73, 0.15);
  border-color: transparent;
  color: #f85149;
}
</style>
