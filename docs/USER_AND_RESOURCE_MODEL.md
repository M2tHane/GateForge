# User & Resource Model — Workspace / Team / User / Agent / Skill / Conversation / Task / Run

本文档是 GateForge v1.2 / v1.2.1 中以下内容的**唯一详细定义**：

- Workspace / Team / User
- Resource Scope（WORKSPACE / TEAM / PERSONAL）
- Role（Workspace Admin / Team Admin / Team Builder / Employee / Auditor / Operator）
- Effective Capability（Multi-Team 解析模型）
- Agent Ownership / Agent Template Clone / Personal Agent
- Skill Ownership / SkillVersion / Skill Template Clone / Skill Category
- Conversation / Task / Run 及三者关系

其他文档引用这些概念时以本文为准；发生冲突时按 DEVELOPMENT_GUARDRAILS 的 Source of Truth 顺序处理。底层执行与安全架构（Runtime Core / AgentEngine / Model Gateway / Tool Gateway / ToolVersion 语义）已在 v1.1.1 冻结，本文不改变它们。

## 1. Workspace / Team / User

```text
Workspace                # 一个企业 / 公司级隔离边界（唯一租户边界，不为 Organization 另建平行体系）
└── Team
    └── User
```

- Workspace 是唯一的企业级隔离边界；跨 Workspace 资源不允许关联。
- Team 是 Workspace 内部的组织与授权单元；Team 只属于一个 Workspace。
- 一个 User 可以属于一个或多个 Team；一个 User 至少通过 Membership 属于一个 Workspace。
- 不引入 Organization 层级，不做复杂组织树（见 PRD 非目标）。

## 2. Resource Scope

所有用户可见资源统一使用三个 Scope：

```text
WORKSPACE   # Workspace 级资源（管理员发布）
TEAM        # Team 级资源（Team Admin 发布，仅本 Team 可见）
PERSONAL    # 个人资源（ownerUserId 所有）
```

UI 文案映射：

```text
WORKSPACE → 平台
TEAM      → 团队
PERSONAL  → 我的
```

注意：

- 数据库 / API 中 Scope 枚举固定为 `WORKSPACE | TEAM | PERSONAL`；**不使用 PLATFORM 作为数据库 Scope**，避免与 GateForge Platform 本身产生歧义。“平台”只是 UI 文案。
- Scope 与 Skill Category 是两个完全不同的维度（见 §8）。

## 3. Role

### 3.1 命名：Workspace Admin

Workspace = 一个企业 / 公司级隔离边界。因此企业内部管理员正式命名为 **Workspace Admin**（稳定枚举 `WORKSPACE_ADMIN`），不再使用 Platform Admin / `PLATFORM_ADMIN`——后者容易与 GateForge 平台级超级管理员混淆。

关于 GateForge 平台级管理员：当前产品是单个 GateForge 部署承载多个 Workspace，但 v1 不实现 SaaS Platform Administration；**WORKSPACE_ADMIN 是当前企业治理的最高业务角色**。未来若真的需要 SYSTEM_ADMIN / PLATFORM_OPERATOR 管理 GateForge 部署层，另做设计（ADR），不混入当前角色模型。

### 3.2 角色定义

MVP 定义六类角色（内部稳定枚举）：

| 角色 | 稳定枚举 | 说明 |
|---|---|---|
| Workspace Admin | `WORKSPACE_ADMIN` | 企业（Workspace）级管理员，当前企业治理的最高业务角色 |
| Team Admin | `TEAM_ADMIN` | Team 级管理员 |
| Team Builder | `TEAM_BUILDER` | Team Agent Template / Team Skill 构建者 |
| Employee | `EMPLOYEE` | 普通员工，产品的主体用户 |
| Auditor | `AUDITOR` | 只读审计 |
| Operator | `OPERATOR` | 运行 / 运维相关受控权限 |

UI 文案映射（中文界面可以保持业务名称，不要求处处展示枚举）：

```text
WORKSPACE_ADMIN → 管理员
TEAM_ADMIN      → 团队管理员
TEAM_BUILDER    → 团队构建者
EMPLOYEE        → 员工
AUDITOR         → 审计员
OPERATOR        → 运维人员
```

### 3.3 各角色职责

#### Workspace Admin 控制

- Workspace Settings
- Teams / Members
- Approved Models / Model Policies
- Tool Registry / MCP Servers
- High-risk Tool Policy / Global Policy（Workspace Policies）
- Budget
- Skill Categories
- Workspace Agent Templates
- Workspace Skills

#### Team Admin 控制

- Team Members
- Team Resources（Team Agent Template / Team Skill）
- Team Policy（Team 成员允许的能力范围）
- Team 范围配置

#### Team Builder 可以

- 创建 / 维护 Team Agent Template
- 创建 / 维护 Team Skill
- **不必拥有** Team Member 管理权限（这是与 Team Admin 的关键区别）

#### Employee 可以

- 创建自己的 Personal Agent
- 从 Workspace / Team Agent Template 创建 Agent（Clone）
- 创建自己的 Personal Skill
- Clone Workspace / Team Skill
- 使用允许的 Model（经 Model Policy）
- 选择允许的 Built-in Tool / MCP Tool（经 Effective Capability）
- 创建 Conversation
- 创建 Task

#### Employee 不能

- 添加 Provider Secret（API Key / Endpoint Secret / Fallback Secret）
- 私自连接 MCP Server
- 创建 Skill Category
- 提升 Tool 权限
- 绕过 Workspace / Team Policy

#### Auditor / Operator

- Auditor：只读审计——查看运行 Trace、Tool Calls、Policy Decision、Approval、Token、Cost、Failure 和 Release 历史，不拥有管理写权限。
- Operator：运行 / 运维相关受控权限；不拥有 Workspace / Team 治理配置的管理权限。

### 3.4 角色存放

角色存放在 identity Domain 的 RoleBinding（Workspace 级：`WORKSPACE_ADMIN / AUDITOR / OPERATOR / EMPLOYEE`）与 TeamMember.role（`TEAM_ADMIN / TEAM_BUILDER / MEMBER`）中；角色只影响管理 API 授权，不改变 §4 的能力解析模型。MVP 不为这些角色提前实现复杂企业 IAM，仍使用 Membership / TeamMembership / RoleBinding 等当前简单模型。

## 4. Effective Capability

### 4.1 Effective Capability 不是简单四集合全局交集

Effective Capability **不应被理解为**把"用户所属所有 Team 的 Policy"与 Workspace Policy / User Permission / Agent Configuration 做全局交集。

Team 是 **资源来源 + 授权域**，不是全部 Membership Policy 的全局求交集。一个 User 可以属于多个 Team；不同 Team 开放的能力不同，用户可以组合各 Team 各自合法授予的资源。把用户所属的所有 Team Policy 直接全局求交集是**错误语义**：它会让多 Team 用户连每个 Team 各自合法的能力都无法使用。

正确表达：

```text
Workspace Boundary
∩ User Permission
∩ Agent Configuration
∩ Applicable Team Grants
= Effective Capability
```

其中 **Applicable Team Grants** 是"按资源来源逐个成立的 Team 授权"（见 §4.3），不是一个把所有 Team Policy 合并/求交后的全局集合。

### 4.2 解析模型

1. Workspace Policy 定义企业级最大边界。
2. User Permission 定义主体本身允许范围。
3. 对每个候选资源按 Scope 校验：
   - **WORKSPACE Scope** → 校验 Workspace Policy；
   - **TEAM Scope** → 校验所属 Team Membership + Team Policy + Workspace Policy；
   - **PERSONAL Scope** → 校验 ownerUserId + Workspace Policy。
4. 通过的资源组成 **User Effective Candidate Set**。
5. Agent Configuration 从 Candidate Set 中选择子集。
6. Tool 真正执行时仍必须再次经过 Runtime Tool Gateway / Policy。

原则：**任何下层只能缩小能力，不能扩大能力。** Workspace Policy 始终是最高上限（见 §4.4）。

### 4.3 Team Resource 按来源 Team 独立授权

每一个 Team Scope Resource 都必须独立检查其**来源 Team**：

对 `resource.scope = TEAM` 且 `resource.teamId = X` 的资源，要求：

```text
currentUser ∈ X（Team Membership）
AND X 的 Team Policy 允许该资源
AND Workspace Policy 不禁止该资源
```

例：Personal Agent 想同时绑定 Backend Team 的 Java Backend Skill 与 Data Team 的 Database Skill，必须分别判断：

- Resource A：`scope = TEAM`，`teamId = backend-team` → currentUser ∈ backend-team AND backend-team policy allows this resource。
- Resource B：`scope = TEAM`，`teamId = data-team` → currentUser ∈ data-team AND data-team policy allows this resource。

两个判断分别通过后，Personal Agent 可以同时组合这两个 Team 合法授权的能力。因此 Personal Agent 可以组合：

```text
Workspace Resources
+ Team A Resources
+ Team B Resources
+ Personal Resources
```

前提是**每个资源都分别通过自己的 Scope / Membership / Policy 校验**。

禁止：因为用户同时属于 Team A 和 Team B，就先计算 `Team A Policy ∩ Team B Policy` 再授权。

### 4.4 Workspace Boundary 始终是最高上限

虽然不同 Team 的合法资源可以组合，但 Workspace Policy 始终是最高权限边界：

- Team 只能在 Workspace Boundary 内授予；**Team 不能提升 Workspace 权限**。
- **User 不能提升 Team / Workspace 权限**。
- **Agent Configuration 也只能继续缩小**。

例：Workspace Policy `DENY production-db.write`，即使 Data Team Policy `ALLOW production-db.write`，最终结果也必须是 **DENY**。

### 4.5 跨 Team 组合示例

张三同时属于：

- Backend Team
- Data Team

平台资源：GPT Coding Model（`scope = WORKSPACE`）。

- Backend Team 发布：Java Backend Skill、GitHub Tool（`scope = TEAM`，`teamId = backend-team`）。
- Data Team 发布：SQL Analysis Skill、Data Warehouse MCP Tool（`scope = TEAM`，`teamId = data-team`）。

张三的 Personal Agent 可以选择：

- GPT Coding Model（Workspace 资源：校验 Workspace Policy）；
- Java Backend Skill / GitHub Tool（TEAM 资源：张三 ∈ backend-team 且 Backend Team Policy 允许）；
- SQL Analysis Skill / Data Warehouse MCP Tool（TEAM 资源：张三 ∈ data-team 且 Data Team Policy 允许）。

因为**每项 Team Resource 分别验证对应 Membership / Team Policy**，Backend Team 与 Data Team 的能力不需要互相做交集；张三的 Personal Agent 可以同时组合这些 Team 合法授权的能力。

但如果 Workspace Policy 禁止 `production-db.write`，则无论 Data Team Policy 是否允许，张三的 Agent 都不能获得该能力（Workspace Boundary 是最高上限，见 §4.4）。

### 4.6 Effective Capability ≠ Tool Execution Authorization

Effective Capability 是运行时候选集的来源，**不是真正的 Tool Execution Authorization**。Tool 执行授权仍由每次调用时的统一执行链决定：

```text
ToolRequest
↓
Tool Gateway
↓
Policy
↓
ALLOW / DENY / REQUIRE_APPROVAL
```

补充示例（原则不变）：

- Workspace Policy 禁止 `production-db.write`，则 Team Policy / User Permission / Agent Configuration 都不能重新允许它。
- Team 未开放的 Model，其成员在任何 Personal Agent 中都不可选（该 Model 不进入 Candidate Set）。
- Agent Configuration 只能在其 owner 的 User Effective Candidate Set 范围内选择子集。

## 5. Agent Ownership：Personal Agent 与 Agent Template

### 5.1 核心区分

```text
Agent ≠ Agent Template
```

- 员工真正使用的是 **Personal Agent**（`kind = PERSONAL`）。
- Workspace 和 Team 提供的是 **Agent Template**（`kind = TEMPLATE`），它是创建 Personal Agent 的起点，不是共享运行实体。
- 不是所有员工共同修改同一个 Agent。

### 5.2 资源模型（复用 Agent / AgentVersion）

不为 Template 复制第二套 Version 系统。Agent 资源增加：

```text
Agent
├── kind      : PERSONAL | TEMPLATE
├── scope     : WORKSPACE | TEAM | PERSONAL
├── ownerUserId?                  # PERSONAL 必填
├── teamId?                       # TEAM scope 必填
├── status    : ENABLED | DISABLED
└── ...
```

约束：

| 类型 | kind | scope | 约束 |
|---|---|---|---|
| Personal Agent | PERSONAL | PERSONAL | ownerUserId 必填 |
| Workspace Template | TEMPLATE | WORKSPACE | 由 Workspace Admin 管理 |
| Team Template | TEMPLATE | TEAM | teamId 必填 |

### 5.3 Template Clone 链路

```text
Workspace / Team Agent Template
↓
员工选择模板
↓
Clone Published Template Version
↓
Personal Agent Draft（AgentVersion v0 草稿，manifest 从模板 Published Version 快照复制）
↓
员工在 Effective Capability 范围内修改配置
↓
Publish
↓
Personal Agent Version v1
```

- Clone 时在 Agent 上记录 `sourceTemplateVersionId`（指向模板的 Published AgentVersion），仅用于来源追踪。
- **Clone 是 Snapshot Copy，不是实时继承。** 模板之后发布 v2，不会改变任何已存在的 Personal Agent：

```text
Workspace Template v2 → Employee Personal Agent v1 不变
```

- Clone 完成后，Personal Agent 的生命周期完全独立（版本、启停、发布互不影响）。

### 5.4 Agent 状态语义

```text
Agent.status = ENABLED | DISABLED
```

- Agent 不是后台常驻进程，**不使用 RUNNING / STOPPED**。
- UI 文案：ENABLED → 可用；DISABLED → 已停用。
- 真正的执行状态只属于 Run：

```text
CREATED / RUNNING / WAITING_APPROVAL / PAUSED / COMPLETED / FAILED / CANCELLED
```

```text
Agent Enabled ≠ Run Running
```

Agent 停用（DISABLED）后不能再创建新 Task / 新 Run；已在执行的 Run 由 Runtime 决定是否继续（MVP：允许已完成 / 取消中的 Run 自然结束）。

## 6. Skill Ownership 与 Skill Version

### 6.1 Skill 是一级资源

Skill 不再只是 Agent Version 内的一组字符串，而是独立资源，具备：Scope、Category、Ownership、Version、Clone 来源、Enablement。

```text
Skill
├── id
├── workspaceId
├── scope        : WORKSPACE | TEAM | PERSONAL
├── teamId?      # TEAM scope 必填
├── ownerUserId? # PERSONAL 必填
├── categoryId   # NOT NULL，见 §8
├── name
├── description
├── status       : ENABLED | DISABLED
├── currentPublishedVersionId
└── sourceSkillVersionId?    # Clone 来源，仅追踪

SkillVersion
├── id
├── skillId
├── versionNumber
├── instructions
├── references
├── checksum
├── state        : DRAFT | PUBLISHED | DEPRECATED
└── publishedAt
```

- `Skill = Skill identity`；`SkillVersion = immutable instructions / reference contract`（与 ToolDefinition / ToolVersion 同构的可重放思想，但 Skill 与 Tool 不是同一种能力，见 §9）。
- Workspace / Team Skill 后续可以更新，但已经 Published 的 Agent Version 不能发生 Skill 内容漂移，因此 **Agent Version 必须绑定 exact SkillVersion**（AgentSkillBinding，见 AGENT_CAPABILITY_MODEL.md §7）。

### 6.2 两种使用方式

**方式一：Enable / Direct Use** —— 员工直接使用公司或团队发布的 Skill：

- Conversation 中 `/skill java-backend`，或
- Agent Editor → 添加 Workspace / Team Skill。

此时直接引用当前选中的 exact SkillVersion（选择时冻结，之后源 Skill 更新不影响已建立的绑定）。

**方式二：Use as Template / Clone** —— 员工想在公司 Skill 基础上修改：

```text
Workspace / Team Skill
↓
Clone Published SkillVersion
↓
Personal Skill Draft
↓
用户修改
↓
Publish Personal Skill
```

- Personal Skill 记录 `sourceSkillVersionId`，仅用于来源追踪。
- **Clone 是 Snapshot Copy，不是实时继承**：源 Skill 之后更新，不会改变 Personal Skill Clone，也不会改变已 Published 的 AgentVersion 或已绑定的 Conversation。

### 6.3 Enablement

- 员工对自己可访问的 Skill 执行 Enable / Disable（`user_skill_enablement`），决定其个人候选列表中的可见 / 可用状态。
- Enablement 是个人偏好，不改变 Skill 本身的 Scope、Policy 或发布状态。

## 7. Conversation / Task / Run

```text
Conversation ≠ Task
Task ≠ Run
```

### 7.1 Conversation

```text
Conversation = 普通 LLM 多轮对话
```

- 不绑定 Agent，不经过 AgentEngine，不产生 Run。
- 必须经 Model Gateway（禁止直接调用 Provider SDK）。
- 可以通过 `/skill` 临时导入 Skill（绑定 exact SkillVersion，注入上下文）。
- MVP 不提供 Tool 执行。

执行链：

```text
Employee
↓
Conversation
↓
Ingress
↓
Conversation Runtime（Data Plane 独立模块，非新部署服务）
↓
Model Gateway
↓
LLM
↓
ConversationMessage
```

核心对象：

```text
Conversation
├── id
├── workspaceId
├── ownerUserId
├── title
├── summary
├── defaultModelPolicyId    # 默认模型（经 Model Policy 候选集）
├── status                  # ACTIVE | ARCHIVED
├── createdAt
└── updatedAt

ConversationMessage
├── id
├── conversationId
├── role
├── content / contentRef
├── metadata
└── createdAt

ConversationSkillBinding
├── conversationId
└── skillVersionId          # exact SkillVersion
```

规则：

- Conversation 保存 `defaultModelPolicyId`；每一次 Assistant Model Call 仍记录实际使用的 modelPolicy / provider / model / usage。
- 用户中途切换 Model：历史消息不改变，只影响后续调用。
- `/skill` 添加 / 移除 Skill：只影响后续上下文，历史消息不重写；已绑定的 exact SkillVersion 不因源 Skill 更新而漂移。
- Conversation Skill 只影响上下文，不会：获得 Tool 权限、修改 Agent、创建 Agent、修改 Policy、修改 Approval。

### 7.2 Task

```text
Task = 用户视角的长期 Agent 工作会话
```

核心对象：

```text
Task
├── id
├── workspaceId
├── ownerUserId
├── agentId
├── agentVersionId      # 创建时固定的 exact Published AgentVersion
├── title
├── summary
├── status              # ACTIVE | ARCHIVED（产品生命周期，不是执行状态）
├── createdAt
└── updatedAt

TaskMessage
├── id
├── taskId
├── role
├── content
├── runId?              # 由 Run 产生的消息回链
└── createdAt
```

规则：

- Task 创建时用户选择一个 Personal Agent，系统固定 `agentId` + `agentVersionId`（exact Published AgentVersion）。
- **Task 创建后 `agentId` / `agentVersionId` 不可变**：不可通过普通 API 修改；`POST /api/tasks/{id}/messages` 不接受 `agentId` / `agentVersionId`（提交即拒绝）；MVP 不提供 `:change-agent` / `:upgrade-agent-version` endpoint。想换 Agent 只能新建 Task（见 API_CONTRACTS.md §5）。
- Task 生命周期内**不自动跟随** Agent 后续新 Version；升级必须显式操作，MVP 不做自动升级。
- 前端区分 **New Task Composer**（Task 创建前，可选择 Agent）与 **Existing Task Workspace**（Task 创建后，只读展示固定 Agent + Pinned Version）；详细 UI 规格见 frontend/DESIGN.md §7。
- Task.status 只表达产品生命周期（ACTIVE / ARCHIVED）；**不要复制 Run 状态机**，不创建 TASK_RUNNING / TASK_WAITING_APPROVAL；执行状态从 Current Run 派生。

### 7.3 Run

```text
Run = Runtime 一次实际执行实例
```

- Run 增加 `taskId`；执行状态机不变（CREATED / RUNNING / WAITING_APPROVAL / PAUSED / COMPLETED / FAILED / CANCELLED）。
- MVP 固定关系：

```text
1 Task → 1 Agent → 1 exact Published AgentVersion → 1 AgentEngine
```

- Run 启动后绑定 exact Agent Version 与 exact ToolVersion / SkillVersion（v1.1.1 语义不变）。

### 7.4 Task 与 Run 的执行规则

```text
用户：“修复登录 Bug”
↓
Task 创建
↓
Run #1
（Run #1 完成）
用户继续：“把对应测试补上”
↓
Run #2
```

冻结规则：

```text
New user instruction → New Run
Approval / Pause Resume → Same Run
```

- 用户新指令创建新 Run（共享 Task 上下文）。
- Run 进入 WAITING_APPROVAL，用户批准后 Resume **同一个 Run**，不新建 Run。
- 该规则同时约束 PRD / RUNTIME_CONTRACTS / DATA_MODEL / API_CONTRACTS。

### 7.5 三者对照

| 维度 | Conversation | Task | Run |
|---|---|---|---|
| 本质 | 普通 LLM 多轮对话 | 长期 Agent 工作会话 | 一次实际执行实例 |
| 绑定 Agent | 无 | 1 个 Personal Agent | Task 固定的 Agent + Version |
| 绑定版本 | 无（仅默认 Model Policy） | exact Published AgentVersion | exact AgentVersion（快照） |
| 执行路径 | Conversation Runtime → Model Gateway | Run → Runtime Core → AgentEngine → Model Gateway | 同 Task，状态机驱动 |
| Tool 执行 | MVP 无 | 有，经 Tool Gateway 统一执行链 | 同 Task |
| Skill | 临时导入（exact SkillVersion，仅上下文） | 经 Agent Version 绑定（exact SkillVersion） | 使用 Run 快照中的绑定 |
| 状态 | ACTIVE / ARCHIVED | ACTIVE / ARCHIVED | CREATED…COMPLETED 状态机 |
| 归属 | Data Plane user-work state | Data Plane user-work state | Data Plane user-work state |

## 8. Skill Category

```text
SkillCategory
├── id
├── workspaceId
├── name
├── description
├── icon
├── sortOrder
├── status
└── createdAt
```

- Skill Category 由 **Workspace Admin** 创建；普通用户不能创建 Category。
- Skill 必须属于 exactly one Category（`categoryId NOT NULL`）。
- 示例：开发 / 设计 / 测试 / 数据 / 运维 / 产品 / 文档。
- **Scope 与 Category 是正交维度**：如 “Java Backend” 可以是 `scope = WORKSPACE`、`category = 开发`。不要混淆。

## 9. Skill 与 Tool 的边界

- Skill 永远没有执行权限：它不产生 Tool 权限，不能发起 Tool Call（见 AGENT_CAPABILITY_MODEL.md §2）。
- Tool 是“能做什么动作”，Skill 是“应该怎么做”。
- 两者共用类似的版本化绑定思想（identity → immutable version → binding），但领域模型、注册路径、执行链完全不同：

```text
Tool : ToolDefinition → ToolVersion → ToolBinding（执行经 Tool Gateway / Policy）
Skill: Skill         → SkillVersion → AgentSkillBinding / ConversationSkillBinding（只注入上下文）
```

## 10. 创建 Personal Agent 的用户体验（摘要）

- Agents 页面右上角 `[+ 创建 Agent]` → 两个入口：`从模板创建`（Workspace / Team）/ `自定义 Agent`（空白）。
- 模板选择页提供 `[平台] [团队]` Tab；选中后 Clone → Personal Agent Draft → 进入 Agent Editor。
- Agent Editor 至少包含：基本信息 / Engine / Model / Skills / Tools / MCP Tools / Review。
- 可配置：Name / Avatar / Description / Engine / Model / Skills / Allowed Built-in Tools / Allowed MCP Tools。
- 候选能力全部来自 Effective Capability；用户不能输入 Model Provider Key、不能连接 MCP Server、不能绑定自己无权使用的 ToolVersion。
- 详细 UI 规格见 frontend/DESIGN.md。

## 11. 与其他文档的关系

| 文档 | 关系 |
|---|---|
| PRD.md | 产品定位与两条体验（Employee Workspace / Administration） |
| ARCHITECTURE.md | Conversation / Task 所在的 Data Plane 模块位置 |
| AGENT_CAPABILITY_MODEL.md | Agent Version Manifest 中 skills → exact SkillVersion |
| CONTROL_PLANE_DOMAINS.md | workspace / identity / agent / skill Domain 的实体归属 |
| RUNTIME_CONTRACTS.md | Task → Run 执行规则与 Conversation 执行链 |
| DATA_MODEL.md | 本模型对应的表结构 |
| API_CONTRACTS.md | 本模型对应的 API Surface |
| frontend/DESIGN.md | Scope / 状态的 UI 文案与信息架构 |
