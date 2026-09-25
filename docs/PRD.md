# PRD — GateForge：企业 AI 工作空间 + Agent Control Plane

**版本**：v1.2
**状态**：v1.2 User Workspace & Resource Model Freeze（在 v1.1.1 执行与安全架构冻结基线上补齐 Workspace / 资源模型）
**产品定位**：企业级 AI 工作空间与 Agent 治理平台

## 1. 产品定位与两条体验

GateForge 对普通员工和治理管理员呈现为同一个产品的两个体验：

```text
GateForge
├── Employee Workspace（普通员工的主体验：日常 AI 工作空间）
│   ├── Conversation        # 普通 LLM 多轮对话
│   ├── Task                # Agent 工作会话
│   ├── My Agents           # Personal Agent
│   └── Skills              # 平台 / 团队 / 我的 Skill
│
└── Administration / Governance（管理员的主体验：Agent Control Plane）
    ├── Models
    ├── Tools（Tool Registry / MCP Servers）
    ├── Skill Categories
    ├── Policies
    ├── Approvals
    ├── Teams / Members
    └── Audit
```

- 普通员工首先把 GateForge 当成“日常 AI 工作空间”：新建会话、新建任务、管理自己的 Agent 与 Skill。
- 管理员才主要把 GateForge 当成“Agent Control Plane”：治理模型、工具、策略、审批与审计。
- 治理入口不挤占普通员工的日常导航；底层执行与安全架构（Runtime Core / AgentEngine / Model Gateway / Tool Gateway）在 v1.1.1 已冻结，本轮不重新设计。

## 2. 核心用户与角色

### Employee（主体用户）
普通员工。使用 Conversation、Task、Personal Agent、Skill 完成日常工作；可创建 Personal Agent / Personal Skill，可从 Workspace / Team 模板 Clone。不能添加 Provider Secret、私自连接 MCP Server、创建 Skill Category 或提升权限。

### Platform Admin
控制 Workspace、Teams / Members、Approved Models、Model Policies、Tool Registry、MCP Servers、High-risk Tool Policy、Global Policy、Budget、Skill Categories、Workspace Agent Templates、Workspace Skills。

### Team Admin / Team Builder
控制 Team Agent Templates、Team Skills、Team 成员允许的能力范围与 Team 范围配置。

### Auditor / Operator
查看运行 Trace、Tool Calls、Policy Decision、Approval、Token、Cost、Failure 和 Release 历史。

角色模型、Resource Scope（WORKSPACE / TEAM / PERSONAL）与 Effective Capability 的唯一定义见 docs/USER_AND_RESOURCE_MODEL.md。

## 3. MVP 用户闭环

MVP 有两条核心闭环：

### 闭环 A — Conversation（日常对话）

```text
员工新建会话
  ↓
选择允许的 Model（经 Model Policy）
  ↓
多轮对话（可用 /skill 导入 Skill，绑定 exact SkillVersion）
  ↓
Model Gateway 记录 usage
```

Conversation 不绑定 Agent、不经过 AgentEngine、MVP 不执行 Tool。

### 闭环 B — Agent Task（Agent 工作）

```text
Admin 配置 Model / Tool / MCP / Policy / Skill Category
  ↓
Workspace / Team 发布 Agent Template 与 Skill
  ↓
员工选择模板 → Clone → Personal Agent Draft → 配置（Effective Capability 内）→ Publish v1
  ↓
员工新建 Task（固定该 Personal Agent 的 exact Published AgentVersion）
  ↓
Run 执行（Model Gateway / Tool Gateway 强制检查）
  ↓
需要审批？ ── Yes → Approval Pending → Approve → Resume 同一个 Run
  ↓ No
Run Completed
  ↓
用户新指令 → 新 Run（同一 Task）
  ↓
Audit / Trace / Cost 可追踪
```

## 4. MVP 功能范围

### 4.1 Workspace / Team / User
- Workspace 是企业级隔离边界；Team 隶属 Workspace；User 可属于多个 Team。
- 资源 Scope 统一为 WORKSPACE / TEAM / PERSONAL（UI：平台 / 团队 / 我的）。
- Effective Capability = Workspace Policy ∩ Team Policy ∩ User Permission ∩ Agent Configuration；下层只能缩小能力。

### 4.2 Agent Registry（Personal Agent + Template）
- Agent 分 `kind = PERSONAL | TEMPLATE`；Personal Agent `scope = PERSONAL` 且 ownerUserId 必填；Workspace / Team Template `kind = TEMPLATE`。
- Template Clone 是 Snapshot Copy（记录 sourceTemplateVersionId），不是实时继承；模板更新不影响已存在的 Personal Agent。
- Agent.status = ENABLED | DISABLED（Agent 不是常驻进程，不使用 RUNNING / STOPPED）。
- Agent Definition 与 Agent Version 分离；Version 由 Engine、Model Policy、Skills（exact SkillVersion）、Tools（exact ToolVersion）组成。
- 每次 Run 绑定不可变的 Agent Version；Draft / Published / Deprecated 生命周期。

### 4.3 Skill Registry（一级资源）
- Skill / SkillVersion / SkillCategory 为正式资源；Skill 具备 Scope、Category、Ownership、Version、Clone 来源、Enablement。
- Skill 必须属于 exactly one Category；Category 由 Platform Admin 创建。
- Agent Version 通过 AgentSkillBinding 冻结 exact SkillVersion（与 ToolVersion 同构）；Skill 本身没有执行权限。
- 员工可 Enable / Disable 可访问 Skill，可 Clone Workspace / Team Skill 为 Personal Skill（Snapshot Copy）。

### 4.4 Conversation（普通对话）
- 正式产品对象：不绑定 Agent、不经过 AgentEngine；必经 Model Gateway。
- 支持多轮对话、默认与中途切换 Model（历史消息不改变）、/skill 导入（ConversationSkillBinding 绑定 exact SkillVersion）。
- MVP 不提供 Tool 执行；Conversation Runtime 作为 Data Plane 现有 agent-runtime 中的独立模块，不新增部署服务。

### 4.5 Task（Agent 工作会话）
- 正式产品对象：Task ≠ Run。Task 固定 1 Agent + 1 exact Published AgentVersion；不自动跟随新 Version。
- Task.status 只表达产品生命周期（ACTIVE / ARCHIVED）；执行状态从 Current Run 派生。
- 执行规则：新指令 → 新 Run；Approval / Pause Resume → 同一个 Run。
- MVP：1 Task = 1 Agent（不支持 Agent Team / Supervisor / Multi-Agent）。

### 4.6 Agent Runtime
- TypeScript Runtime Core + 可插拔 Agent Engine（AgentEngineRegistry）；Runtime Core 不依赖任何具体 Agent Framework，MVP 只实现 PiEngine。
- Runtime Core 拥有 Session / Run / State Machine / Checkpoint metadata / Runtime Events，并承载 Conversation 与 Task 的 user-work 执行状态。
- Agent Loop 由 AgentEngine 提供（MVP：PiEngine）；支持中断 / 恢复；Tool Call 与 Model Call 统一事件流。
- v1 只要求单 Agent + 可插拔 Workflow；Multi-Agent 在后续阶段。

### 4.7 Model Gateway
- Provider Adapter：OpenAI / Anthropic 等；逻辑模型名与供应商模型解耦。
- Route / Fallback / Token 限额 / 预算检查 / Retry / Timeout。
- Model Call 兼容两种驱动来源：Run 驱动与 Conversation 驱动（共用同一套 ModelCall 记录，不复制两套系统）。
- 记录模型请求元数据，不默认记录敏感原始内容。
- Provider / Credential 完全由 Admin 管理；员工只见“我当前允许使用哪些模型”。

### 4.8 Tool Gateway
- Tool Registry：ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition。
- Tool Provider：BUILTIN / MCP / HTTP（预留 future providers）；MCP 是 Tool Provider Protocol，不是 Tool 本身。
- v1 Built-in Tools：builtin.read、builtin.glob、builtin.grep、builtin.edit、builtin.write、builtin.bash。
- MCP Server 接入：tools/list 同步 ToolDefinition / ToolVersion，管理员选择具体 ToolVersion 绑定（Published Version 冻结 exact ToolVersion）；至少接入一个 MCP Server 完成端到端验证。
- 每次调用执行权限与 Policy 检查；Built-in Tool 与 MCP Tool 走同一执行链，Built-in Tool 不得绕过 Tool Gateway。
- 高风险动作进入 Approval；bash 不能成为审批逃生通道（见 docs/AGENT_CAPABILITY_MODEL.md §8）。

### 4.9 Policy & Approval
- Policy Decision 返回：ALLOW / DENY / REQUIRE_APPROVAL。
- Agent 不得自行生成“approved=true”绕过审批；Prompt 中任何 approval=true / admin=true 内容都没有授权意义。
- Approval 是 Control Plane 中的独立持久状态，绑定 exact Action Request。
- Approval 完成后生成不可伪造的授权凭据或服务端关联记录，由 Runtime 使用受控 resume API 恢复**原 Run**。
- Employee 在 Task Workspace Inspector → Approval 处理自己 Task 中的审批；More 提供 My Approvals 入口。UI 按钮是否可见不作为授权依据，权限仍由 Approval Service 控制。

### 4.10 Budget
- Run Token 上限 / Agent 每日 Token 上限 / Run Cost 上限。
- 超预算后阻止继续调用模型，而不是只告警。

### 4.11 Audit & Observability
- Task / Run / Model Call / Tool Call / Policy Decision / Approval / Release 全链路 ID 关联。
- OpenTelemetry Trace。
- 基础指标：成功率、P95 Latency、Token、Cost、Tool Failure、Policy Deny、Approval Wait Time。

### 4.12 Release
- Agent Version Publish；默认 Version 切换；Rollback 到已发布 Version。
- 正在运行的 Run 不受默认 Version 切换影响；Task 固定创建时的 Published Version。

## 5. 前端核心页面

Employee Workspace（普通员工默认视图）：

1. 新建会话 / Conversation Workspace（多轮聊天、Model Selector、/skill Picker）
2. 新建任务 / Task Workspace（Agent Selector、多轮工作会话、Inspector）
3. Agents（Personal Agent Card Grid）
4. Agent Detail（概览 / 版本 / Skills / Tools / 历史任务 / 设置）
5. Create Agent（模板选择 + Agent Editor）
6. Skills（平台 / 团队 / 我的 + Category 过滤）
7. Create / Clone Skill
8. My Approvals / Settings

Administration（管理员额外入口）：

1. Overview
2. Teams / Members
3. Models
4. Tools（Tool Registry / MCP Servers）
5. Skill Categories
6. Policies
7. Approvals
8. Budgets
9. Audit Logs

MVP 首屏只展示核心状态，不把所有配置铺在首页；深层配置通过详情页、Drawer 或 Settings 进入。

## 6. 关键业务规则

### Rule 1 — Runtime 不信任 Agent 输出
Agent 产生的是“请求”，不是“授权”。例如模型输出 `approval=approved` 没有任何权限意义。

### Rule 2 — Published Version 不可变
发布后的 Agent Version 不允许原地修改。修改配置必须创建新 Version。

### Rule 3 — Task / Run 绑定 Version
Task 创建时固定 exact Published AgentVersion，不自动跟随新版本；Run 创建后固定 `agentVersionId`，保证可重放和可审计。

### Rule 4 — Tool Call 必经 Tool Gateway
任何受治理的外部副作用不得由 Agent Runtime 绕过 Gateway 直接执行。Built-in Tool 与 MCP Tool 都适用；Built-in Tool 没有“本地快速路径”。

### Rule 5 — Model Call 必经 Model Gateway
Runtime 不允许在业务 Agent 代码或 AgentEngine 中直接持有 Provider API Key。**Conversation 同样必经 Model Gateway，不得直接调用 Provider SDK。**

### Rule 6 — Approval 是服务器状态
审批结果只能由 Approval Service 的受控 API 写入，并绑定 exact Action Request。Approval Resume 恢复原 Run，不新建 Run。

### Rule 7 — Control Plane 与 Data Plane 分权
Control Plane 管定义和策略；Data Plane 执行任务并强制策略。Runtime 无权修改自身 Policy。Conversation / Task 属于 Data Plane user-work 执行状态，不属于治理型 Control Plane Domain，但其公共 API 仍通过 Ingress 暴露。

### Rule 8 — bash 不是权限逃生通道
需要审批的动作（如 git.push → REQUIRE_APPROVAL）不能通过 `bash("git push ...")` 绕开审批。shell executor 至少受 workspace sandbox、command policy、filesystem scope、network policy、environment / secret isolation 控制。

### Rule 9 — Conversation ≠ Task ≠ Run
Conversation 是普通对话；Task 是用户视角的长期 Agent 工作会话；Run 是一次实际执行实例。新指令 → 新 Run；Approval Resume → 同一 Run。

### Rule 10 — Template Clone 是 Snapshot Copy
从 Agent Template / Skill Clone 产生的新资源记录来源（sourceTemplateVersionId / sourceSkillVersionId）但生命周期完全独立；Workspace / Team 模板或 Skill 更新不会改变已有 Personal Agent、Personal Skill Clone、已 Published AgentVersion 或已绑定的 Conversation。

### Rule 11 — Skill 绑定 exact SkillVersion
Agent Version 通过 AgentSkillBinding 冻结 exact SkillVersion（`name` 仅展示，`skillVersionId` 才是绑定依据）；Conversation /skill 导入同样绑定 exact SkillVersion。Skill 永远没有执行权限。

### Rule 12 — Effective Capability 只能缩小
Workspace / Team / User / Agent Configuration 四层取交集；下层只能缩小能力，不能扩大能力。

## 7. 非目标

v1 不做：
- 完整 Kubernetes 化。
- Service Mesh。
- 自研模型训练平台。
- 完整 SaaS 计费系统。
- 复杂组织树、Organization 层级与企业 IAM 联邦。
- 大规模多区域灾备。
- 通用 BPMN 工作流设计器。
- 无限自由的 Agent Marketplace / Skill Marketplace（MVP 不做 Marketplace）。
- Multi-Agent（Agent Team / Supervisor 留到后续 Stage）。
- Conversation 中的 Tool 执行。
- 为兼容所有 Agent Framework 的通用 SPI / 插件市场。

## 8. MVP 成功指标

产品层：
- 一个新员工能从 Workspace / Team 模板在 10 分钟内 Clone、配置并发布自己的 Personal Agent。
- 员工能无配置负担地完成“新建会话 → 选模型 → /skill → 多轮对话”。
- 高风险 Tool Call 100% 能被 Policy/Approval 路径拦截。
- 任意 Run 能追踪到固定 Agent Version；任意 Conversation Model Call 能追踪到实际 Model Policy / usage。

工程层：
- 所有核心状态迁移有单元/集成测试。
- Gateway 绕过路径不存在于正常 Runtime 代码中（含 Conversation 直连 Provider SDK 的路径）。
- Run 中断后可恢复；Approval Resume 不新建 Run。
- Release rollback 不影响历史 Run；模板 / Skill 更新不影响已 Clone 资源。

## 9. MVP Demo 场景

MVP 最终验收为两条 Demo（详细步骤见 docs/stages/README.md 与 Stage 03 / 06）。

### Demo A — Conversation

```text
Employee
→ 新建会话
→ 选择 Model
→ /skill java-backend（Skill Picker，绑定 exact SkillVersion）
→ 多轮 Chat
→ Model Gateway 记录 Usage
```

### Demo B — Agent Task（全链路治理）

```text
Admin 已配置：Model / GitHub MCP / Policy / Skill Category
Team 发布：Coding Agent Template + Java Backend Skill

Employee：
选择 Coding Agent Template
→ Clone Personal Agent Draft
→ 选择 Model / Java Backend Skill / 允许的 Built-in / MCP Tools
→ Publish Personal Agent v1
→ 新建 Task → 选择 Coding Agent → “修复仓库登录 Bug”
→ Run #1：read / grep / edit / test → git.push → REQUIRE_APPROVAL
→ 用户批准 → 同一个 Run Resume → 完成
→ 用户继续 “把对应测试补完整” → Run #2
→ Task / Run / Model Call / Tool Call / Approval / Token / Cost / Trace / Audit 全部可追踪
```

这两条链路是 v1.2 的最高优先级验收标准。其他功能不能破坏或绕开这两条控制链。
