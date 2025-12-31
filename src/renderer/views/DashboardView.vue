<script setup lang="ts">
/**
 * DashboardView - Dashboard 主视图
 * 显示所有 Features 的概览和甘特图
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDashboard } from '../composables/useDashboard'
import { useProjectStore } from '../stores/project.store'
import DailyStandupPanel from '../components/dashboard/DailyStandupPanel.vue'
import DashboardToolbar from '../components/dashboard/DashboardToolbar.vue'
import GanttChart from '../components/dashboard/GanttChart.vue'
import FeatureCard from '../components/dashboard/FeatureCard.vue'

const router = useRouter()
const projectStore = useProjectStore()

const {
  features,
  filteredFeatures,
  standup,
  stats,
  loading,
  error,
  warnings,
  viewMode,
  filter,
  searchQuery,
  refresh,
  clearError
} = useDashboard()

const projectName = computed(() => projectStore.currentProject?.name || 'No Project')
const hasProject = computed(() => !!projectStore.currentProject)

// 进度文件查看对话框状态
const progressDialogVisible = ref(false)
const progressFileContent = ref('')
const progressFileName = ref('')
const progressFileLoading = ref(false)

const handleFeatureClick = (featureId: string) => {
  router.push(`/workspace/${featureId}`)
}

const handlePhaseClick = (featureId: string, phaseId: number) => {
  router.push(`/workspace/${featureId}/${phaseId}`)
}

const handleRefresh = async () => {
  await refresh()
  ElMessage.success('数据已刷新')
}

const goToSettings = () => {
  router.push('/settings')
}

const goToProjects = () => {
  router.push('/projects')
}

const dismissWarnings = () => {
  // 暂时只是显示，可以后续添加清除警告的功能
}

// 查看进度文件
const handleViewProgress = async (featureId: string) => {
  if (!projectStore.currentProject) {
    ElMessage.error('请先选择项目')
    return
  }

  const filePath = `${projectStore.currentProject.path}/docs/${featureId}/90_PROGRESS_LOG.yaml`
  progressFileName.value = `${featureId}/90_PROGRESS_LOG.yaml`
  progressFileLoading.value = true
  progressDialogVisible.value = true

  try {
    const result = await window.electronAPI.invoke<{
      content: string
      path: string
      size: number
      mimeType: string
    }>('file:read', { path: filePath })
    progressFileContent.value = result.content
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    progressFileContent.value = `无法读取文件: ${errMsg}`
    ElMessage.error(`读取进度文件失败: ${errMsg}`)
  } finally {
    progressFileLoading.value = false
  }
}
</script>

<template>
  <div class="dashboard-view">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="header-logo">
          <el-icon size="24" color="#409eff"><Monitor /></el-icon>
          <span class="header-title">HA Loop Desk</span>
        </div>
        <el-dropdown @command="goToProjects">
          <el-button text>
            {{ projectName }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>{{ projectName }}</el-dropdown-item>
              <el-dropdown-item divided>选择其他项目...</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-tag type="success" size="small">Dashboard</el-tag>
      </div>
      <div class="header-right">
        <el-button text circle @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button text circle @click="goToSettings">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </header>

    <!-- 可滚动的主内容区域 -->
    <div class="dashboard-main">
      <!-- 已选择项目时显示主内容 -->
      <template v-if="hasProject">
        <!-- Loading State -->
        <div v-if="loading" class="dashboard-loading">
          <el-icon class="is-loading" :size="32"><Loading /></el-icon>
          <span>加载项目数据...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="dashboard-error">
          <el-icon :size="48" color="#f56c6c"><WarningFilled /></el-icon>
          <p class="error-message">{{ error }}</p>
          <el-button type="primary" @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            重试
          </el-button>
        </div>

        <!-- Normal Content -->
        <template v-else>
          <!-- Warnings Banner -->
          <el-alert
            v-if="warnings.length > 0"
            type="warning"
            show-icon
            closable
            class="warnings-banner"
            @close="dismissWarnings"
          >
            <template #title>
              解析警告 ({{ warnings.length }})
            </template>
            <template #default>
              <ul class="warnings-list">
                <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
              </ul>
            </template>
          </el-alert>

          <!-- Daily Standup Panel -->
          <DailyStandupPanel
            :highlights="standup.highlights"
            :blockers="standup.blockers"
            :tomorrow="standup.tomorrow"
            @refresh="handleRefresh"
            @feature-click="handleFeatureClick"
          />

          <!-- Toolbar -->
          <DashboardToolbar
            v-model:view-mode="viewMode"
            v-model:filter="filter"
            v-model:search-query="searchQuery"
            :total-count="stats.total"
            :filtered-count="filteredFeatures.length"
            @refresh="handleRefresh"
          />

          <!-- Main Content -->
          <div class="dashboard-content">
            <!-- Gantt View -->
            <GanttChart
              v-if="viewMode === 'gantt'"
              :features="filteredFeatures"
              @feature-click="handleFeatureClick"
              @phase-click="handlePhaseClick"
              @view-progress="handleViewProgress"
            />

            <!-- Card View -->
            <div v-else-if="viewMode === 'card'" class="card-grid">
              <FeatureCard
                v-for="feature in filteredFeatures"
                :key="feature.id"
                :feature="feature"
                @click="handleFeatureClick(feature.id)"
              />
              <div v-if="filteredFeatures.length === 0" class="empty-grid">
                <el-empty description="没有匹配的功能模块" />
              </div>
            </div>

            <!-- List View -->
            <div v-else-if="viewMode === 'list'" class="list-view">
              <el-table :data="filteredFeatures" stripe style="width: 100%">
                <el-table-column prop="name" label="功能名称" min-width="200">
                  <template #default="{ row }">
                    <el-link type="primary" @click="handleFeatureClick(row.id)">
                      {{ row.name }}
                    </el-link>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag
                      :type="row.status === 'done' ? 'success' : row.status === 'blocked' ? 'danger' : row.status === 'wip' ? 'primary' : 'info'"
                      size="small"
                    >
                      {{ row.status === 'wip' ? '进行中' : row.status === 'done' ? '已完成' : row.status === 'blocked' ? '阻塞' : '待开始' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="currentPhaseName" label="当前阶段" width="120" />
                <el-table-column prop="progress" label="进度" width="150">
                  <template #default="{ row }">
                    <el-progress :percentage="row.progress" :stroke-width="8" />
                  </template>
                </el-table-column>
                <el-table-column prop="lastUpdated" label="最后更新" width="180">
                  <template #default="{ row }">
                    {{ row.lastUpdated ? new Date(row.lastUpdated).toLocaleString('zh-CN') : '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" @click="handleFeatureClick(row.id)">
                      进入
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </template>
      </template>

      <!-- 未选择项目时显示空状态 -->
      <div v-else class="dashboard-empty-state">
        <el-empty :image-size="200">
          <template #image>
            <el-icon :size="120" color="#c0c4cc"><FolderOpened /></el-icon>
          </template>
          <template #description>
            <div class="empty-state-content">
              <h2 class="empty-state-title">请选择一个项目</h2>
              <p class="empty-state-desc">选择或打开一个项目以查看 Dashboard</p>
            </div>
          </template>
          <el-button type="primary" size="large" @click="goToProjects">
            <el-icon><FolderOpened /></el-icon>
            选择项目
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 进度文件查看对话框 -->
    <el-dialog
      v-model="progressDialogVisible"
      :title="progressFileName"
      width="70%"
      top="5vh"
      class="progress-dialog"
    >
      <div v-if="progressFileLoading" class="progress-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <pre v-else class="progress-content">{{ progressFileContent }}</pre>
    </el-dialog>
  </div>
</template>

<style scoped>
.dashboard-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.dashboard-header {
  flex-shrink: 0;
  height: var(--header-height, 60px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px 0 80px; /* 左侧留出 macOS 窗口控制按钮的空间 */
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  -webkit-app-region: drag;
  z-index: 100;
}

.dashboard-header * {
  -webkit-app-region: no-drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 8px;
}

.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
}

.dashboard-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #909399;
}

.dashboard-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
}

.warnings-banner {
  margin: 16px 20px 0;
}

.warnings-list {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 12px;
}

.dashboard-content {
  flex: 1;
  padding: 0 20px 20px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding-top: 16px;
}

.empty-grid {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.list-view {
  padding-top: 16px;
  background: #ffffff;
  border-radius: 8px;
}

.dashboard-empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #f5f7fa 0%, #fff 100%);
}

.empty-state-content {
  text-align: center;
}

.empty-state-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.empty-state-desc {
  font-size: 14px;
  color: #909399;
  margin: 0 0 24px 0;
}

/* 进度文件查看对话框 */
.progress-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #909399;
}

.progress-content {
  max-height: 70vh;
  overflow-y: auto;
  background: #1e2735;
  color: #e0e0e0;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
</style>
