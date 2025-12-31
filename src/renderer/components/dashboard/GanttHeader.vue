<script setup lang="ts">
/**
 * GanttHeader - 甘特图头部
 * 显示 Phase 名称列
 */

interface Props {
  cellWidth?: number
}

withDefaults(defineProps<Props>(), {
  cellWidth: 60
})

const phases = [
  { id: 1, name: 'Kickoff', shortName: 'Kick' },
  { id: 2, name: 'Spec', shortName: 'Spec' },
  { id: 3, name: 'Demo', shortName: 'Demo' },
  { id: 4, name: 'Design', shortName: 'Dsgn' },
  { id: 5, name: 'Code', shortName: 'Code' },
  { id: 6, name: 'Test', shortName: 'Test' },
  { id: 7, name: 'Deploy', shortName: 'Dply' }
]
</script>

<template>
  <div class="gantt-header">
    <div class="gantt-header__info">
      <span class="header-label">功能模块</span>
    </div>
    <div class="gantt-header__phases">
      <div
        v-for="phase in phases"
        :key="phase.id"
        class="phase-column"
        :style="{ width: `${cellWidth}px` }"
      >
        <el-tooltip :content="phase.name" placement="top">
          <span class="phase-label">{{ phase.shortName }}</span>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-header {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-bottom: 2px solid #dcdfe6;
  position: sticky;
  top: 0;
  z-index: 10;
}

.gantt-header__info {
  width: 240px;
  min-width: 240px;
  padding: 12px 16px;
  border-right: 1px solid #dcdfe6;
}

.header-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.gantt-header__phases {
  display: flex;
  gap: 4px;
  padding: 12px 12px;
  flex: 1;
  overflow-x: auto;
}

.phase-column {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.phase-label {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  cursor: default;
}

/* Hide scrollbar but allow scrolling */
.gantt-header__phases::-webkit-scrollbar {
  height: 0;
}
</style>
