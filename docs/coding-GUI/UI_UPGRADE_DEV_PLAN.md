# Coding GUI UI 升级开发计划

> 基于 `_demos/ui-optimization-v2.html` 设计稿

## 升级目标

将当前 GUI 升级为更清晰的流程导向界面，强化：
- 流程层级感（每日开始 → 执行流程 → 每日结束）
- 信息分组和折叠
- 全局状态感知
- 下一步操作引导

---

## Phase 1: 执行清单重构 (RightPanel)

**目标**: 将执行清单改为三层流程结构

### 1.1 创建流程阶段组件
- [ ] 新建 `WorkflowStage.vue` 组件
  - Props: `number`, `title`, `subtitle`, `status` (completed/active/pending)
  - Slots: 展开内容区
  - 样式: 编号圆圈 + 标题 + 状态标签

### 1.2 重构 RightPanel.vue
- [ ] 替换原有分组结构为三层流程：
  - Stage 1: 每日开始 (`/start-day`)
  - Stage 2: 执行流程 (Feature 任务 + Phase Gate)
  - Stage 3: 每日结束 (`/end-day`)
- [ ] Stage 2 内部分组：
  - Feature 任务组
  - Phase Gate 组 (expert-review, check-gate, approve-gate)

### 1.3 添加下一步提示
- [ ] 新建 `NextActionHint.vue` 组件
- [ ] 根据当前状态自动计算建议的下一步
- [ ] 显示在 Stage 2 内容区顶部

**预计文件改动**:
- `src/renderer/components/WorkflowStage.vue` (新建)
- `src/renderer/components/NextActionHint.vue` (新建)
- `src/renderer/components/RightPanel.vue` (重构)

---

## Phase 2: 左侧面板折叠分组 (LeftPanel)

**目标**: 将左侧面板内容分组，支持折叠展开

### 2.1 创建折叠面板组件
- [ ] 新建 `CollapsibleSection.vue` 组件
  - Props: `title`, `icon`, `badge`, `defaultExpanded`
  - 点击 header 切换展开/折叠
  - 记住用户偏好 (localStorage)

### 2.2 重构 LeftPanel.vue
- [ ] 分组结构：
  - 工作区 (已发现文档) - 默认展开
  - 本阶段目标 - 默认展开
  - 上游输入 - 默认折叠
  - 参考文档 - 默认折叠
  - 可用工具 - 默认展开

### 2.3 优化文档项样式
- [ ] 每个文档项添加「查看」按钮
- [ ] 工具项添加「使用说明」「查看源码」按钮
- [ ] 缺失文档显示红色状态

**预计文件改动**:
- `src/renderer/components/CollapsibleSection.vue` (新建)
- `src/renderer/components/LeftPanel.vue` (重构)
- `src/renderer/components/DocItem.vue` (新建，可选)
- `src/renderer/components/ToolItem.vue` (新建，可选)

---

## Phase 3: 全局状态条

**目标**: 在顶部添加状态条，显示关键信息

### 3.1 创建状态条组件
- [ ] 新建 `StatusBar.vue` 组件
- [ ] 显示内容：
  - Phase 进度 (Phase 4/7 Design)
  - 任务完成度 (2/5 完成)
  - 待审批项 (1 项需要审批)
  - 上次同步时间

### 3.2 集成到布局
- [ ] 在 Header 和 Phase Nav 之间插入 StatusBar
- [ ] 调整整体布局高度计算

**预计文件改动**:
- `src/renderer/components/StatusBar.vue` (新建)
- `src/renderer/views/WorkspaceView.vue` (添加 StatusBar)
- `src/renderer/styles/layout.css` (调整高度变量)

---

## Phase 4: Phase 导航增强

**目标**: 在 Phase 导航上显示更多信息

### 4.1 增强 PhaseNav 组件
- [ ] 每个 Phase 显示完成百分比
- [ ] 已完成的 Phase 显示 ✓ 图标
- [ ] Hover 显示 Phase 摘要 (tooltip)

**预计文件改动**:
- `src/renderer/components/PhaseNav.vue` (增强)

---

## Phase 5: 设计说明面板

**目标**: 添加右侧滑出的设计说明面板

### 5.1 创建设计说明面板
- [ ] 新建 `DesignDocPanel.vue` 组件
- [ ] 包含内容：
  - 整体架构
  - 数据来源对照表
  - Phase 配置说明
  - 执行清单配置
  - 如何维护/修改
  - Schema Discovery 机制

### 5.2 添加触发按钮
- [ ] 在 Header 右侧添加「设计说明」按钮
- [ ] 支持 ESC 关闭

**预计文件改动**:
- `src/renderer/components/DesignDocPanel.vue` (新建)
- `src/renderer/components/AppHeader.vue` (添加按钮)

---

## 执行顺序

```
Phase 1 (执行清单) ──→ Phase 2 (左侧面板) ──→ Phase 3 (状态条)
                                              ↓
                   Phase 5 (设计说明) ←── Phase 4 (Phase导航)
```

**建议顺序**: 1 → 2 → 3 → 4 → 5

- Phase 1 是核心改动，影响最大
- Phase 2 独立，可并行
- Phase 3-5 是增强功能，优先级较低

---

## 时间预估

| Phase | 复杂度 | 核心文件数 |
|-------|--------|-----------|
| Phase 1 | 高 | 3 |
| Phase 2 | 中 | 2-4 |
| Phase 3 | 低 | 2 |
| Phase 4 | 低 | 1 |
| Phase 5 | 中 | 2 |

---

## 验收标准

- [ ] 执行清单显示三层流程结构，编号清晰
- [ ] 左侧面板支持折叠，状态可保持
- [ ] 状态条显示关键进度信息
- [ ] Phase 导航显示完成度
- [ ] 设计说明面板可滑出查看
- [ ] 所有原有功能正常工作
- [ ] 无 TypeScript 类型错误
- [ ] 无控制台报错
