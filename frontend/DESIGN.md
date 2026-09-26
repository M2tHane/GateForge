# DESIGN.md — GateForge Web Console

## 1. 设计目标

GateForge 对用户呈现两个体验层：

1. **Employee Workspace（默认主体验）**：普通员工的“日常 AI 工作空间”——新建会话（Conversation）、新建任务（Task）、My Agents、Skills。界面轻量、对话式、上手零配置。
2. **Administration / Governance（管理员体验）**：Agent Control Plane——Models、Tools / MCP、Skill Categories、Policies、Approvals、Teams / Members、Budgets、Audit。界面克制、结构化、状态优先。

整体采用蓝白、克制、清晰、低噪音的视觉；优先展示“当前状态、风险、运行结果和下一步动作”，复杂配置进入详情页、Drawer 或 Settings。治理入口不挤占普通员工的日常导航。

## 2. 设计原则

1. **Workspace 优先**：普通员工打开产品第一眼是“新建会话 / 新建任务”，不是治理面板。
2. **状态优先**：Agent 是否可用、Task 当前 Run 是否异常、是否有待审批动作，第一眼可见。
3. **控制面分层**：Agent 的 Version、Model、Skills、Tools、Policy、Budget、Release 在 Agent Detail / Administration 中结构清晰，不混入聊天流。
4. **Trace 可读**：Task 聊天流只显示人类可读的工具进度；完整 Tool Request / Result / Trace / Raw Event 放 Inspector。
5. **高风险动作显式**：Approve、Publish、Rollback、Disable 等必须有清楚的风险反馈。
6. **配置分层**：常用配置正文展示，低频高级配置放 Drawer / Settings。
7. **同一资源语义全局一致**：Scope（平台 / 团队 / 我的）、Agent 状态（可用 / 已停用）、Run 状态全站统一。

## 3. 技术栈

```text
Next.js / React / TypeScript
Tailwind CSS
shadcn/ui + Base UI
TanStack Query
TanStack Table（Administration 表格页）
React Hook Form + Zod
Recharts
Lucide React
```

## 4. 信息架构

```text
Employee Workspace Shell（所有用户默认）
├── 新建会话（Conversation）
├── 新建任务（Task）
├── Agents（Personal Agent Card Grid）
│   └─ Agent Detail
│       ├─ 概览
│       ├─ 版本
│       ├─ Skills
│       ├─ Tools
│       ├─ 历史任务
│       └─ 设置
├── Skills
├── 我的审批
├── 管理员（仅管理能力可见 → 进入 Administration Shell）
├── 更多 / 设置
├── History（全部 / 任务 / 会话 过滤；紧凑单行列表，updatedAt 倒序，不分组）
└── 多标签页主区域（Conversation / Task Tab）

Administration Shell（独立侧边栏，经「管理员」进入）
├── Models
├── Tools / MCP Servers
├── Skill Categories
├── Policies
├── Approvals
├── Teams
└── Audit
```

说明：Workspace Agent Templates 由 Workspace Admin 在 Agents 页的“平台模板”视图管理；Workspace Skills 由 Workspace Admin 在 Skills 页“平台”Tab 管理（见 §10、§14）。Administration 不在 Employee Sidebar 内展开——「管理员」入口仅对具备管理能力的用户显示，点击后进入独立的 Administration Shell。Employee Workspace = 员工工作，Administration = 企业治理，两套信息架构不混在同一根 Sidebar 中。

## 5. App Shell

### 5.1 左侧导航（普通 Employee）

宽度 248–264px，可折叠。

```text
GateForge（Logo）

[＋ 新建会话]
[＋ 新建任务]

──────────────

Agents
Skills

──────────────

我的审批（待审批数角标）
管理员（仅管理能力可见）
更多 / 设置

──────────────

[全部] [任务] [会话]

修复登录超时        [🤖]
Spring Security 原理 [💬]

──────────────

用户信息 · Admin 视角开关
```

- `＋ 新建会话`：点击立即进入新的聊天工作区。
- `＋ 新建任务`：左侧第二个固定入口，点击进入 New Task Composer（尚未持久化的新建任务界面，见 §7.1）。
- 历史记录统一展示 Conversation + Task：**紧凑单行列表**，按 `updatedAt` 倒序混排，**不按 今天 / 昨天 / 更早 分组**（§21）。
- 历史顶部的 `[全部] [任务] [会话]` 是 UI View State 过滤（默认全部）：全部 = Conversation + Task 混排，任务 = 只显示 Task，会话 = 只显示 Conversation；只过滤视图，不改业务数据模型。
- **不默认显示** Overview / Runs / Tools / Models / Policies / Audit——这些治理入口在 Administration Shell，不挤占员工日常导航。
- `管理员` 是 Administration 的唯一入口：点击进入独立 Administration Shell（§5.4），不在本 Sidebar 内展开治理子模块。
- 不展示搜索框和用户资料大卡片。

历史 item 样式（§21）：**单行**，标题过长 ellipsis 截断，类型图标固定在行尾（不占第二行，不会被标题挤掉）：

Conversation item：`Spring Security 原理 [💬]`——行尾为统一的「会话」图标（hover Tooltip：会话）。

Task item：`修复登录超时 [🤖]`——行尾为该 Task 所属 Agent 的 Avatar（hover Tooltip：Agent 名，如 Coding Agent）。Task 必须带 Agent Avatar，让员工快速知道是哪个 Agent 在做这个任务。

### 5.2 顶部：多标签页 Tab Bar

Conversation / Task 点击后在主区域打开 Tab，顶部类似 IDE：

```text
[Spring Security ×] [修复登录 Bug ×] [Review PR128 ×] [+]
```

- Tab 对应 **Conversation / Task**，不是 Agent。同一个 Agent 可以同时有多个 Task（修复登录 Bug / OAuth 开发 / Redis 优化），不能用 Agent 作为 Tab 唯一身份。
- Tab 切换不得丢失：Conversation Context、Task Context、scroll state、draft input。
- MVP Tab 打开状态由前端 Local State / LocalStorage 保存，不要求后端持久化 UI Tab。

### 5.3 顶部栏

高度 56px 左右：Breadcrumb、当前页面主要 Action、可选状态提示。不放全局搜索框。

### 5.4 Administration Shell

Administration 不在 Employee Sidebar 内展开。具备管理能力的用户（Workspace Admin / 授权角色；Stage 01 mock 以 Admin 视角开关模拟）在 Sidebar 辅助入口看到唯一的「管理员」入口，点击直接进入 `/admin/models` 的独立 Administration Shell：

```text
GateForge Admin
──────────────
模型
工具 / MCP 服务
技能分类
策略
审批
团队
审计
──────────────
用户信息 · 返回工作区
```

- 独立左侧栏承载 7 个治理模块入口，当前项高亮（active 跟随路由）。
- 不包含员工侧元素：无 History、无 Agents / Skills 主导航、无多标签 Tab Bar。
- 无管理能力的用户直接访问 `/admin/*` 时只显示权限提示与返回工作区入口。
- Employee Workspace = 员工工作；Administration = 企业治理。两套信息架构不混在同一根 Sidebar 中。

## 6. Conversation Workspace（新建会话）

点击 `＋ 新建会话` 立即进入新的聊天工作区，无需任何前置配置。

消息输入框：

```text
┌─────────────────────────────────────────────┐
│ [GPT-5.2 ×] [Code Review ×]                 │
│ 输入消息...                                 │
│                                             │
│ [GPT-xxx ▼]    技能                 [发送]  │
└─────────────────────────────────────────────┘
```

- **Model Selector**：候选来自“我当前允许使用哪些模型”（Effective Capability 内的 Model Policy / logical model），不是 Provider 配置。
- **技能**：唤起统一 Skill Picker（见 §8），选中的 Skill 注入当前 Conversation 上下文；输入框上方以 Skill Chip 展示已导入技能（`名称 ×`，可单个移除，**不显示版本号**，§21）。内部实现保留 `/skill` 命令兼容，但 UI 不再展示 `/skill`。
- 多轮对话；中途切换默认 Model：历史消息不改变，只影响后续调用。
- Conversation 保存 defaultModelPolicyId；每条 Assistant 消息记录实际使用的 modelPolicy / provider / model / usage。
- 已导入 Skill 绑定 exact SkillVersion：平台 Skill 后续更新不会静默改变进行中的 Conversation。
- Conversation Skill 只影响上下文：不获得 Tool 权限、不修改 Agent、不创建 Agent、不修改 Policy / Approval。
- 右侧 Inspector 默认隐藏或保持极简。
- MVP Conversation 不执行 Tool。

## 7. Task Workspace（新建任务）

Task 有两个必须区分的状态：**New Task Composer**（尚未持久化，Task 创建前）与 **Existing Task Workspace**（Task 已创建）。Agent 固定属于 Task：创建时选择，创建后不可更换。

### 7.1 New Task Composer（Task 创建前）

点击 `＋ 新建任务` 进入一个**尚未持久化**的 New Task Composer。Agent 选择以 **Agent Chip** 呈现在输入框上方（与 Skill Chip 同一组件语言，§21）：

```text
┌──────────────────────────────────────────────┐
│ [选择 Agent]        ← 未选择时为虚线 chip 入口 │
│ [🤖 Coding Agent ×] ← 选择后显示，× 可取消     │
│ 输入任务指令...                              │
│                                              │
│                                      [发送]  │
└──────────────────────────────────────────────┘
```

- **Agent 选择只存在于 New Task Composer**。候选只显示：
  - 当前用户的 Personal Agent（owner = 当前用户）
  - `status = ENABLED`（可用）
  - 存在 Published Version
  - 当前 Published Version 的 Effective Capability 仍然有效
- 选择后 Agent Chip 只显示 `Agent Avatar + Agent Name`，**不显示版本号**（§21）；exact agentVersionId 在发送创建时绑定。
- Chip 上的 `×` 仅在 **Task 创建前** 可取消当前选择；这是全站唯一允许移除 Agent 的位置。
- MVP 只允许选择一个 Agent；不出现 Add Agent / Agent Team / Supervisor / Multi-Agent。
- **第一次发送消息时才持久化**：

```text
POST /api/tasks
↓
固定 agentId
↓
固定 exact agentVersionId
↓
创建 Task
↓
创建 Run #1
```

### 7.2 Existing Task Workspace（Task 创建后）

Task 一旦创建，即固定 `agentId` + exact Published `agentVersionId`；输入框上方的 Agent Chip 变为**只读身份展示**：

```text
┌──────────────────────────────────────────────┐
│ [🤖 Coding Agent]   ← 只读 Chip：无 ×、不可切换 │
│ 继续告诉 Agent...                            │
│                                              │
│                                      [发送]  │
└──────────────────────────────────────────────┘
```

- **不显示 ▼、不显示 ×**；不提供 Switch Agent，不提供 Switch Agent Version，不显示版本号（§21）。
- Chip 仅展示 Agent Avatar + Agent Name。语义上该 Task 永远使用创建时固定的 exact AgentVersion——即使之后 Coding Agent 发布了新版本；精确版本号可在执行详情 / 管理与审计场景查看。
- Task = 一个固定 Agent 工作上下文。如果用户想换 Agent，应该 `＋ 新建任务`，而不是改变已有 Task。
- MVP 不做 Upgrade Task Agent Version；未来如果增加升级能力，必须是明确的显式操作，并单独做 ADR / 产品设计。

### 7.3 执行规则（不变）

- Task 创建时固定该 Agent 的 exact Published AgentVersion；不自动跟随 Agent 后续新版本。
- 每条新用户指令 → 新 Run（Run #1、Run #2…）；Approval 批准后恢复**同一个 Run**。
- Task 状态只有 ACTIVE / ARCHIVED；执行状态从 Current Run 派生（聊天流顶部轻量展示当前 Run 状态：Running / Waiting Approval / Completed…）。

### 7.4 Inspector（右侧栏）

Task 的右侧 Inspector 可展开，Tabs：

```text
[运行] [文件] [工具] [链路] [审批]
```

- **运行**：当前与历史 Run 列表、状态、耗时、Token / Cost。
- **工具**：完整 Tool Request / Result、Policy Decision。默认视图为**人类可读摘要**（如「工具 / 内容搜索 / 允许 / 成功 / 在 src/ 中搜索 findUserOrders / 在 4 个文件中找到 5 处匹配」）；原始 Tool ID、toolVersionId、provider enum、raw args / result 放入默认收起的「技术详情」折叠区（§21）。
- **链路**：执行时间线与 Raw Event（完整 Run Trace 不塞进聊天流）。
- **审批**：待审批动作可直接处理（拒绝 / 批准），展示“批准的是本次精确请求”。
- 聊天流中只显示简洁、人类可读的 Tool / Progress 信息（如“正在读取 src/auth/…”、“git.push 等待审批”）。

Conversation 的 Inspector 默认隐藏；Task 的 Inspector 默认展开（可收起）。

## 8. Skill Picker（统一组件）

Agent Editor 和 Conversation「技能」按钮必须复用同一个 Skill Picker。使用大型 Drawer：

```text
┌──────────────────────────────────────────────────┐
│ 选择技能                              [完成 3]   │
├──────────────────────────────────────────────────┤
│ [平台] [团队] [我的]                            │
├──────────────┬───────────────────────────────────┤
│ 全部         │                                   │
│ 开发         │ ☑ Java Backend                    │
│ 设计         │ ☑ Code Review                     │
│ 测试         │ ☐ UI Design                       │
│ 数据         │                                   │
│ 运维         │                                   │
└──────────────┴───────────────────────────────────┘
```

- Scope Tab（平台 / 团队 / 我的）+ 左侧 Category 过滤（全部 / 开发 / 设计 / 测试 / 数据 / 运维…）。
- 支持多选；显示已选数量；候选来自 Effective Capability。
- MVP 不做 Skill Marketplace。

## 9. Agents 页面

Personal Agent **Card Grid**（不是 Table）。Desktop 每行 4 个 Card。

```text
┌────────────────────┐
│ Avatar             │
│ Coding Agent       │
│                    │
│ 创建：2026-09-26   │
│ ● 可用             │
│                    │
│ [停用]  [启动任务] │
└────────────────────┘
```

- Card 至少展示：Avatar、Agent Name、Created At、可用 / 已停用（ENABLED / DISABLED）、Primary Action。
- **左侧固定为生命周期动作，右侧为任务入口，不再使用三点菜单（§21）**：
  - DISABLED：左侧 `[启动]`，无右侧动作；
  - ENABLED：左侧 `[停用]`，右侧 `[启动任务]`（进入 New Task Composer 并预选该 Agent）。
  - 点击 启动 → status = ENABLED，按钮立即变为 停用 并出现 启动任务；点击 停用 → status = DISABLED，按钮立即变为 启动 且隐藏 启动任务。
- 不要把所有 Model / Tool / Token 信息塞进 Card；进入 Agent Detail 再看。
- 右上角：`[+ 创建 Agent]`。
- Workspace Admin 额外可见“平台模板”视图（管理 Workspace Agent Templates，复用 Card Grid + 创建流程，创建时 scope = WORKSPACE）。

## 10. Create Agent

Agents 页面右上角 `[+ 创建 Agent]` 进入创建选择页：

```text
┌─────────────────────────┐
│ 从模板创建              │
│ Workspace / Team        │
└─────────────────────────┘

┌─────────────────────────┐
│ 自定义 Agent            │
│ 从空白开始              │
└─────────────────────────┘
```

模板选择页：

- Scope Tab：`[平台] [团队]`。
- 模板以 Card 展示；选中模板后 Clone → Personal Agent Draft → 进入 Agent Editor。
- Clone 记录来源（sourceTemplateVersionId）；模板之后更新不影响该 Personal Agent。

## 11. Agent Editor

从模板 Clone 或自定义创建后进入。至少包含分区：

```text
基本信息 | Engine | Model | Skills | Tools | MCP Tools | Review
```

用户可配置：

- Name / Avatar / Description
- Engine（如 pi）
- Model（从允许的 Model Policy 候选集中选择）
- Skills（统一 Skill Picker；候选 = Effective Capability 内的平台 / 团队 / 我的 Skill）
- Allowed Built-in Tools
- Allowed MCP Tools（只能选择管理员已接入并授权的 MCP Tool；不能自己连接 MCP Server）

约束：

- 候选能力全部来自 Effective Capability；服务端强制校验。
- 用户不能输入 Model Provider Key（API Key / Endpoint Secret / Fallback Secret 均不可见）。
- 用户不能连接 MCP Server、不能绑定自己没有权限使用的 ToolVersion。
- 保存为 Draft → Publish 生成 Personal Agent Version v1；发布后该版本只读。

## 12. Agent Detail

```text
Coding Agent                     [启动任务] [创建新版本]
```

Tabs：

```text
概览 | 版本 | Skills | Tools | 历史任务 | 设置
```

- **概览**：Engine、Model、Skills、Tools、MCP Tools、Published Version、Status（可用 / 已停用）。
- **版本**：版本时间线（Draft / Published / Deprecated）。Published Version 只读；修改走 Published v1 → Clone Draft → 编辑 → Publish v2。
- **Skills / Tools**：当前 Published Version 冻结绑定的 exact SkillVersion / ToolVersion（展示版本号，不可变）。
- **历史任务**：该 Agent 的 Task 列表（点击打开对应 Task Tab）。
- **设置**：基本信息、启停（ENABLED / DISABLED）等。

## 13. Skills 页面

Skills 是普通员工左侧一级入口。

页面顶部 Scope Tab：

```text
[平台] [团队] [我的]
```

左侧 Category 导航：

```text
全部 / 开发 / 设计 / 测试 / 数据 / 运维 / ...
```

右侧 Skill Cards / List：

```text
┌────────────────────────┐
│ Java Backend           │
│ 开发 · 平台            │
│                        │
│ Spring Boot 开发规范   │
│                        │
│              [启用]    │
└────────────────────────┘
```

- Card 显示：名称、Category · Scope（开发 · 平台）、描述、Enablement 动作。
- 员工可以：查看平台 Skill、查看所在 Team Skill、查看自己的 Skill、Enable / Disable 可访问 Skill、Clone 平台 / 团队 Skill、创建 Personal Skill。
- Clone = Snapshot Copy（记录 sourceSkillVersionId）；源 Skill 后续更新不影响 Personal Skill Clone、已 Published 的 AgentVersion 或已绑定的 Conversation。
- 右上角 `[+ 创建 Skill]`：从模板创建 / 从空白创建；普通员工 Scope 固定 PERSONAL。
- Workspace Admin 在“平台”Tab 获得管理动作（创建 / 发布 / 停用 Workspace Skill，scope = WORKSPACE）；Skill 本体的 Category 归属由 Administration → Skill Categories 管理。

## 14. Model 用户体验（Employee 视角）

- Model Provider / Credential 全部由 Admin 控制；员工看不到 Provider 配置页。
- 员工看到的是“我当前允许使用哪些模型”（Conversation Model Selector、Agent Editor Model 分区共用 `/api/me/model-candidates`）。
- Agent 创建时 Model 选择实际绑定当前允许的 ModelPolicy / logical model。
- Employee 永远不能编辑 API Key / Provider Endpoint Secret / Fallback Secret。

## 15. My Approvals / More

- Task Workspace Inspector → Approval 可直接处理自己 Task 中的审批。
- More 中提供 **My Approvals**：聚合与当前用户 Task 相关的待审批。
- Admin / 授权 approver 在 Administration → Approvals 处理治理范围审批。
- UI 是否显示按钮不作为授权依据；权限仍由 Approval Service 控制。

## 16. Administration 页面

以下页面从“所有用户的主导航”移动到 Administration / Governance，保留原设计中仍然合理的部分。它们挂在独立的 Administration Shell 侧边栏下（见 §5.4）。

### Overview

目标：10 秒内判断平台是否正常。

```text
[Active Agents] [Running Runs] [Pending Approvals] [24h Cost]

[Run Success Rate / 7d]       [Token & Cost / 7d]

Pending Approvals
- Agent / Action / Risk / Waiting / Approve

Recent Runs
- Run / Task / Agent / Status / Duration / Cost / Time
```

卡片数量控制在 4 个 KPI。

### Teams / Members

Team 列表（名称、成员数、Team Admin）、Team Member 管理、Team Policy / 能力范围配置入口。

### Models

分成 Model Catalog 与 Model Policies。Model Policy Detail 显示 Primary Route / Fallback Routes / Max Tokens / Retry / Timeout / Budget behavior。不要把 provider API key 和普通模型配置混在一张表单。

### Tools

二级 Tab：`[Tool Registry] [MCP Servers]`。

- Tool Registry：Name / Provider（BUILTIN / MCP / HTTP）/ Risk Level / Used By Agents / Status；Detail 显示 Input Schema、Provider / Executor、Version / Checksum、Policy references、Recent Calls。
- MCP Servers：Name / Transport / Status / Tool Count / Last Sync / Credential Status；Actions：Connect / Sync Tools / Disable / View Tools / Settings。
- `builtin.*` 由 Runtime 注册，同样产生 ToolVersion；MCP Tool 由 sync 产生；Schema 变化生成新 ToolVersion，历史 Versions 保持可查询。
- Secret 只显示“已配置 / 未配置”，永不回显。

### Skill Categories

Category 列表（名称、描述、图标、排序、状态、Skill 数量）与增改管理。仅 Workspace Admin；普通用户只读。

### Policies

结构化 Rule Builder：

```text
WHEN Subject = Agent: coding-agent
AND  Action = tool.invoke
AND  Tool = git.push
AND  Resource.environment = production
THEN REQUIRE_APPROVAL
```

提供只读 JSON Preview。不做代码编辑器式 DSL 页面。

### Approvals

治理视角的审批列表（区别于 §15 的 My Approvals）。卡片 / 表格字段：Agent、Task、Run、Requested Action、Risk Level、Resource、Requested At、Expires At、Status。点击打开 Drawer：

```text
Requested by: Coding Agent / Task 修复登录 Bug / Run #1042
Action: git.push
Resource: org/repo branch feat/login
Arguments digest: ...
Policy: production-write-approval

[Reject] [Approve]
```

必须明确：批准的是“本次精确请求”，不是给 Agent 永久放权。

### Budgets

Budget Policy 列表与用量视图（沿用现有预算页面设计）。

### Audit

表格：Time / Actor / Operation / Resource / Result / Correlation ID。点击行显示 metadata Drawer。

## 17. 组件规范

### Card
- 12–16px radius
- 边框优先于阴影
- Hover 轻微，不漂浮

### Button
- Primary 只用于页面主要动作
- Destructive 仅用于真实不可逆 / 高风险操作
- 同一视图最多一个主 Primary Action

### Table
- 用于 Administration 列表页；Header 固定语义，不使用过度背景色
- 行高约 44–48px
- 状态用 Badge

### Drawer
用于：Skill Picker、详情查看、Approval、Tool Call / Policy Detail、高级设置。

### Modal
只用于：删除确认、Publish / Rollback 的最终确认、短表单。复杂配置不要塞进 Modal。

### Tabs
- 页面级 Tabs（Agent Detail）与 Workspace Tab Bar（§5.2）语义不同，不复用样式。

## 18. 文案规范

使用明确状态和动作：

- Scope：`平台`（WORKSPACE）/ `团队`（TEAM）/ `我的`（PERSONAL）
- Agent 状态：`可用` / `已停用`（不使用 Running / Stopped）
- Agent 生命周期动作：`启动` / `停用`（卡片与详情页一致）
- `等待审批` 而不是 `Pending action`
- `发布版本` 而不是 `Deploy config`
- `策略拦截了该动作` 而不是 `Something went wrong`

错误提示必须能回答：发生了什么、为什么、下一步能做什么。

**中文化约定（§21）**：

- 用户可见的界面文案默认中文。导航 / Tab / 区块标题一律中文：执行详情、运行、文件、工具、链路、审批、模型、策略、团队、审计、技能分类、工具 / MCP 服务、更多 / 设置。
- 以下专有名词保留英文原文，不做机械翻译：MCP、API、HTTP、JSON、ID、Token、Git、Java、TypeScript、模型名称（GPT-5.2 等）、Tool 的真实技术参数值、文件路径 / command / raw data；Agent、Skill 作为资源名词内嵌在中文句子中保留（如「选择 Agent」「克隆 Skill」）。
- 版本号只在管理 / 审计场景展示（Agent Detail 版本页、执行详情技术详情、审计）；日常使用界面（会话 Skill Chip、任务 Agent Chip、技能选择器、New Task Composer）**不显示版本号**——后台仍保持 exact version 绑定，只是 UI 不展示。
- 用户可见的选择框一律使用自绘 SelectMenu / Dropdown，**禁止浏览器原生 `<select>` 外观**。

## 19. 响应式

主要目标是 Desktop：≥ 1280px。

1024–1279px：折叠侧栏与 Inspector。
< 1024px：保证查看、聊天和审批能力，不要求完整配置编辑体验。

## 20. 前端 Stage 01 验收

在连接后端之前，必须用 Mock Data 完成完整 Employee Workspace（优先级最高），Administration 仅保留基础可点击骨架。

Employee Workspace 必须可点击演示：

1. 新建会话
2. Conversation 多轮聊天
3. Model Selector
4. /skill Picker
5. 新建任务
6. Agent Selector（New Task Composer 选择 Agent 并显示 Agent + Version；发送后创建 Task 并固定；Existing Task 只读展示固定 Agent · Pinned Version，无 ▼ / 无 Switch Agent）
7. Task 多轮工作会话
8. Task → Run 状态展示
9. 多 Conversation / Task Tabs
10. 左侧 History List
11. Agents 四列 Card Grid
12. Create Agent
13. Workspace / Team Template Picker
14. Template → Personal Agent Draft
15. Agent Editor
16. Agent Publish
17. Agent Detail
18. Skills 页面
19. 平台 / 团队 / 我的 Tabs
20. Category Filter
21. Create Skill
22. Workspace / Team Skill → Personal Skill Clone
23. Skill Picker 多选
24. Task Inspector
25. Approval Mock Flow

Administration 基础骨架（优先级低于 Employee Workspace）：Models、Tools / MCP、Skill Categories、Policies、Approvals、Teams、Audit。

确认信息架构和交互后再进入 Control Plane 后端实现，避免 API 和页面同时反复变化。

## 21. Post-Gate UX Polish（2026-09-26，第二轮收口）

Gate 通过后的 UI / UX 收口（只做 UI Compression / Localization / Interaction Polish / Component Consistency，不改任何业务语义：Task Agent Immutable、New instruction → New Run、Approval Resume → Same Run、exact version 绑定全部保持）：

1. **History 紧凑列表**：不再按 今天 / 昨天 / 更早 分组；单一连续列表按 `updatedAt` 倒序；保留 全部 / 任务 / 会话 过滤。
2. **History Item 单行**：标题 ellipsis 截断，类型图标固定在行尾——Conversation 为统一「会话」图标，Task 为所属 Agent 的 Avatar；hover Tooltip 显示类型 / Agent 名。
3. **Agent Card 动作**：左侧永远是生命周期动作（DISABLED → 启动；ENABLED → 停用），右侧仅在 ENABLED 时显示 启动任务；删除三点菜单。
4. **`/skill` → 技能**：所有用户可见的 `/skill` 按钮改为「技能」；空状态引导改为「点击“技能”添加技能」；内部命令兼容保留，UI 不再展示。
5. **日常使用隐藏版本号**：会话 Skill Chip、任务 Agent Chip、技能选择器、New Task Composer 候选均不显示版本；版本仅在 Agent Detail / 版本页 / 执行详情 / 审计可见。数据层 exact SkillVersion / AgentVersion / ToolVersion 绑定不变。
6. **Agent Chip / Skill Chip 统一组件语言**：共用 Chip 组件（圆角胶囊 + 尾部 ×）。× 仅允许出现在 New Task Composer（Task 尚未创建）——Existing Task 的 Agent Chip 只读、无 ×、不可切换。
7. **Administration / Inspector 中文化**：Admin Shell 七个模块入口与各管理页标题、表头、抽屉标签全部中文；Inspector 更名「执行详情」，Tabs 为 运行 / 文件 / 工具 / 链路 / 审批。
8. **工具调用人类可读展示**：Built-in Tool 显示中文名（builtin.read→读取文件、builtin.glob→文件查找、builtin.grep→内容搜索、builtin.edit→编辑文件、builtin.write→写入文件、builtin.bash→执行命令）；BUILTIN→内置工具、ALLOW→允许、DENY→拒绝、REQUIRE_APPROVAL→需要审批、SUCCESS→成功、FAILED→失败。默认视图为中文摘要（如「在 src/ 中搜索 findUserOrders」）；原始 Tool ID / toolVersionId / raw args 放默认收起的「技术详情」折叠区。底层 Tool ID 不变。
9. **禁止原生 Select**：全部用户可见选择框使用自绘组件（共享 SelectMenu / Dropdown / Popover），统一圆角、边框、hover、focus、选中态；不使用浏览器默认 `<select>` 外观。
10. **文案规范**：见 §18 中文化约定（普通 UI 中文 + 专有名词保留 + 版本号展示边界）。
