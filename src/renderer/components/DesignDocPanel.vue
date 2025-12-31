<script setup lang="ts">
/**
 * DesignDocPanel 组件
 * 右侧滑出的设计说明面板
 */
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
}>(), {
  visible: false,
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 当前展开的 section
const activeSection = ref<string[]>(['architecture', 'data-sources'])
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="设计说明"
    direction="rtl"
    size="500px"
    :close-on-press-escape="true"
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
  >
    <template #header>
      <div class="panel-header">
        <el-icon><InfoFilled /></el-icon>
        <span class="header-title">HA Loop Desk 设计说明</span>
      </div>
    </template>

    <div class="design-doc">
      <el-collapse v-model="activeSection">
        <!-- 整体架构 -->
        <el-collapse-item title="整体架构" name="architecture">
          <div class="doc-section">
            <p>HA Loop Desk 是一个 Electron 桌面应用，采用 Vue 3 + TypeScript 技术栈。</p>
            <ul>
              <li><strong>Main Process</strong>: 处理文件系统、IPC 通信、CLI 调用</li>
              <li><strong>Renderer Process</strong>: Vue 3 SPA，展示 UI 和业务逻辑</li>
              <li><strong>Preload Scripts</strong>: 安全的进程间通信桥接</li>
            </ul>
            <div class="code-block">
              <pre>apps/coding-gui/
├── src/main/          # Electron 主进程
├── src/renderer/      # Vue 渲染进程
│   ├── components/    # UI 组件
│   ├── views/         # 页面视图
│   ├── stores/        # Pinia 状态管理
│   ├── services/      # 业务服务
│   └── composables/   # 组合式函数
└── src/shared/        # 共享类型和工具</pre>
            </div>
          </div>
        </el-collapse-item>

        <!-- 数据来源对照表 -->
        <el-collapse-item title="数据来源对照表" name="data-sources">
          <div class="doc-section">
            <table class="data-table">
              <thead>
                <tr>
                  <th>UI 区域</th>
                  <th>数据来源</th>
                  <th>更新机制</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>工作区（已发现文档）</td>
                  <td>Schema Discovery 本地扫描</td>
                  <td>启动时 + 手动刷新</td>
                </tr>
                <tr>
                  <td>本阶段目标</td>
                  <td>WORKFLOW_CONFIG.yaml</td>
                  <td>Phase 切换时加载</td>
                </tr>
                <tr>
                  <td>上游输入</td>
                  <td>WORKFLOW_CONFIG.yaml</td>
                  <td>Phase 切换时加载</td>
                </tr>
                <tr>
                  <td>参考文档</td>
                  <td>Template Scanner 扫描</td>
                  <td>启动时 + 手动刷新</td>
                </tr>
                <tr>
                  <td>可用工具</td>
                  <td>WORKFLOW_CONFIG.yaml</td>
                  <td>Phase 切换时加载</td>
                </tr>
                <tr>
                  <td>执行清单</td>
                  <td>ExecutionEngine 计算</td>
                  <td>Phase/Feature 切换时</td>
                </tr>
                <tr>
                  <td>Feature 任务</td>
                  <td>90_PROGRESS_LOG.yaml</td>
                  <td>Feature 切换时加载</td>
                </tr>
              </tbody>
            </table>
          </div>
        </el-collapse-item>

        <!-- 三层执行流程 -->
        <el-collapse-item title="三层执行流程" name="workflow">
          <div class="doc-section">
            <div class="workflow-diagram">
              <div class="workflow-stage">
                <span class="stage-number">1</span>
                <div class="stage-content">
                  <strong>每日开始 (/start-day)</strong>
                  <p>同步今日工作状态，加载待办事项</p>
                </div>
              </div>
              <div class="workflow-arrow">↓</div>
              <div class="workflow-stage active">
                <span class="stage-number">2</span>
                <div class="stage-content">
                  <strong>执行流程</strong>
                  <p>Feature 任务 + Phase Gate 检查</p>
                  <ul>
                    <li>/expert-review - 专家评审</li>
                    <li>/check-gate - 检查 Gate 状态</li>
                    <li>/approve-gate - 审批通过</li>
                  </ul>
                </div>
              </div>
              <div class="workflow-arrow">↓</div>
              <div class="workflow-stage">
                <span class="stage-number">3</span>
                <div class="stage-content">
                  <strong>每日结束 (/end-day)</strong>
                  <p>生成工作总结，更新进度日志</p>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-item>

        <!-- Phase 配置说明 -->
        <el-collapse-item title="Phase 配置说明" name="phases">
          <div class="doc-section">
            <p>Phase 配置定义在 <code>WORKFLOW_CONFIG.yaml</code> 中：</p>
            <div class="code-block">
              <pre>phases:
  - id: 4
    name: "Design"
    objectives:
      - "完成系统设计文档"
      - "定义技术架构"
    inputs:
      - name: "需求规格"
        paths: ["docs/{feature}/21_UI_FLOW_SPEC.md"]
    tools:
      - command: "/expert-review"
        description: "执行专家评审"</pre>
            </div>
            <p>每个 Phase 包含：</p>
            <ul>
              <li><strong>objectives</strong>: 阶段目标列表</li>
              <li><strong>inputs</strong>: 上游阶段的输入文档</li>
              <li><strong>references</strong>: 参考模板文档</li>
              <li><strong>tools</strong>: 可用的命令工具</li>
            </ul>
          </div>
        </el-collapse-item>

        <!-- Schema Discovery 机制 -->
        <el-collapse-item title="Schema Discovery 机制" name="schema-discovery">
          <div class="doc-section">
            <p>Schema Discovery 自动扫描项目目录，发现符合约定的文件：</p>
            <div class="code-block">
              <pre>docs/{feature}/
├── 10_CONTEXT.md          # 上下文文档
├── 20_REQUIREMENTS.md     # 需求文档
├── 21_UI_FLOW_SPEC.md     # UI 流程规格
├── 30_DESIGN.md           # 设计文档
├── 90_PROGRESS_LOG.yaml   # 进度日志
└── PHASE_GATE.yaml        # Phase Gate 状态</pre>
            </div>
            <p>扫描规则：</p>
            <ul>
              <li>按文件名模式匹配（10_, 20_, 等前缀）</li>
              <li>验证文件内容结构（YAML schema）</li>
              <li>检测文件冲突和缺失</li>
            </ul>
          </div>
        </el-collapse-item>

        <!-- 如何维护/修改 -->
        <el-collapse-item title="如何维护/修改" name="maintenance">
          <div class="doc-section">
            <h4>添加新的 Phase 工具</h4>
            <ol>
              <li>在 <code>WORKFLOW_CONFIG.yaml</code> 的对应 phase 添加 tool 定义</li>
              <li>实现对应的 slash command（在 <code>.claude/commands/</code>）</li>
              <li>更新 ExecutionEngine 的工具映射</li>
            </ol>

            <h4>修改 UI 布局</h4>
            <ol>
              <li>组件位于 <code>src/renderer/components/</code></li>
              <li>视图位于 <code>src/renderer/views/</code></li>
              <li>全局样式在 <code>src/renderer/styles/main.css</code></li>
            </ol>

            <h4>调试技巧</h4>
            <ul>
              <li>使用 <code>npm run dev</code> 启动开发服务器</li>
              <li>Electron DevTools: <code>Cmd+Option+I</code></li>
              <li>Vue DevTools 扩展支持组件检查</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </el-drawer>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.design-doc {
  padding: 0;
}

.doc-section {
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

.doc-section p {
  margin: 0 0 12px 0;
}

.doc-section ul,
.doc-section ol {
  margin: 8px 0;
  padding-left: 20px;
}

.doc-section li {
  margin-bottom: 6px;
}

.doc-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 16px 0 8px 0;
}

.doc-section h4:first-child {
  margin-top: 0;
}

.code-block {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #303133;
}

.doc-section code {
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #409eff;
}

/* 数据表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin: 12px 0;
}

.data-table th,
.data-table td {
  border: 1px solid #e4e7ed;
  padding: 8px 10px;
  text-align: left;
}

.data-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: #303133;
}

.data-table td {
  color: #606266;
}

/* 工作流图示 */
.workflow-diagram {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.workflow-stage {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.workflow-stage.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.stage-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.stage-content {
  flex: 1;
}

.stage-content strong {
  display: block;
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.stage-content p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.stage-content ul {
  margin: 8px 0 0 0;
  padding-left: 16px;
}

.stage-content li {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.workflow-arrow {
  text-align: center;
  color: #c0c4cc;
  font-size: 18px;
}

/* Element Plus 覆盖 */
:deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 14px;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 16px;
}
</style>
