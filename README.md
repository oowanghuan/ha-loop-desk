# HA Loop Desk

> **Human-AI Loop Desk** - 人机协作循环可视化工作台

## 项目背景

HA Loop Desk 是 [AI Coding Template](https://github.com/oowanghuan/ai-coding-template) 的**可视化伴侣工具**。

AI Coding Template 定义了一套人机协作开发框架（文档模板、开发阶段、质量关卡），而 HA Loop Desk 则提供了一个桌面应用来**可视化**这些信息：

```
┌─────────────────────────────────────────────────────────┐
│  AI Coding Template          HA Loop Desk              │
│  ═══════════════════         ═══════════════           │
│  方法论 + 模板               可视化工作台               │
│                                                         │
│  - SDLC 阶段定义      ──→    - 甘特图进度视图           │
│  - 文档模板                  - Daily Standup 面板       │
│  - Phase Gate 机制           - Phase Gate 状态显示      │
│  - 进度日志 (YAML)           - 实时文件监控             │
└─────────────────────────────────────────────────────────┘
```

## 核心特性

- 📊 **可视化甘特图** - 追踪多功能模块的开发进度
- 🔄 **Daily Standup** - 每日站会面板，一目了然
- 📝 **文档驱动** - 实时读取项目 `docs/` 目录下的 YAML 文件
- ⚙️ **可配置预设** - 支持不同场景的阶段和模板配置
- 🚦 **Phase Gate** - 质量关卡状态可视化
- 🔗 **Claude Code 集成** - 与 CLI 双向通信

## 适用场景

HA Loop Desk 通过预设配置支持多种场景：

| 预设 | 适用场景 | 阶段示例 |
|------|----------|----------|
| software-dev | 软件开发 | Kickoff → Spec → Demo → Design → Code → Test → Deploy |
| content-creation | 内容创作 | 选题 → 大纲 → 初稿 → 审校 → 发布 |
| product-design | 产品设计 | 调研 → 需求 → 原型 → 评审 → 交付 |
| *自定义* | 任意场景 | 根据需要配置 |

## 快速开始

### 1. 下载安装

从 [Releases](https://github.com/oowanghuan/ha-loop-desk/releases) 下载适合你系统的版本：

- macOS (Apple Silicon): `HA.Loop.Desk-x.x.x-arm64.dmg`
- macOS (Intel): `HA.Loop.Desk-x.x.x-x64.dmg`
- Windows: `HA.Loop.Desk-x.x.x-setup.exe`

### 2. 打开项目

启动 HA Loop Desk 后，选择你的项目目录（需要是使用 [AI Coding Template](https://github.com/oowanghuan/ai-coding-template) 结构的项目）。

应用会自动扫描 `docs/` 目录，读取各功能模块的进度信息。

### 3. 从源码运行

```bash
# 克隆仓库
git clone https://github.com/oowanghuan/ha-loop-desk.git
cd ha-loop-desk

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建应用
npm run build:mac   # macOS
npm run build:win   # Windows
```

## 与 AI Coding Template 配合使用

### 推荐工作流

1. **使用 AI Coding Template 创建项目**
   ```bash
   git clone https://github.com/oowanghuan/ai-coding-template.git my-project
   cd my-project
   ```

2. **使用 Claude Code CLI 进行开发**
   ```bash
   claude
   > /new-feature user-auth
   > /check-gate user-auth
   ```

3. **使用 HA Loop Desk 查看整体进度**
   - 打开 HA Loop Desk
   - 选择项目目录
   - 查看甘特图和 Standup 面板

### 数据来源

HA Loop Desk 读取以下文件：

| 文件 | 用途 |
|------|------|
| `docs/{feature}/90_PROGRESS_LOG.yaml` | 功能进度和任务状态 |
| `docs/{feature}/PHASE_GATE_STATUS.yaml` | Phase Gate 状态 |
| `.claude/config/SDLC_PHASES.yaml` | 阶段定义配置 |
| `PROJECT_DAILY_STANDUP.yaml` | Daily Standup 数据 |

## 扩展预设

HA Loop Desk 的核心是**可配置的阶段系统**。你可以通过修改 `presets/` 目录下的配置来自定义工作流：

```yaml
# presets/software-dev/preset.yaml
phases:
  - id: 1
    name: "Kickoff"
    display_name: "启动"
    required_outputs:
      - "10_CONTEXT.md"
    gate_rules:
      approvers: ["PM"]
```

这意味着 HA Loop Desk 不仅适用于软件开发，还可以用于任何需要**阶段化管理**的人机协作场景。

## 技术栈

- **框架**: Electron + Vue 3
- **UI**: Element Plus
- **状态管理**: Pinia
- **构建工具**: electron-vite

## 相关项目

| 项目 | 说明 |
|------|------|
| [AI Coding Template](https://github.com/oowanghuan/ai-coding-template) | AI 协作开发框架模板 |

## License

MIT
