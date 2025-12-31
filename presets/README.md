# HA Loop Desk Presets

预设配置目录，用于定义不同场景的人机协作工作流。

## 目录结构

```
presets/
├── README.md
├── software-dev/          # 软件开发预设
│   ├── preset.yaml        # 预设配置
│   └── templates/         # 文档模板
└── [其他预设]/
```

## 内置预设

| 预设 | 目录 | 适用场景 |
|------|------|----------|
| 软件开发 | `software-dev/` | 软件项目的完整开发流程 |

## 预设配置说明

每个预设目录包含：

### preset.yaml

定义工作流的核心配置：

- **meta**: 预设元信息（名称、版本、描述）
- **phases**: 阶段定义（ID、名称、颜色、必需产出物、Gate 规则）
- **templates**: 文档模板映射
- **progress_log**: 进度日志配置
- **gate**: Phase Gate 配置

### templates/

存放该预设使用的文档模板，支持变量替换：

- `{{feature_name}}` - 功能名称
- `{{date}}` - 当前日期
- `{{datetime}}` - 当前日期时间
- `{{owner}}` - 负责人

## 创建自定义预设

1. 复制 `software-dev/` 目录
2. 修改 `preset.yaml` 中的阶段定义
3. 调整 `templates/` 中的文档模板
4. 在 HA Loop Desk 中选择使用

## 贡献预设

欢迎提交 PR 贡献新的预设配置！
