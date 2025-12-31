<script setup lang="ts">
/**
 * DashboardToolbar - 工具栏组件
 * 提供视图切换、筛选、搜索功能
 */
import { computed } from 'vue'
import type { ViewMode, FilterMode } from '../../types/dashboard.types'

interface Props {
  viewMode: ViewMode
  filter: FilterMode
  searchQuery: string
  totalCount?: number
  filteredCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  filteredCount: 0
})

const emit = defineEmits<{
  (e: 'update:viewMode', value: ViewMode): void
  (e: 'update:filter', value: FilterMode): void
  (e: 'update:searchQuery', value: string): void
  (e: 'refresh'): void
}>()

const viewModeOptions = [
  { value: 'gantt', label: '甘特图', icon: 'Grid' },
  { value: 'card', label: '卡片', icon: 'Menu' },
  { value: 'list', label: '列表', icon: 'List' }
]

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'wip', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'blocked', label: '阻塞' }
]

const showingText = computed(() => {
  if (props.filteredCount === props.totalCount) {
    return `共 ${props.totalCount} 个功能`
  }
  return `显示 ${props.filteredCount} / ${props.totalCount} 个功能`
})
</script>

<template>
  <div class="dashboard-toolbar">
    <div class="toolbar-left">
      <!-- 视图模式切换 -->
      <el-radio-group
        :model-value="viewMode"
        size="default"
        @update:model-value="emit('update:viewMode', $event as ViewMode)"
      >
        <el-radio-button
          v-for="option in viewModeOptions"
          :key="option.value"
          :value="option.value"
        >
          <el-icon v-if="option.value === 'gantt'"><Grid /></el-icon>
          <el-icon v-else-if="option.value === 'card'"><Menu /></el-icon>
          <el-icon v-else><List /></el-icon>
          <span class="view-mode-label">{{ option.label }}</span>
        </el-radio-button>
      </el-radio-group>

      <el-divider direction="vertical" />

      <!-- 状态筛选 -->
      <el-select
        :model-value="filter"
        placeholder="筛选"
        style="width: 120px"
        @update:model-value="emit('update:filter', $event as FilterMode)"
      >
        <el-option
          v-for="option in filterOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>

    <div class="toolbar-center">
      <span class="showing-text">{{ showingText }}</span>
    </div>

    <div class="toolbar-right">
      <!-- 搜索 -->
      <el-input
        :model-value="searchQuery"
        placeholder="搜索功能..."
        prefix-icon="Search"
        clearable
        style="width: 200px"
        @update:model-value="emit('update:searchQuery', $event)"
      />

      <!-- 刷新按钮 -->
      <el-button @click="emit('refresh')">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-center {
  flex: 1;
  text-align: center;
}

.showing-text {
  color: #909399;
  font-size: 13px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-mode-label {
  margin-left: 4px;
}

:deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
