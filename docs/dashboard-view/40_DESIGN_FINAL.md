# 40_DESIGN_FINAL.md
# Dashboard View - 详细设计文档

> 版本：v1.1
> 最后更新：2024-12-30
> 状态：Approved
> 负责人：AI PE

---

## 1. 架构概述

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Renderer Process                         │
├─────────────────────────────────────────────────────────────────┤
│  Views                                                          │
│  ├── DashboardView.vue          ← 新增                          │
│  └── WorkspaceView.vue          ← 修改（增加返回按钮）           │
├─────────────────────────────────────────────────────────────────┤
│  Components (dashboard/)                                        │
│  ├── DailyStandupPanel.vue      ← 新增                          │
│  ├── DashboardToolbar.vue       ← 新增                          │
│  ├── GanttChart.vue             ← 新增                          │
│  ├── FeatureRow.vue             ← 新增                          │
│  └── FeatureCard.vue            ← 新增                          │
├─────────────────────────────────────────────────────────────────┤
│  Composables                                                    │
│  └── useDashboard.ts            ← 新增                          │
├─────────────────────────────────────────────────────────────────┤
│  Stores                                                         │
│  └── dashboard.store.ts         ← 新增                          │
└─────────────────────────────────────────────────────────────────┘
                              ↕ IPC
┌─────────────────────────────────────────────────────────────────┐
│                         Main Process                            │
├─────────────────────────────────────────────────────────────────┤
│  IPC Handlers                                                   │
│  └── dashboard.handler.ts       ← 新增                          │
├─────────────────────────────────────────────────────────────────┤
│  Services (复用现有)                                             │
│  └── schema-discovery-adapter.ts                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```
┌──────────────┐     IPC      ┌──────────────┐     FS      ┌──────────────┐
│  Dashboard   │ ──────────▶ │   Handler    │ ──────────▶ │  docs/       │
│  Store       │             │              │             │  **/90_*.yaml│
│              │ ◀────────── │  Schema      │ ◀────────── │              │
│  features[]  │   features  │  Discovery   │   parsed    │              │
└──────────────┘             └──────────────┘             └──────────────┘
       │
       ▼
┌──────────────┐
│ Dashboard    │
│ View         │
│ ├─ Standup   │
│ ├─ Toolbar   │
│ └─ Gantt     │
└──────────────┘
```

---

## 2. 组件详细设计

### 2.1 DashboardView.vue

**职责**：Dashboard 主视图容器

```vue
<template>
  <div class="dashboard-view">
    <!-- Loading State -->
    <div v-if="loading" class="dashboard-loading">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <span>加载项目数据...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="dashboard-error">
      <el-icon :size="48"><WarningFilled /></el-icon>
      <p class="error-message">{{ error }}</p>
      <el-button type="primary" @click="handleRefresh">
        <el-icon><Refresh /></el-icon>
        重试
      </el-button>
    </div>

    <!-- Normal Content -->
    <template v-else>
      <DailyStandupPanel
        :highlights="standup.highlights"
        :blockers="standup.blockers"
        :tomorrow="standup.tomorrow"
        @refresh="handleRefresh"
      />

      <DashboardToolbar
        v-model:viewMode="viewMode"
        v-model:filter="filter"
        v-model:searchQuery="searchQuery"
        @refresh="handleRefresh"
      />

      <div class="dashboard-content">
        <GanttChart
          v-if="viewMode === 'gantt'"
          :features="filteredFeatures"
          @feature-click="handleFeatureClick"
          @phase-click="handlePhaseClick"
        />

        <div v-else-if="viewMode === 'card'" class="card-grid">
          <FeatureCard
            v-for="feature in filteredFeatures"
            :key="feature.id"
            :feature="feature"
            @click="handleFeatureClick(feature.id)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboard } from '@/composables/useDashboard'
import DailyStandupPanel from '@/components/dashboard/DailyStandupPanel.vue'
import DashboardToolbar from '@/components/dashboard/DashboardToolbar.vue'
import GanttChart from '@/components/dashboard/GanttChart.vue'
import FeatureCard from '@/components/dashboard/FeatureCard.vue'

const router = useRouter()
const {
  features,
  standup,
  loading,
  error,
  viewMode,
  filter,
  searchQuery,
  refresh,
} = useDashboard()

const filteredFeatures = computed(() => {
  let result = features.value

  // 按状态筛选
  if (filter.value !== 'all') {
    result = result.filter(f => f.status === filter.value)
  }

  // 按搜索词筛选
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(f =>
      f.id.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q)
    )
  }

  return result
})

const handleFeatureClick = (featureId: string) => {
  router.push(`/workspace/${featureId}`)
}

const handlePhaseClick = (featureId: string, phaseId: number) => {
  router.push(`/workspace/${featureId}/${phaseId}`)
}

const handleRefresh = () => {
  refresh()
}
</script>
```

---

### 2.2 DailyStandupPanel.vue

**职责**：显示今日工作汇总

```typescript
// Props
interface Props {
  highlights: StandupItem[]
  blockers: BlockerItem[]
  tomorrow: PlanItem[]
}

// Emits
interface Emits {
  (e: 'refresh'): void
}

// 内部状态
const collapsed = ref(false)
```

**布局**：
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Project Agent · Daily Standup    [▼ 收起] [🔄 Refresh] │
├───────────────┬───────────────┬─────────────────────────────┤
│ ✨ 今日进展    │ ⚠️ 阻塞问题   │ 📅 明日计划                  │
│ (max 5 items) │ (红色高亮)    │ (max 3 items)              │
└───────────────┴───────────────┴─────────────────────────────┘
```

---

### 2.3 GanttChart.vue

**职责**：甘特图视图

```typescript
// Props
interface Props {
  features: GanttFeature[]
}

// Emits
interface Emits {
  (e: 'feature-click', featureId: string): void
  (e: 'phase-click', featureId: string, phaseId: number): void
}

// 内部状态
const expandedFeatures = ref<Set<string>>(new Set())
const dateRange = computed(() => calculateDateRange(props.features))
```

**子组件**：
```
GanttChart.vue
├── GanttHeader.vue       # 时间轴头部
└── FeatureRow.vue        # 单行 Feature
    └── PhaseBar.vue      # 单个 Phase 进度条
```

**关键方法**：

```typescript
// 计算日期范围
function calculateDateRange(features: GanttFeature[]): DateRange {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 7)  // 向前 7 天
  const end = new Date(today)
  end.setDate(end.getDate() + 14)     // 向后 14 天

  return { start: formatDate(start), end: formatDate(end) }
}

// 计算进度条样式
function getBarStyle(phase: GanttPhase, dateRange: DateRange): CSSProperties {
  const cellWidth = 60  // 每天 60px
  const startOffset = daysBetween(dateRange.start, phase.startDate || today)
  const duration = daysBetween(phase.startDate, phase.endDate) || 1

  return {
    left: `${startOffset * cellWidth}px`,
    width: `${duration * cellWidth}px`,
  }
}
```

---

### 2.4 FeatureCard.vue

**职责**：卡片视图中的 Feature 卡片

```typescript
// Props
interface Props {
  feature: FeatureInfo
}

// Emits
interface Emits {
  (e: 'click'): void
}
```

**模板结构**：
```vue
<template>
  <div class="feature-card" :class="`feature-card--${feature.status}`" @click="emit('click')">
    <div class="feature-card__header">
      <span class="feature-card__name">{{ feature.name }}</span>
      <el-tag :type="statusTagType" size="small">{{ statusLabel }}</el-tag>
    </div>

    <div class="feature-card__progress">
      <span>Phase {{ feature.currentPhase }}: {{ feature.currentPhaseName }}</span>
      <el-progress :percentage="feature.progress" :stroke-width="6" />
    </div>

    <div class="feature-card__phases">
      <span
        v-for="phase in feature.phases"
        :key="phase.phaseId"
        class="phase-dot"
        :class="`phase-dot--${phase.status}`"
      >
        {{ phase.phaseId }}
      </span>
    </div>

    <div class="feature-card__footer">
      <span class="last-updated">{{ formatDate(feature.lastUpdated) }}</span>
      <el-button size="small" type="primary">进入工作区</el-button>
    </div>
  </div>
</template>
```

---

## 3. Composable 设计

### 3.1 useDashboard.ts

```typescript
// composables/useDashboard.ts
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard.store'

export function useDashboard() {
  const store = useDashboardStore()

  // 视图状态
  const viewMode = ref<'gantt' | 'card' | 'list'>('gantt')
  const filter = ref<'all' | 'wip' | 'done' | 'blocked'>('all')
  const searchQuery = ref('')

  // 数据
  const features = computed(() => store.features)
  const loading = computed(() => store.loading)
  const error = computed(() => store.error)

  // Daily Standup 数据
  const standup = computed(() => {
    const highlights: StandupItem[] = []
    const blockers: BlockerItem[] = []
    const tomorrow: PlanItem[] = []

    const today = new Date().toISOString().split('T')[0]

    for (const feature of store.features) {
      // 提取今日更新的 Feature（今日有进展）
      if (feature.lastUpdated?.startsWith(today)) {
        highlights.push({
          featureId: feature.id,
          featureName: feature.name,
          summary: `${feature.currentPhaseName} 阶段进行中 (${feature.progress}%)`
        })
      }

      // 提取阻塞的 Feature
      if (feature.status === 'blocked') {
        blockers.push({
          featureId: feature.id,
          featureName: feature.name,
          issue: '待确认阻塞原因',  // 后续可从 PROGRESS_LOG 提取具体原因
          blockedSince: feature.lastUpdated || today
        })
      }

      // 提取进行中的 Feature 作为明日计划
      if (feature.status === 'wip' && !feature.lastUpdated?.startsWith(today)) {
        tomorrow.push({
          featureId: feature.id,
          plan: `继续 ${feature.name} - ${feature.currentPhaseName}`
        })
      }
    }

    // 限制数量
    return {
      highlights: highlights.slice(0, 5),
      blockers: blockers,  // 阻塞项全部显示
      tomorrow: tomorrow.slice(0, 3)
    }
  })

  // 方法
  const refresh = async () => {
    await store.loadFeatures()
  }

  // 生命周期
  onMounted(() => {
    refresh()
  })

  return {
    features,
    standup,
    loading,
    error,
    viewMode,
    filter,
    searchQuery,
    refresh,
  }
}
```

---

## 4. Store 设计

### 4.1 dashboard.store.ts

```typescript
// stores/dashboard.store.ts
import { defineStore } from 'pinia'
import type { FeatureInfo } from '@/types/dashboard.types'

interface DashboardState {
  features: FeatureInfo[]
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    features: [],
    loading: false,
    error: null,
    lastUpdated: null,
  }),

  actions: {
    async loadFeatures() {
      this.loading = true
      this.error = null

      try {
        // 调用 IPC 获取 Feature 列表
        const features = await window.api.invoke('dashboard:getFeatures')
        this.features = features
        this.lastUpdated = new Date().toISOString()
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load features'
      } finally {
        this.loading = false
      }
    },

    updateFeature(featureId: string, updates: Partial<FeatureInfo>) {
      const index = this.features.findIndex(f => f.id === featureId)
      if (index !== -1) {
        this.features[index] = { ...this.features[index], ...updates }
      }
    },
  },
})
```

---

## 5. IPC 接口设计

### 5.1 IPC Channels

```typescript
// shared/constants/ipc-channels.ts
export const DASHBOARD_CHANNELS = {
  GET_FEATURES: 'dashboard:getFeatures',
  GET_FEATURE_DETAIL: 'dashboard:getFeatureDetail',
  REFRESH: 'dashboard:refresh',
} as const
```

### 5.2 Handler 实现

```typescript
// main/ipc/handlers/dashboard.handler.ts
import { ipcMain } from 'electron'
import { SchemaDiscoveryAdapter } from '@/main/services/schema-discovery-adapter'
import { DASHBOARD_CHANNELS } from '@/shared/constants/ipc-channels'

export function registerDashboardHandlers(adapter: SchemaDiscoveryAdapter) {

  ipcMain.handle(DASHBOARD_CHANNELS.GET_FEATURES, async (event) => {
    const projectPath = adapter.getProjectPath()
    const docsPath = `${projectPath}/docs`

    // 扫描 docs 目录下所有 Feature
    const { features, warnings } = await scanFeatures(docsPath)

    // 如有解析警告，记录日志（不影响返回结果）
    if (warnings.length > 0) {
      console.warn('[Dashboard] Scan warnings:', warnings)
    }

    return features.map(f => ({
      id: f.id,
      name: f.meta?.feature_name || f.id,
      status: f.meta?.status || 'pending',
      currentPhase: f.meta?.current_phase || 1,
      currentPhaseName: getPhaseNameById(f.meta?.current_phase || 1),
      progress: calculateProgress(f),
      phases: extractPhases(f),
      lastUpdated: f.meta?.last_updated || null,
    }))
  })
}

// 扫描结果类型
interface ScanResult {
  features: RawFeature[]
  warnings: string[]
}

async function scanFeatures(docsPath: string): Promise<ScanResult> {
  const features: RawFeature[] = []
  const warnings: string[] = []

  // 读取 docs 目录
  const entries = await fs.readdir(docsPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('_')) continue  // 跳过 _system, _templates 等

    const progressLogPath = `${docsPath}/${entry.name}/90_PROGRESS_LOG.yaml`

    if (await fileExists(progressLogPath)) {
      try {
        const content = await fs.readFile(progressLogPath, 'utf-8')
        const parsed = yaml.parse(content)
        features.push({
          id: entry.name,
          ...parsed,
        })
      } catch (e) {
        // 记录解析失败但继续扫描其他 Feature
        const errMsg = e instanceof Error ? e.message : String(e)
        warnings.push(`Failed to parse ${entry.name}/90_PROGRESS_LOG.yaml: ${errMsg}`)
        console.warn(`[Dashboard] ${warnings[warnings.length - 1]}`)
      }
    }
  }

  return { features, warnings }
}

function calculateProgress(feature: RawFeature): number {
  // 统计所有 phase 的完成任务数
  let totalTasks = 0
  let doneTasks = 0

  for (const key of Object.keys(feature)) {
    if (key.startsWith('phase_') && feature[key]?.tasks) {
      for (const task of feature[key].tasks) {
        totalTasks++
        if (task.status === 'done') doneTasks++
      }
    }
  }

  return totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
}

// Phase 名称映射
const PHASE_NAMES: Record<number, string> = {
  1: 'Kickoff',
  2: 'Spec',
  3: 'Demo',
  4: 'Design',
  5: 'Code',
  6: 'Test',
  7: 'Deploy'
}

function getPhaseNameById(phaseId: number): string {
  return PHASE_NAMES[phaseId] || `Phase ${phaseId}`
}

function extractPhases(feature: RawFeature): PhaseStatus[] {
  const phases: PhaseStatus[] = []

  for (let i = 1; i <= 7; i++) {
    // 查找对应的 phase 数据（phase_1_kickoff, phase_2_spec, etc.）
    const phaseKey = `phase_${i}_${PHASE_NAMES[i]?.toLowerCase()}`
    const phaseData = feature[phaseKey]

    phases.push({
      phaseId: i,
      phaseName: PHASE_NAMES[i],
      status: phaseData?.status || 'pending',
      progress: calculatePhaseProgress(phaseData)
    })
  }

  return phases
}

function calculatePhaseProgress(phaseData: any): number {
  if (!phaseData?.tasks || phaseData.tasks.length === 0) {
    return 0
  }

  const total = phaseData.tasks.length
  const done = phaseData.tasks.filter((t: any) => t.status === 'done').length

  return Math.round((done / total) * 100)
}
```

---

## 6. 类型定义

### 6.1 dashboard.types.ts

```typescript
// types/dashboard.types.ts

export interface FeatureInfo {
  id: string
  name: string
  description?: string
  status: 'wip' | 'done' | 'blocked' | 'pending'
  currentPhase: number
  currentPhaseName: string
  progress: number
  phases: PhaseStatus[]
  lastUpdated: string | null
}

export interface PhaseStatus {
  phaseId: number
  phaseName: string
  status: 'done' | 'wip' | 'pending' | 'blocked' | 'skipped'
  progress: number
}

export interface GanttFeature extends FeatureInfo {
  collapsed: boolean
  startDate?: string
  endDate?: string
}

export interface GanttPhase extends PhaseStatus {
  startDate?: string
  endDate?: string
}

export interface StandupItem {
  featureId: string
  featureName: string
  summary: string
}

export interface BlockerItem {
  featureId: string
  featureName: string
  issue: string
  blockedSince: string
}

export interface PlanItem {
  featureId?: string
  plan: string
}

export interface DateRange {
  start: string
  end: string
}
```

---

## 7. 路由配置

### 7.1 router/index.ts 修改

```typescript
// router/index.ts
import { createRouter, createMemoryHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import WorkspaceView from '@/views/WorkspaceView.vue'
import SettingsView from '@/views/SettingsView.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
  },
  {
    path: '/workspace/:featureId',
    name: 'Workspace',
    component: WorkspaceView,
    props: true,
  },
  {
    path: '/workspace/:featureId/:phaseId',
    name: 'WorkspacePhase',
    component: WorkspaceView,
    props: true,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
  },
]

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
})
```

### 7.2 WorkspaceView 修改说明

现有 WorkspaceView 需要适配新的路由参数：

**Props 变更**：

```typescript
// 修改前（如有）
interface Props {
  projectPath?: string
}

// 修改后
interface Props {
  featureId: string      // 从路由获取
  phaseId?: string       // 可选，指定 Phase
}
```

**数据加载变更**：

```typescript
// WorkspaceView.vue
const props = defineProps<{
  featureId: string
  phaseId?: string
}>()

// 根据 featureId 定位 docs 目录
const featurePath = computed(() => `docs/${props.featureId}`)

// 加载对应的 90_PROGRESS_LOG.yaml
const progressLogPath = computed(() => `${featurePath.value}/90_PROGRESS_LOG.yaml`)

// 如果指定了 phaseId，自动定位到对应 Phase
watch(() => props.phaseId, (newPhaseId) => {
  if (newPhaseId) {
    // 定位到指定 Phase 的内容
    scrollToPhase(parseInt(newPhaseId))
  }
}, { immediate: true })
```

**返回按钮**：

```vue
<template>
  <div class="workspace-view">
    <!-- 新增：返回 Dashboard 按钮 -->
    <div class="workspace-header">
      <el-button
        type="text"
        @click="router.push('/')"
        class="back-button"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回 Dashboard
      </el-button>
      <h2>{{ featureId }}</h2>
    </div>

    <!-- 原有内容 -->
    ...
  </div>
</template>
```

---

## 8. 文件结构

```
src/renderer/
├── views/
│   ├── DashboardView.vue          # 新增
│   ├── WorkspaceView.vue          # 修改
│   └── SettingsView.vue
├── components/
│   ├── dashboard/                  # 新增目录
│   │   ├── DailyStandupPanel.vue
│   │   ├── DashboardToolbar.vue
│   │   ├── GanttChart.vue
│   │   ├── GanttHeader.vue
│   │   ├── FeatureRow.vue
│   │   ├── PhaseBar.vue
│   │   └── FeatureCard.vue
│   └── ...
├── composables/
│   ├── useDashboard.ts            # 新增
│   └── ...
├── stores/
│   ├── dashboard.store.ts         # 新增
│   └── ...
├── types/
│   ├── dashboard.types.ts         # 新增
│   └── ...
└── router/
    └── index.ts                   # 修改

src/main/
├── ipc/
│   └── handlers/
│       ├── dashboard.handler.ts   # 新增
│       └── ...
└── ...

src/shared/
└── constants/
    └── ipc-channels.ts            # 修改
```

---

## 9. 开发任务拆分

| 任务 ID | 任务描述 | 依赖 | 预估复杂度 |
|---------|----------|------|-----------|
| CODE-001 | 创建 dashboard.types.ts | - | 低 |
| CODE-002 | 创建 dashboard.store.ts | CODE-001 | 低 |
| CODE-003 | 创建 useDashboard.ts | CODE-002 | 中 |
| CODE-004 | 创建 dashboard.handler.ts | CODE-001 | 中 |
| CODE-005 | 创建 DashboardToolbar.vue | - | 低 |
| CODE-006 | 创建 DailyStandupPanel.vue | CODE-001 | 中 |
| CODE-007 | 创建 FeatureCard.vue | CODE-001 | 低 |
| CODE-008 | 创建 GanttChart + 子组件 | CODE-001 | 高 |
| CODE-009 | 创建 DashboardView.vue | CODE-003 ~ CODE-008 | 中 |
| CODE-010 | 修改路由配置 | CODE-009 | 低 |
| CODE-011 | 修改 WorkspaceView（返回按钮） | CODE-010 | 低 |
| CODE-012 | 注册 IPC handlers | CODE-004 | 低 |

---

## CHANGELOG

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2024-12-30 | AI PE | 初始版本 |
| v1.1 | 2024-12-30 | AI PE | 修复 Expert Review 问题：standup 逻辑实现、loading/error UI、路由兼容说明、YAML 错误处理、工具函数定义 |
