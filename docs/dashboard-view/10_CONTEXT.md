# Dashboard View - 功能上下文

> 版本：v0.1
> 最后更新：2024-12-30
> 状态：Draft
> 负责人：AI PE

---

## 1. 功能概述

### 1.1 背景

Coding GUI 目前只有单个 Feature 的 WorkspaceView，缺少全局视角。用户需要一个 Dashboard 视图来：
- 查看所有 Feature 的进度总览
- 快速识别阻塞和风险
- 从全局视角进入具体 Feature 工作

现有 vue-app 中的 ProjectDashboard 依赖 Supabase 和硬编码数据，需要基于 Coding GUI 的 Schema Discovery 架构重新实现，使其成为纯本地文件驱动的看板视图。

### 1.2 目标

- **目标 1**：实现 Dashboard 总览视图，展示所有 Feature 的进度甘特图
- **目标 2**：支持从 Dashboard 点击进入 WorkspaceView（单 Feature 详情）
- **目标 3**：提供 Daily Standup 汇总（今日进展/阻塞/明日计划）
- **目标 4**：基于 Schema Discovery 自动扫描本地 PROGRESS_LOG 文件

### 1.3 预期价值

| 价值点 | 衡量指标 | 目标值 |
|--------|----------|--------|
| 提升全局可见性 | 一眼看到所有 Feature 状态 | 100% Feature 可见 |
| 减少切换成本 | 从看板到详情的点击次数 | ≤ 2 次点击 |
| 风险早发现 | 阻塞问题在看板高亮显示 | 阻塞 Feature 红色标记 |

---

## 2. 功能范围

### 2.1 包含内容（In Scope）

- Dashboard 主视图（甘特图 + Feature 列表）
- Daily Standup 汇总面板
- Feature 卡片（进度、状态、Phase 概览）
- 点击 Feature 跳转到 WorkspaceView
- 基于 Schema Discovery 扫描多 Feature

### 2.2 不包含内容（Out of Scope）

- Supabase 集成（不依赖远程数据库）
- 多用户协作功能
- 培训文档页面（保留在 vue-app）
- 时间轴拖拽编辑功能

### 2.3 未来规划（Future Scope）

- 多项目支持（跨项目看板）
- 数据导出功能
- 自定义看板布局

---

## 3. 用户与场景

### 3.1 目标用户

| 用户类型 | 描述 | 核心诉求 |
|----------|------|----------|
| 开发者 | 使用 Coding GUI 的 AI PE | 快速了解项目全局进度，切换 Feature |
| PM | 项目管理者 | 追踪多 Feature 进度，识别风险 |

### 3.2 核心场景

#### 场景 1：每日开始工作

```
角色：开发者
目的：了解今日工作重点
前置条件：已打开 Coding GUI
步骤：
  1. 启动 GUI，默认进入 Dashboard
  2. 查看 Daily Standup 面板（昨日进展/今日计划）
  3. 在甘特图中找到自己负责的 Feature
  4. 点击 Feature 进入 WorkspaceView 开始工作
预期结果：30 秒内定位到今日工作任务
```

#### 场景 2：识别阻塞问题

```
角色：PM
目的：发现项目风险
前置条件：项目有多个 Feature 并行开发
步骤：
  1. 进入 Dashboard 视图
  2. 查看甘特图，红色/橙色 Feature 表示有问题
  3. 点击问题 Feature 查看详情
  4. 在 WorkspaceView 中查看具体阻塞原因
预期结果：1 分钟内识别所有阻塞问题
```

---

## 4. 技术方案

### 4.1 架构概述

```
┌─────────────────────────────────────────────────────┐
│  Schema Discovery (现有)                            │
│  ├── 扫描 docs/ 目录                                │
│  ├── 识别所有 90_PROGRESS_LOG.yaml                  │
│  └── 返回 Feature 列表 + Phase 状态                 │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  DashboardView (新增)                               │
│  ├── 调用 Schema Discovery API                     │
│  ├── 渲染甘特图组件                                 │
│  ├── 渲染 Daily Standup 面板                       │
│  └── 路由跳转到 WorkspaceView                      │
└─────────────────────────────────────────────────────┘
```

### 4.2 关键组件

| 组件 | 职责 | 状态 |
|------|------|------|
| DashboardView.vue | 主视图容器 | 待开发 |
| GanttChart.vue | 甘特图组件 | 待开发 |
| FeatureCard.vue | Feature 卡片 | 待开发 |
| DailyStandup.vue | Standup 面板 | 待开发 |
| useDashboard.ts | 数据逻辑 composable | 待开发 |

---

## 5. 依赖与集成

### 5.1 内部依赖

| 依赖模块 | 依赖内容 | 状态 |
|----------|----------|------|
| Schema Discovery | 扫描 Feature 列表 | ✅ 已实现 |
| WorkspaceView | 跳转目标 | ✅ 已实现 |
| Router | 路由配置 | ✅ 已实现 |

### 5.2 外部依赖

| 外部系统 | 集成方式 | 状态 |
|----------|----------|------|
| 无 | - | - |

---

## 6. 验收标准

1. Dashboard 能显示所有 Feature 的甘特图视图
2. 点击 Feature 能正确跳转到 WorkspaceView
3. Daily Standup 能汇总今日进展和阻塞问题
4. 支持 Feature 的展开/收起
5. 阻塞状态的 Feature 有明显视觉提示（红色）

---

## 7. 里程碑

| 阶段 | 交付物 | 状态 |
|------|--------|------|
| Kickoff | 10_CONTEXT.md | ✅ Done |
| Spec | 21_UI_FLOW_SPEC.md | 待开始 |
| Design | 40_DESIGN_FINAL.md | 待开始 |
| Code | 功能实现 | 待开始 |
| Test | 测试验证 | 待开始 |

---

## 8. 相关文档

- 进度日志：`docs/dashboard-view/90_PROGRESS_LOG.yaml`
- 工作流总纲：`CC_COLLABORATION/04_AI_WORKFLOW.md`

---

## CHANGELOG

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v0.1 | 2024-12-30 | AI PE | 初始版本 |
