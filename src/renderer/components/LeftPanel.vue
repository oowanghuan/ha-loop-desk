<script setup lang="ts">
/**
 * LeftPanel - 左侧上下文面板
 * 使用可折叠分组显示 Phase 配置信息
 */
import { computed } from 'vue'
import { useConfigLoader } from '../composables/useConfigLoader'
import { useProjectStore } from '../stores/project.store'
import CollapsibleSection from './CollapsibleSection.vue'
import type { Phase } from '../types'
import type { DiscoveredFileInfo, ScannedTemplate } from '../../shared/types/ipc.types'

const props = defineProps<{
  phase: Phase
  featureId?: string
  /** Schema Discovery 发现的文件列表 */
  discoveredFiles?: DiscoveredFileInfo[]
}>()

const emit = defineEmits<{
  (e: 'preview', path: string): void
  (e: 'previewGitHub', path: string): void
  (e: 'viewUsage', command: string): void
}>()

// 从 phase id 获取 phaseId
const phaseIdMap: Record<string, number> = {
  'foundation': 0,
  'kickoff': 1,
  'spec': 2,
  'demo': 3,
  'design': 4,
  'code': 5,
  'test': 6,
  'deploy': 7
}

const phaseId = computed(() => phaseIdMap[props.phase?.id] ?? 1)

// Project Store (for scanned templates)
const projectStore = useProjectStore()

// 使用 ConfigLoader
const {
  loading,
  error,
  objectives,
  inputs,
  references: configReferences,
  tools,
  hasExpertReview,
  refresh
} = useConfigLoader(
  () => phaseId.value,
  () => props.featureId
)

// 优先使用扫描的模板，如果没有则 fallback 到 configLoader 的配置
const references = computed(() => {
  const scannedTemplates = projectStore.getTemplatesForPhase(phaseId.value)

  if (scannedTemplates.length > 0) {
    // 使用扫描到的模板
    return scannedTemplates.map((t: ScannedTemplate) => ({
      name: t.name,
      path: t.path,
      description: t.description,
      isLocal: t.isLocal
    }))
  }

  // Fallback 到配置的引用
  return configReferences.value
})

// 上游输入（带状态）
const inputsWithStatus = computed(() => {
  return inputs.value.map(input => ({
    ...input,
    status: 'verified' // TODO: 从实际数据获取状态
  }))
})

// 处理预览（本地文件）
const handlePreview = (path: string) => {
  emit('preview', path)
}

// 处理 GitHub 预览
const handleGitHubPreview = (path: string) => {
  emit('previewGitHub', path)
}

// 处理 Input 预览 - 尝试多个路径
const handleInputPreview = async (paths: string[]) => {
  if (!paths || paths.length === 0) return

  // 逐个尝试路径，找到第一个存在的
  for (const path of paths) {
    emit('previewGitHub', path)
    break // 目前先简单处理，后续可以加 fallback 检测
  }
}

// 处理参考文档预览（支持本地和 GitHub）
const handleReferencePreview = (ref: { path: string; isLocal?: boolean }) => {
  if (ref.isLocal) {
    // 本地文件预览
    emit('preview', ref.path)
  } else {
    // GitHub 预览
    emit('previewGitHub', ref.path)
  }
}

// 处理查看使用说明
const handleViewUsage = (tool: typeof tools.value[0]) => {
  if (tool.usage_doc) {
    emit('previewGitHub', tool.usage_doc)
  } else {
    emit('viewUsage', tool.command)
  }
}

// 处理查看源码
const handleViewSource = (tool: typeof tools.value[0]) => {
  if (tool.source_path) {
    emit('preview', tool.source_path)
  }
}

// 获取 owner 标签样式
const getOwnerTag = (owner: string) => {
  switch (owner) {
    case 'cc':
      return { label: 'CC', type: 'success' }
    case 'human':
      return { label: '人工', type: 'warning' }
    case 'hybrid':
    default:
      return { label: '协作', type: 'info' }
  }
}
</script>

<template>
  <div class="left-panel">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载配置中...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <el-icon color="#ef4444"><WarningFilled /></el-icon>
      <span>{{ error }}</span>
      <el-button size="small" @click="refresh">重试</el-button>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- 工作区 (已发现文档) - 默认展开 -->
      <CollapsibleSection
        v-if="discoveredFiles && discoveredFiles.length > 0"
        id="workspace"
        title="工作区"
        :badge="discoveredFiles.length"
        badge-type="info"
        :default-expanded="true"
      >
        <div class="discovered-list">
          <div
            v-for="file in discoveredFiles"
            :key="file.path"
            class="discovered-item"
          >
            <div class="item-main">
              <el-tag size="small" type="info">{{ file.fileType }}</el-tag>
              <span class="item-name">{{ file.displayName }}</span>
            </div>
            <el-button
              size="small"
              text
              type="primary"
              @click="handlePreview(file.path)"
            >
              查看
            </el-button>
          </div>
        </div>
      </CollapsibleSection>

      <!-- 本阶段目标 - 默认展开 -->
      <CollapsibleSection
        id="objectives"
        title="本阶段目标"
        :badge="objectives.length || undefined"
        badge-type="success"
        :default-expanded="true"
      >
        <ul v-if="objectives.length > 0" class="goal-list">
          <li v-for="(goal, index) in objectives" :key="index">
            {{ goal }}
          </li>
        </ul>
        <div v-else class="empty-hint">
          暂无目标配置
        </div>
      </CollapsibleSection>

      <!-- 上游输入 - 默认折叠 -->
      <CollapsibleSection
        v-if="inputsWithStatus.length > 0"
        id="inputs"
        title="上游输入"
        :badge="inputsWithStatus.length"
        badge-type="success"
        :default-expanded="false"
      >
        <div class="input-list">
          <div
            v-for="input in inputsWithStatus"
            :key="input.name"
            class="input-item"
          >
            <div class="item-main">
              <el-icon :color="input.status === 'verified' ? '#67c23a' : '#909399'">
                <CircleCheckFilled />
              </el-icon>
              <span class="item-name">{{ input.name }}</span>
              <span class="item-desc">{{ input.description }}</span>
            </div>
            <el-button
              v-if="input.paths && input.paths.length > 0"
              size="small"
              text
              type="primary"
              @click="handleInputPreview(input.paths)"
            >
              查看
            </el-button>
          </div>
        </div>
      </CollapsibleSection>

      <!-- 参考文档 - 默认折叠 -->
      <CollapsibleSection
        v-if="references.length > 0"
        id="references"
        title="参考文档"
        :badge="references.length"
        badge-type="info"
        :default-expanded="false"
      >
        <div class="reference-list">
          <div
            v-for="ref in references"
            :key="ref.name"
            class="reference-item"
          >
            <div class="item-main">
              <span class="item-name mono">{{ ref.name }}</span>
              <span class="item-desc">{{ ref.description }}</span>
            </div>
            <el-button
              size="small"
              text
              type="primary"
              @click="handleReferencePreview(ref)"
            >
              查看
            </el-button>
          </div>
        </div>
      </CollapsibleSection>

      <!-- 可用工具 - 默认展开 -->
      <CollapsibleSection
        v-if="tools.length > 0"
        id="tools"
        title="可用工具"
        :badge="tools.length"
        badge-type="warning"
        :default-expanded="true"
      >
        <div class="tool-list">
          <div
            v-for="tool in tools"
            :key="tool.command"
            class="tool-item"
          >
            <div class="tool-header">
              <code class="tool-command">{{ tool.command }}</code>
              <div class="tool-badges">
                <el-tag size="small" type="info">{{ tool.type }}</el-tag>
                <el-tag size="small" type="warning">{{ tool.priority }}</el-tag>
                <el-tag
                  size="small"
                  :type="getOwnerTag(tool.owner).type as any"
                >
                  {{ getOwnerTag(tool.owner).label }}
                </el-tag>
                <el-tag
                  v-if="tool.status === 'implemented'"
                  size="small"
                  type="success"
                >
                  已实现
                </el-tag>
                <el-tag
                  v-else
                  size="small"
                  type="info"
                >
                  计划中
                </el-tag>
              </div>
            </div>
            <div class="tool-desc">{{ tool.description }}</div>
            <div class="tool-actions">
              <el-button
                v-if="tool.usage_doc"
                size="small"
                text
                type="primary"
                @click="handleViewUsage(tool)"
              >
                使用说明
              </el-button>
              <el-button
                v-if="tool.source_path"
                size="small"
                text
                type="primary"
                @click="handleViewSource(tool)"
              >
                查看源码
              </el-button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <!-- Expert Review Hint -->
      <div v-if="hasExpertReview" class="hint-section">
        <div class="hint-content">
          <el-icon color="#f59e0b"><WarningFilled /></el-icon>
          <span>本阶段需要专家评审后才能进入下一阶段</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.left-panel {
  width: var(--left-panel-width);
  background: #1a1d24;
  border-right: 1px solid #2d3748;
  padding: 16px;
  overflow-y: auto;
  height: calc(100vh - var(--header-height) - var(--phase-nav-height) - var(--status-bar-height));
  color: #e2e8f0;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #718096;
}

.error-state {
  color: #ef4444;
}

/* 目标列表 */
.goal-list {
  margin: 0;
  padding-left: 20px;
}

.goal-list li {
  font-size: 13px;
  color: #a0aec0;
  margin-bottom: 6px;
  line-height: 1.5;
}

.empty-hint {
  font-size: 13px;
  color: #718096;
  font-style: italic;
  padding: 8px 0;
}

/* 列表样式 */
.discovered-list,
.input-list,
.reference-list,
.tool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.discovered-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #21262d;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.input-item,
.reference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #21262d;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 500;
}

.item-name.mono {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #58a6ff;
}

.item-desc {
  font-size: 12px;
  color: #8b949e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 工具样式 */
.tool-item {
  padding: 12px;
  background: #21262d;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-command {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  color: #3fb950;
  background: #161b22;
  padding: 4px 8px;
  border-radius: 4px;
}

.tool-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tool-desc {
  font-size: 13px;
  color: #8b949e;
  margin-bottom: 10px;
}

.tool-actions {
  display: flex;
  gap: 8px;
}

/* Hint Section */
.hint-section {
  margin-top: 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  padding: 12px;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #f59e0b;
}

/* Override Element Plus styles for dark theme */
:deep(.el-button--small) {
  font-size: 12px;
}

:deep(.el-tag--small) {
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
}
</style>
