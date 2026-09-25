# GateForge — Agent Platform Specification

v1.2 User Workspace & Resource Model Freeze（在 v1.1.1 执行与安全架构冻结基线上收口）。这是一套用于分阶段开发企业级 Agent 平台的约束性文档包。目标不是一次性实现完整平台，而是让产品、前端、Control Plane、Agent Runtime、Gateway 和数据模型在同一套契约下演进，避免开发过程中不断改方向。

## 产品定位

GateForge 分为两个体验层：

- **Employee Workspace**：普通员工的“日常 AI 工作空间”——新建会话（Conversation）、新建任务（Task）、My Agents（Personal Agent）、Skills。
- **Administration / Governance**：管理员视角的“Agent Control Plane”——Models、Tools / MCP、Skill Categories、Policies、Approvals、Teams / Members、Budgets、Audit。

普通员工首先把 GateForge 当成日常 AI 工作空间；管理员才主要把它当成 Agent Control Plane。

## 推荐阅读顺序

1. 阅读 `docs/PRD.md`：确认产品定位（两条体验）、产品边界、MVP 和非目标。
2. 阅读 `frontend/DESIGN.md` + `frontend/theme.css`：先完成静态前端原型与交互确认（Employee Workspace 优先）。
3. 阅读 `docs/ARCHITECTURE.md`：确认 Control Plane / Data Plane / Gateway 边界与 Runtime Core + Agent Engine 架构。
4. 阅读 `docs/USER_AND_RESOURCE_MODEL.md`：确认 Workspace / Team / User、Scope、Role、Effective Capability、Agent Template Clone、Skill 资源模型与 Conversation / Task / Run 关系（这些概念的唯一详细定义）。
5. 阅读 `docs/AGENT_CAPABILITY_MODEL.md`：确认 Agent Version 组成、Skill / Tool 边界、Tool Provider 与统一执行链。
6. 阅读 `docs/CONTROL_PLANE_DOMAINS.md`：按领域实现 Spring Boot 模块化单体。
7. 阅读 `docs/RUNTIME_CONTRACTS.md`：实现 Runtime Core 与 AgentEngine、Runtime 与 Control Plane 的强边界，以及 Conversation / Task 执行链。
8. 阅读 `docs/DATA_MODEL.md` 与 `docs/API_CONTRACTS.md`：冻结核心实体与 API。
9. 阅读 `docs/DEVELOPMENT_GUARDRAILS.md`：把系统不变量与产品不变量作为每个 PR 的检查项。
10. 按 `docs/stages/` 从 Stage 00 到 Stage 07 开发，每个 Stage 必须通过 Gate 才进入下一阶段。

## v1.2 技术基线

- Web Console：React / Next.js / TypeScript / Tailwind CSS / shadcn/ui / Base UI
- Control Plane：Java 21 + Spring Boot 3.x，模块化单体
- Agent Runtime：TypeScript Runtime Core + 可插拔 Agent Engine（MVP 默认实现 PiEngine；预留 LangGraphEngine / NativeEngine，Runtime Core 不依赖任何具体 Agent Framework）；Conversation / Task 作为 agent-runtime 内的独立模块，不新增部署服务
- Tool Provider：BUILTIN / MCP / HTTP（预留 future providers；Built-in 与 MCP Tool 都必经 Tool Gateway）
- Database：PostgreSQL
- Cache / Lock / ephemeral state：Redis
- Policy：先使用平台内置 Policy API + 结构化规则；Stage 04 后可接 OPA / Cedar
- Observability：OpenTelemetry + Prometheus + Loki + Tempo
- Object Storage：S3-compatible，MVP 可先用本地 MinIO

## 核心原则

```text
Prompt 决定 Agent “想做什么”
Runtime / Gateway / Policy 决定 Agent “实际能不能做”
```

所有高风险状态变更必须经过受控入口；LLM、Agent、Tool 不得直接修改 Policy、Approval、Budget、Release 等控制状态。

关键语义速览（唯一定义见 `docs/USER_AND_RESOURCE_MODEL.md`）：

- Workspace = 企业级隔离边界；Workspace → Teams → Users；Scope = WORKSPACE / TEAM / PERSONAL。
- Effective Capability = Workspace Policy ∩ Team Policy ∩ User Permission ∩ Agent Configuration；下层只能缩小。
- Agent ≠ Agent Template：员工使用 Personal Agent；Template Clone 是 Snapshot Copy。
- Agent.status = ENABLED / DISABLED；执行状态（RUNNING / WAITING_APPROVAL…）只属于 Run。
- Skill 是一级资源但永远没有执行权限；Agent Version 冻结 exact SkillVersion 与 exact ToolVersion。
- Conversation ≠ Task ≠ Run；新指令 → 新 Run；Approval Resume → 同一个 Run；MVP Task = Single Agent。

## MVP 最终验收场景

MVP 最终验收为两条 Demo：

**Demo A — Conversation**：员工新建会话 → 选择 Model → `/skill java-backend`（统一 Skill Picker，绑定 exact SkillVersion）→ 多轮 Chat → Model Gateway 记录 Usage。

**Demo B — Agent Task**：Admin 配置 Model / GitHub MCP / Policy / Skill Category，Team 发布 Coding Agent Template 与 Java Backend Skill；员工 Clone 模板 → 配置（Effective Capability 内）→ Publish Personal Agent v1 → 新建 Task → “修复仓库登录 Bug” → Run #1（read / grep / edit / test → git.push → REQUIRE_APPROVAL → 批准 → 同一个 Run Resume → 完成）→ “把对应测试补完整” → Run #2。Task / Run / Model Call / Tool Call / Approval / Token / Cost / Trace / Audit 全链路可追踪。

这两条链路是 v1.2 的最高优先级验收标准。其他功能不能破坏或绕开这两条控制链。
