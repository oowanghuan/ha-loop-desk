<script setup lang="ts">
/**
 * ConflictDialog - Schema Discovery 冲突展示对话框
 *
 * 只读展示多实例冲突情况：
 * - 哪些文件类型有冲突
 * - 每个类型的所有实例
 * - 哪个被选为主文件及原因
 */

import { computed } from 'vue'
import {
  ElDialog,
  ElTable,
  ElTableColumn,
  ElTag,
  ElEmpty,
  ElScrollbar
} from 'element-plus'

export interface ConflictInfo {
  fileType: string
  instances: Array<{
    path: string
    isPrimary: boolean
    selectionReason?: string
  }>
}

const props = defineProps<{
  /** 对话框是否显示 */
  visible: boolean
  /** Feature 名称 */
  featureName: string
  /** 冲突列表 */
  conflicts: ConflictInfo[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

// 格式化文件类型名称
function formatFileType(fileType: string): string {
  const names: Record<string, string> = {
    'progress-log': 'Progress Log',
    'context': 'Context',
    'design': 'Design',
    'test-plan': 'Test Plan',
    'phase-gate-status': 'Phase Gate Status'
  }
  return names[fileType] || fileType
}

// 格式化选择原因
function formatReason(reason?: string): string {
  if (!reason) return '-'

  const reasonMap: Record<string, string> = {
    'explicit_primary': '显式标记为主文件',
    'active_status': '状态为活跃',
    'latest_modified': '最近修改',
    'shallowest_path': '路径最浅',
    'alphabetically_first': '字母序优先'
  }

  // 尝试从 reasonText 中提取关键信息
  for (const [key, value] of Object.entries(reasonMap)) {
    if (reason.includes(key) || reason.toLowerCase().includes(value.toLowerCase())) {
      return value
    }
  }

  return reason
}

// 截断路径显示
function truncatePath(path: string): string {
  if (path.length <= 50) return path
  return '...' + path.slice(-47)
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`${featureName} - 文件冲突详情`"
    width="700px"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
  >
    <div class="conflict-dialog">
      <p class="conflict-dialog__hint">
        以下文件类型存在多个实例，系统已自动选择主文件（高亮显示）
      </p>

      <el-empty
        v-if="conflicts.length === 0"
        description="没有文件冲突"
      />

      <el-scrollbar v-else max-height="400px">
        <div
          v-for="conflict in conflicts"
          :key="conflict.fileType"
          class="conflict-section"
        >
          <h4 class="conflict-section__title">
            {{ formatFileType(conflict.fileType) }}
            <el-tag size="small" type="info">
              {{ conflict.instances.length }} 个实例
            </el-tag>
          </h4>

          <el-table
            :data="conflict.instances"
            size="small"
            :row-class-name="({ row }) => row.isPrimary ? 'primary-row' : ''"
          >
            <el-table-column label="文件路径" min-width="300">
              <template #default="{ row }">
                <div class="path-cell">
                  <el-tag v-if="row.isPrimary" size="small" type="success" class="primary-tag">
                    主文件
                  </el-tag>
                  <span :title="row.path">{{ truncatePath(row.path) }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="选择原因" width="150">
              <template #default="{ row }">
                <span v-if="row.isPrimary" class="reason-text">
                  {{ formatReason(row.selectionReason) }}
                </span>
                <span v-else class="reason-text--muted">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-scrollbar>

      <div class="conflict-dialog__footer">
        <p class="conflict-dialog__note">
          提示：主文件选择基于 5 级优先级链：显式标记 → 活跃状态 → 最近修改 → 路径深度 → 字母序
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.conflict-dialog {
  padding: 0 4px;
}

.conflict-dialog__hint {
  margin: 0 0 16px 0;
  padding: 8px 12px;
  background: #f4f4f5;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}

.conflict-section {
  margin-bottom: 20px;
}

.conflict-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.path-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}

.primary-tag {
  flex-shrink: 0;
}

.reason-text {
  font-size: 12px;
  color: #67c23a;
}

.reason-text--muted {
  font-size: 12px;
  color: #c0c4cc;
}

.conflict-dialog__footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.conflict-dialog__note {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

/* 表格行高亮 */
:deep(.primary-row) {
  background-color: #f0f9eb !important;
}

:deep(.primary-row:hover > td) {
  background-color: #e1f3d8 !important;
}
</style>
