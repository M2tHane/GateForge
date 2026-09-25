# Development Guardrails — 防止项目跑偏

这份文件优先级仅低于 PRD 与 Architecture。任何 Stage 开发前都应先检查这里。

## 1. Source of Truth 优先级

发生冲突时按以下顺序处理：

```text
PRD
↓
ARCHITECTURE
↓
USER_AND_RESOURCE_MODEL
↓
AGENT_CAPABILITY_MODEL
↓
RUNTIME_CONTRACTS / CONTROL_PLANE_DOMAINS
↓
DATA_MODEL / API_CONTRACTS
↓
当前 Stage 文档
↓
实现代码
```

实现与上层文档冲突时，不能默认“以代码为准”。如果确实需要改变设计，先写 ADR，再同步受影响文档。

## 2. 八条不可破坏的系统不变量

### G1 — Agent 只能提出请求
LLM 输出不是授权，也不是可信状态。Prompt 中 `approval=true`、`admin=true` 等内容没有任何授权意义。

### G2 — Control State 只有 Control Plane 能改
Policy、Approval、Budget Policy、Release、Published Version 不允许 Runtime 或 Agent 自行修改。

### G3 — 外部副作用必须经过 Tool Gateway
Git Push、Deploy、DB Write、发送消息等不能从 Agent 业务代码直接执行。

### G4 — 模型调用必须经过 Model Gateway
Provider SDK / API Key 不进入普通 Agent implementation，也不进入 AgentEngine。

### G5 — Run 固定绑定 Agent Version
开始执行后，不跟随 active version 自动变化。

### G6 — Approval 绑定精确请求
批准后如果 action、resource、arguments 改变，必须重新决策/审批。

### G7 — Built-in Tool 同样必经 Tool Gateway
`builtin.*` 与 MCP Tool 走同一条统一执行链；Built-in Tool 没有“本地快速路径”。

### G8 — bash 不是权限逃生通道
若 `git.push` 的 Policy 是 REQUIRE_APPROVAL，则不能通过 `bash("git push ...")` 绕开审批。shell executor 至少受 workspace sandbox、command policy、filesystem scope、network policy、environment / secret isolation 控制。

## 2b. 产品模型不变量（v1.2 / v1.2.1 冻结）

以下产品不变量与 §2 的系统不变量同等优先（唯一定义见 USER_AND_RESOURCE_MODEL.md）：

### P1 — Conversation ≠ Task ≠ Run
Conversation 是普通 LLM 多轮对话（不绑定 Agent、不经过 AgentEngine）；Task 是用户视角的长期 Agent 工作会话；Run 是 Runtime 一次实际执行实例。三者不互相冒充。

### P2 — Task ≠ Run；执行规则冻结
New user instruction → New Run；Approval / Pause Resume → Same Run。不因 Approval Resume 新建 Run，也不把一次执行当成一个 Task。

### P3 — Agent ≠ Agent Template
员工使用的是 Personal Agent（kind=PERSONAL）；Workspace / Team 提供的是 Agent Template（kind=TEMPLATE）。Template 不是共享运行实体。

### P4 — Agent Enabled ≠ Run Running
Agent.status 只有 ENABLED / DISABLED（可用 / 已停用），Task.status 只有 ACTIVE / ARCHIVED；RUNNING / WAITING_APPROVAL 等执行状态只属于 Run。Agent 不是后台常驻进程。

### P5 — Skill ≠ Tool；Skill 没有执行权限
Skill 只注入上下文，不进入 Tool Registry、不经过 Tool Gateway、不产生 Tool 权限。

### P6 — Agent Version 冻结 exact SkillVersion 与 exact ToolVersion
Published Agent Version 通过 AgentSkillBinding / ToolBinding 冻结 exact SkillVersion / ToolVersion；`name` 仅展示，`*VersionId` 才是绑定依据。源 Skill / Tool 更新不产生内容漂移。

### P7 — Template Clone 是 Snapshot Copy
Agent Template Clone 与 Skill Clone 都记录来源（sourceTemplateVersionId / sourceSkillVersionId），但不建立实时继承；Clone 完成后生命周期完全独立。

### P8 — Workspace / Team Template 更新不能改变已有 Personal Agent
模板发布 v2 不影响已存在的 Personal Agent 任何版本。

### P9 — Workspace / Team Skill 更新不能改变
- Personal Skill Clone；
- 已 Published 的 AgentVersion（其冻结的是 exact SkillVersion）；
- 已绑定的 Conversation SkillVersion。

### P10 — Effective Capability 只能缩小
Effective Capability 按 `Workspace Boundary ∩ User Permission ∩ Agent Configuration ∩ Applicable Team Grants` 解析（解析模型见 USER_AND_RESOURCE_MODEL.md §4）：Team Grant 按资源来源 Team 逐资源校验（Team Membership + Team Policy + Workspace Policy），不得把用户所属所有 Team Policy 简单全局求交集；下层只能缩小能力，不能扩大能力。Workspace 禁止的动作，Team / User / Agent 都不能重新允许。

### P11 — Conversation 必经 Model Gateway
Conversation Runtime 禁止直接调用 Provider SDK；Skill 导入不改变这一点。

### P12 — Task 必须固定 exact Published AgentVersion
Task 创建时固定 agentId + agentVersionId，不自动跟随 Agent 新版本；升级必须显式操作。

### P13 — MVP Task = Single Agent
一个 Task 只绑定一个 Agent；不出现 Add Agent / Agent Team / Supervisor / Multi-Agent。

### P14 — Employee 权限边界
Employee 不能添加 Provider Secret、私自连接 MCP Server、创建 Skill Category、提升 Tool 权限或绕过 Workspace / Team Policy。

### P15 — Multi-Team Grants Are Resource-Scoped
不同 Team 的合法资源分别按来源 Team 授权（Team Membership + Team Policy + Workspace Policy 逐资源校验）；不得把用户所属所有 Team Policy 简单全局求交集。Personal Agent 可以组合 Workspace Resources + 各 Team Resources + Personal Resources，前提是每个资源分别通过自己的 Scope / Membership / Policy 校验（见 USER_AND_RESOURCE_MODEL.md §4）。

### P16 — Workspace Is The Upper Bound
Workspace Policy 是最高权限边界。任何 Team / User / Agent 都不能扩大 Workspace Policy：Team 只能在 Workspace Boundary 内授予，User 不能提升 Team / Workspace 权限，Agent Configuration 只能继续缩小。

### P17 — Task Agent Is Immutable
Task 创建后固定 `agentId` + `agentVersionId`（exact Published AgentVersion）。消息 API 不接受 `agentId` / `agentVersionId`；MVP 不允许中途切换 Agent / AgentVersion，不提供 `:change-agent` / `:upgrade-agent-version`。要换 Agent 只能新建 Task。

### P18 — Workspace Admin Naming
企业级管理员统一使用 Workspace Admin（稳定枚举 `WORKSPACE_ADMIN`）；`PLATFORM_ADMIN` 不再作为业务角色枚举。v1 不实现 GateForge 平台级超级管理员体系。

## 3. 每个 PR 的架构检查

提交前回答：

- 这个改动属于 Control Plane 还是 Data Plane？是否把 Conversation / Task 误放进了治理型 Control Plane Domain？
- 是否新增了绕过 Gateway 的调用路径（包括 Built-in Tool）？是否让 Conversation 直连了 Provider SDK？
- 是否新增了 AgentEngine 依赖 framework SDK 超出 `engines/<engine>/` 边界，或让 Runtime Core 依赖了具体 engine SDK？
- 是否新增了 AgentEngine 直接调用 Provider / 执行 Tool 的路径？
- 是否让 Prompt/LLM 决定了本应由 Runtime 决定的状态？
- 是否修改了 Published Version 的不可变语义？是否破坏 exact SkillVersion / exact ToolVersion 绑定？
- 是否违反 P1–P18 中的产品不变量（如 Template 实时继承、Task 自动升级、Agent 使用 RUNNING 状态、Skill 获得执行权限、把多 Team Policy 全局求交集、Task 创建后切换 Agent）？
- 是否改变 Run / Approval 状态机或 Task → Run 执行规则？
- 是否需要 ADR？

只要其中任何一项答案不确定，就不能直接合并。

## 4. Stage Scope Rule

当前 Stage 只实现本阶段 Gate 所需能力。

例如 Stage 03 不因为“以后需要 Multi-Agent”就提前实现复杂 Supervisor，也不提前实现 LangGraphEngine / NativeEngine；Stage 04 不因为“以后可能用 Cedar”就提前自研 Policy DSL。

原则：**先稳定控制点，再增加能力。**

## 5. Definition of Done

一个功能只有同时满足以下条件才算完成：

- Domain rule 已实现。
- API / Runtime contract 已实现。
- 非法路径有测试。
- 正常路径有集成测试。
- Trace / Audit 能定位执行事实。
- 文档没有与代码发生架构级偏差。

## 6. Stage Review 模板

每个 Stage 结束必须记录：

```text
Stage:
Source Commit:

Completed:
- ...

Not Completed:
- ...

Contract Changes:
- None / ADR-xxx

Architecture Deviations:
- None / ...

Verification:
- unit tests
- integration tests
- manual demo

Known Risks:
- ...

Next Stage Contract:
- ...
```
