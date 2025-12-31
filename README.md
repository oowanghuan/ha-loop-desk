# HA Loop Desk

> **Human-AI Loop Desk** - 人机协作循环可视化工作台

## 什么是 HA Loop Desk？

HA Loop Desk 是一个可视化的人机协作工作流管理工具。通过配置化的阶段（Phase）和文档模板，适用于任何需要人机协作的场景。

## 核心特性

- 📊 **可视化甘特图** - 追踪多功能模块的开发进度
- 🔄 **Daily Standup** - 每日站会面板，一目了然
- 📝 **文档驱动** - 基于文档的工作流管理
- ⚙️ **可配置预设** - 支持不同场景的阶段和模板配置
- 🚦 **Phase Gate** - 质量关卡，确保交付质量

## 适用场景

| 预设 | 适用场景 | 阶段示例 |
|------|----------|----------|
| software-dev | 软件开发 | Kickoff → Spec → Design → Code → Test → Deploy |
| content-creation | 内容创作 | 选题 → 大纲 → 初稿 → 审校 → 发布 |
| product-design | 产品设计 | 调研 → 需求 → 原型 → 评审 → 交付 |
| *自定义* | 任意场景 | 根据需要配置 |

## 快速开始

### 下载安装

从 [Releases](https://github.com/oowanghuan/ha-loop-desk/releases) 下载适合你系统的版本：

- macOS (Apple Silicon): `ha-loop-desk-x.x.x-arm64.dmg`
- macOS (Intel): `ha-loop-desk-x.x.x-x64.dmg`
- Windows: `ha-loop-desk-x.x.x-setup.exe`

### 从源码运行

```bash
# 克隆仓库
git clone https://github.com/oowanghuan/ha-loop-desk.git
cd ha-loop-desk

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建应用
npm run build
```

## 配合使用

推荐配合 [ai-coding-template](https://github.com/oowanghuan/ai-coding-template) 使用，获得完整的 AI 协作开发体验。

## 截图

*Coming soon...*

## License

MIT
