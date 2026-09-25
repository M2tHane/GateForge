# DESIGN.md — Agent Platform Web Console

## 1. 设计目标

界面定位为企业级 Agent Control Plane，不做聊天应用风格主页。整体采用蓝白、克制、清晰、低噪音的控制台视觉；优先展示“当前状态、风险、运行结果和下一步动作”，复杂配置进入详情页、Drawer 或 Settings。

## 2. 设计原则

1. **状态优先**：页面第一眼能看到 Agent 是否可用、Run 是否异常、是否有待审批动作。
2. **控制面优先**：Agent 的 Version、Model、Tools、Policy、Budget、Release 必须结构清晰。
3. **Trace 可读**：Run Detail 的核心不是聊天气泡，而是执行时间线。
4. **高风险动作显式**：Approve、Rollback、Disable、Delete 等必须有清楚的风险反馈。
5. **不铺满**：首页只展示关键指标和最近活动；完整列表进入独立页面。
6. **配置分层**：常用配置正文展示，低频高级配置放 Drawer / Settings。

## 3. 技术栈

```text
Next.js / React / TypeScript
Tailwind CSS
shadcn/ui + Base UI
TanStack Query
TanStack Table
React Hook Form + Zod
Recharts
Lucide React
```

## 4. 信息架构

```text
Overview
Agents
  └─ Agent Detail
      ├─ Overview
      ├─ Versions
      ├─ Runs
      ├─ Models
      ├─ Tools
      ├─ Policies
      └─ Settings
Runs
Approvals
Tools
  ├─ Tool Registry（二级 Tab）
  └─ MCP Servers（二级 Tab）
Models
Policies
Budgets
Audit
Settings
```

左侧主导航保持 7–9 个一级入口；Agents 内部配置用二级 Tab，不把所有功能放主导航。

## 5. App Shell

### 左侧导航
宽度 232–248px，可折叠。

顶部：
- Logo / Product Name
- Workspace Switcher

主导航：
- Overview
- Agents
- Runs
- Approvals
- Tools
- Models
- Policies
- Audit

底部：
- Settings

不展示搜索框和用户资料大卡片。

### 顶部栏
高度 56px 左右：
- Breadcrumb
- 当前页面主要 Action
- 可选状态提示

不要放全局搜索框。

## 6. Overview

目标：10 秒内判断平台是否正常。

布局：

```text
[Active Agents] [Running Runs] [Pending Approvals] [24h Cost]

[Run Success Rate / 7d]       [Token & Cost / 7d]

Pending Approvals
- Agent / Action / Risk / Waiting / Approve

Recent Runs
- Run / Agent / Status / Duration / Cost / Time
```

卡片数量控制在 4 个 KPI；不要做满屏 10+ 指标。

## 7. Agents List

使用 TanStack Table。

列：
- Agent
- Active Version
- Model Policy
- Tools
- Last Run
- Status
- Updated At
- Actions

顶部仅保留：
- 状态 Filter
- `Create Agent`

不放冗余搜索框；数据较多后再加入紧凑搜索能力。

分页固定在表格底部，支持 10 / 20 行切换；页数多时允许跳页。

## 8. Agent Detail

顶部 Header：

```text
Coding Agent                 [Published v1.4.2] [Run] [New Version]
Fix and maintain repositories
```

状态摘要：
- Active Version
- Model
- Tool Count
- 24h Runs
- Success Rate

Tabs：

### Overview
左侧：Agent Description / Engine（如 pi）  
右侧：Model Policy / Skills / Tools / Budget / Approval summary

### Versions
版本时间线 / 表格：Draft / Published / Deprecated。

发布是显式动作；Published 版本只读。

### Runs
只显示当前 Agent 的 Run。

### Models / Tools / Policies
展示绑定关系，不复制全局管理页面。

## 9. Version Editor

建议使用两栏：

```text
┌──────────────────────┬─────────────────────────┐
│ Instructions / Skills │ Effective Configuration │
│ (Prompt / Reference)  │ Engine (如 pi)           │
│                       │ Model Policy             │
│ Markdown/textarea     │ Skills                   │
│                       │ Tools (Built-in / MCP)   │
│                       │ Budget / Approval        │
└──────────────────────┴─────────────────────────┘
                           [Save Draft] [Publish]
```

Version 编辑的内容即 Agent Version Manifest（docs/AGENT_CAPABILITY_MODEL.md §7）；发布后只读。

Tools 区域中管理员选择的是具体 ToolVersion；UI 默认展示最新可选版本并明确版本号：

```text
GitHub MCP

☑ create_pull_request
   Version: 7
   Schema updated: 2026-09-25
```

Agent Version 已 Published 时，ToolVersion 选择必须只读。

不要做复杂低代码画布。v1 的核心是可靠版本化，不是视觉编排。

## 10. Runs List

列：
- Run ID / Task Title
- Agent
- Version
- Status
- Duration
- Token
- Cost
- Started At

状态：
- Running
- Waiting Approval
- Completed
- Failed
- Cancelled

Waiting Approval 必须有明显但不夸张的视觉提示。

## 11. Run Detail — 核心页面

推荐三栏但保持主区域优先：

```text
┌────────────────────────────────────────────────────────┐
│ Run Header: Status / Agent / Version / Duration / Cost │
├────────────────────────────────┬───────────────────────┤
│ Execution Timeline             │ Context Inspector     │
│                                │                       │
│ User Input                     │ Step Detail           │
│ ↓                              │ Model                 │
│ Model Call                     │ Tokens                │
│ ↓                              │ Tool Arguments        │
│ Tool Call                      │ Policy Decision       │
│ ↓                              │ Trace IDs             │
│ Approval                       │                       │
│ ↓                              │                       │
│ Completed                      │                       │
└────────────────────────────────┴───────────────────────┘
```

右侧 Inspector 可折叠，并允许打开多个 Tab：
- Step Detail
- Prompt / Messages
- Tool Request / Result
- Policy Decision
- Raw Event

时间线节点颜色只表达状态，不做彩虹色。

## 12. Approvals

这是治理平台的关键页面。

卡片/表格字段：
- Agent
- Run
- Requested Action
- Risk Level
- Resource
- Requested At
- Expires At
- Status

点击后打开 Drawer：

```text
Requested by: Coding Agent / Run #1042
Action: git.push
Resource: org/repo branch feat/login
Arguments digest: ...
Policy: production-write-approval

[Reject] [Approve]
```

必须明确：批准的是“本次精确请求”，不是给 Agent 永久放权。

## 13. Tools

Tools 页面顶部使用二级 Tab，不新增一级菜单：

```text
[Tool Registry] [MCP Servers]
```

### Tool Registry

Tool List：
- Name
- Provider（BUILTIN / MCP / HTTP）
- Risk Level
- Used By Agents
- Status

Tool Detail：
- Input Schema
- Provider / Executor
- Version / Checksum
- Default Risk
- Policy references
- Recent Calls

`builtin.*` 由 Runtime 注册，同样产生 ToolVersion；MCP Tool 由 MCP Server sync 产生。Schema 变化生成新 ToolVersion，历史 Versions 保持可查询、可绑定选择。

### MCP Servers

MCP Server List：
- Name
- Transport
- Status
- Tool Count
- Last Sync
- Credential Status
- Actions

Actions：
- Connect MCP Server
- Sync Tools
- Disable
- View Tools
- Settings

MCP Server Detail 自上而下：

```text
基本信息
↓
连接状态
↓
最近同步结果
↓
当前暴露的 Tools
↓
每个 Tool 的最新 ToolVersion
↓
历史 Versions
```

Secret 只显示“已配置/未配置”，永不回显。

## 14. Models

分成：
- Model Catalog
- Model Policies

Model Policy Detail 显示：

```text
Primary Route
Fallback Routes
Max Tokens / Call
Retry
Timeout
Budget behavior
```

不要把 provider API key 和普通模型配置混在一张表单。

## 15. Policies

MVP 不做代码编辑器式 DSL 页面。

采用结构化 Rule Builder：

```text
WHEN Subject = Agent: coding-agent
AND  Action = tool.invoke
AND  Tool = git.push
AND  Resource.environment = production
THEN REQUIRE_APPROVAL
```

同时提供只读 JSON Preview，便于工程师核对实际规则。

## 16. Audit

表格：
- Time
- Actor
- Operation
- Resource
- Result
- Correlation ID

点击行显示详细 metadata Drawer。

## 17. 组件规范

### Card
- 12–16px radius
- 边框优先于阴影
- Hover 轻微，不漂浮

### Button
- Primary 只用于页面主要动作
- Destructive 仅用于真实不可逆/高风险操作
- 同一视图最多一个主 Primary Action

### Table
- Header 固定语义，不使用过度背景色
- 行高约 44–48px
- 状态用 Badge

### Drawer
用于：
- 详情查看
- Approval
- Tool Call / Policy Detail
- 高级设置

### Modal
只用于：
- 删除确认
- Publish / Rollback 的最终确认
- 短表单

复杂配置不要塞进 Modal。

## 18. 文案规范

使用明确状态和动作：
- `Waiting for approval` 而不是 `Pending action`
- `Publish version` 而不是 `Deploy config`
- `Policy blocked this action` 而不是 `Something went wrong`

错误提示必须能回答：发生了什么、为什么、下一步能做什么。

## 19. 响应式

主要目标是 Desktop：≥ 1280px。

1024–1279px：折叠侧栏。  
< 1024px：保证查看和审批能力，但不要求完整配置编辑体验。

## 20. 前端 Stage 01 验收

在连接后端之前，必须用 Mock Data 完成以下可点击页面：
- Overview
- Agents List
- Agent Detail
- Version Editor
- Runs List
- Run Detail
- Approvals
- Tools / Models / Policies 基础页面

确认信息架构和交互后再进入 Control Plane 后端实现，避免 API 和页面同时反复变化。
