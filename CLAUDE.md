# CLAUDE.md
# HA Loop Desk - AI 协作指南

> **读者**：Claude Code (AI)
> **目的**：了解 HA Loop Desk 与 Claude Code CLI 的协作方式
> **触发方式**：用户提到「HA Loop Desk」「可视化工作台」「查看进度」等

---

## 这是什么？

HA Loop Desk 是一个桌面应用，用于**可视化** AI Coding Template 项目的进度。

```
你的角色（Claude Code CLI）    用户看到的（HA Loop Desk）
═══════════════════════════    ═══════════════════════════
生成和更新数据                  读取和展示数据

/new-feature     ──→ 90_PROGRESS_LOG.yaml    ──→ 甘特图
/check-gate      ──→ PHASE_GATE_STATUS.yaml  ──→ Gate 状态
/end-day         ──→ PROJECT_DAILY_STANDUP   ──→ Standup 面板
```

**关键点**：
- HA Loop Desk 是**只读**的，不会修改任何文件
- 所有数据更新都由你（Claude Code CLI）完成
- 用户通过 HA Loop Desk 查看你生成的进度信息

---

## 数据文件规范

HA Loop Desk 读取以下文件，请确保格式正确：

### 1. 90_PROGRESS_LOG.yaml

```yaml
meta:
  feature: "feature-name"
  current_phase: 2  # 当前阶段编号
  status: wip       # wip | done | blocked
  last_updated: "2025-01-01T10:00:00"

phase_1_kickoff:
  status: done
  tasks:
    - id: KICK-001
      task: "任务描述"
      status: done  # done | wip | pending | blocked
      completed_at: "2025-01-01"

phase_2_spec:
  status: wip
  tasks:
    - id: SPEC-001
      task: "任务描述"
      status: wip
```

### 2. PHASE_GATE_STATUS.yaml

```yaml
meta:
  feature: "feature-name"
  last_updated: "2025-01-01T10:00:00"

phase_1:
  gate_state: passed  # pending | passed | blocked | skipped
  approvals:
    - role: PM
      approved_by: "alice"
      approved_at: "2025-01-01T10:00:00"

phase_2:
  gate_state: pending
  approvals: []
```

### 3. PROJECT_DAILY_STANDUP.yaml

```yaml
date: "2025-01-01"
features:
  - name: "feature-name"
    yesterday:
      - "完成了 XXX"
    today:
      - "计划做 YYY"
    blockers: []
```

---

## 与 HA Loop Desk 协作的命令

当用户使用 HA Loop Desk 时，以下命令会更新可视化数据：

| 命令 | 更新的文件 | HA Loop Desk 显示 |
|------|------------|-------------------|
| `/new-feature` | 创建 90_PROGRESS_LOG.yaml | 新功能出现在甘特图 |
| `/check-gate` | 更新 PHASE_GATE_STATUS.yaml | Gate 状态变化 |
| `/approve-gate` | 更新 PHASE_GATE_STATUS.yaml | 审批状态更新 |
| `/next-phase` | 更新 90_PROGRESS_LOG.yaml | 阶段进度推进 |
| `/end-day` | 生成 PROJECT_DAILY_STANDUP.yaml | Daily Standup 面板更新 |

---

## 用户可能的问题

### "HA Loop Desk 没有显示我的功能模块"

检查：
1. 功能目录是否在 `docs/{feature}/` 下
2. 是否存在 `90_PROGRESS_LOG.yaml` 文件
3. YAML 格式是否正确

### "进度没有更新"

检查：
1. `90_PROGRESS_LOG.yaml` 的 `last_updated` 是否已更新
2. HA Loop Desk 是否指向正确的项目目录
3. 建议用户刷新 HA Loop Desk

### "用户想让我操作 HA Loop Desk"

说明：
- HA Loop Desk 是独立的桌面应用
- 你无法直接操作它
- 你只能通过更新 YAML 文件来间接影响显示

---

## GUI 连接功能

HA Loop Desk 支持与 Claude Code 建立实时连接：

### 连接命令

```bash
/gui-connect
```

连接后，你可以：
- 接收来自 GUI 的用户指令
- 实时更新 GUI 显示的状态

### 断开连接

```bash
/gui-disconnect
```

### Session 文件

连接时会在项目目录创建：
```
.claude/gui-sessions/{session-id}.json
```

---

## 元信息

```yaml
文档版本: v1.0
最后更新: 2025-12-31
适用于: ha-loop-desk v1.0+
```
