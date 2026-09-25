# Stage 00 — Scope Freeze & Contracts

## 目标

在写业务代码前冻结 v1.2 的产品边界、核心实体、状态机、资源模型和跨服务契约。

## 冻结的契约

### 执行与安全（v1.1.1 已冻结，不回退）

- AgentEngine 最小接口（engine id / capabilities / start / resume / cancel）
- EngineCapabilities（streaming / checkpoint / interrupt-resume / toolCalling / structuredOutput / multiAgent）
- ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition
- ToolDefinition vs ToolVersion（identity vs immutable executable contract）
- ToolBinding binds exact ToolVersion
- Published Agent Version freezes ToolVersion
- Runtime never resolves "latest tool version" for historical Runs
- Tool Provider 抽象（BUILTIN / MCP / HTTP / future providers）
- 统一 Tool 执行链（Built-in 与 MCP 一致）；bash 不能绕过 Tool Policy

### User & Resource Model（v1.2 新增冻结）

- Agent Capability Model（Agent Version = Engine / Model Policy / Skills / Tools；Skill 与 Tool 的边界）
- Workspace / Team / User（Workspace 是唯一租户边界，不建 Organization 平行体系）
- Resource Scope：WORKSPACE / TEAM / PERSONAL（UI 文案：平台 / 团队 / 我的；不用 PLATFORM 作为数据库 Scope）
- Role：Workspace Admin（WORKSPACE_ADMIN）/ Team Admin（TEAM_ADMIN）/ Team Builder（TEAM_BUILDER）/ Employee（EMPLOYEE）/ Auditor（AUDITOR）/ Operator（OPERATOR）；PLATFORM_ADMIN 不再作为业务角色
- Effective Capability 按 `Workspace Boundary ∩ User Permission ∩ Agent Configuration ∩ Applicable Team Grants` 解析（v1.2.1 语义收口；Team Resource 按来源 Team 独立校验；Workspace Policy 始终是最高上限；下层只能缩小）
- Agent kind（PERSONAL / TEMPLATE）与 ownership（ownerUserId / teamId / sourceTemplateVersionId）
- Agent Template Clone = Snapshot Copy（非实时继承）；模板更新不影响已有 Personal Agent
- Agent.status = ENABLED | DISABLED（不是 RUNNING / STOPPED）
- Skill / SkillVersion / SkillCategory / AgentSkillBinding / UserSkillEnablement；Agent Version 绑定 exact SkillVersion
- Skill Clone = Snapshot Copy；Skill 更新不影响 Personal Clone / Published AgentVersion / 已绑定 Conversation
- Conversation ≠ Task ≠ Run；Conversation 执行链（必经 Model Gateway，不启动 AgentEngine，MVP 无 Tool）
- Task 固定 exact Published AgentVersion；New user instruction → New Run；Approval / Pause Resume → Same Run
- Task Agent 不可变（v1.2.1 冻结）：Task 创建后 `agentId` / `agentVersionId` 不可通过普通 API 修改，消息 API 不接受这两个字段，MVP 无 `:change-agent` / `:upgrade-agent-version`；前端区分 New Task Composer（创建前可选 Agent）与 Existing Task Workspace（创建后只读展示固定 Agent + Pinned Version）
- model_call 兼容 Run 驱动与 Conversation 驱动（exactly one execution owner）
- Agent Version Manifest（skills 从 string[] 改为 exact SkillVersion 绑定）

## 做什么

- 确认 PRD 的 MVP / 非目标，以及 Employee Workspace / Administration 两条产品体验。
- 确认 Control Plane 与 Runtime 边界，以及 Runtime Core 与 AgentEngine 的职责边界。
- 确认 Run / Approval / Agent Version 状态机，以及 Agent / Task 的产品状态语义。
- 确认 Workspace / Team / User / Role / Effective Capability 与 Agent / Skill 归属模型（USER_AND_RESOURCE_MODEL.md）。
- 确认 Conversation / Task / Run 的对象关系与执行规则。
- 确认 3 Gateway 的职责与统一 Tool 执行链（Built-in 与 MCP Tool 一致）。
- 建立 monorepo / multi-repo 目录和基础 CI。
- 建立 API error contract、ID、时间、审计和 correlation id 规范。

## 产物

- PRD.md
- ARCHITECTURE.md
- USER_AND_RESOURCE_MODEL.md
- AGENT_CAPABILITY_MODEL.md
- CONTROL_PLANE_DOMAINS.md
- RUNTIME_CONTRACTS.md
- DATA_MODEL.md
- API_CONTRACTS.md
- DESIGN.md
- theme.css

## 不做

- 不实现真实 Agent。
- 不接真实模型。
- 不做 Policy DSL。
- 不实现 PiEngine 之外的 AgentEngine（LangGraphEngine / NativeEngine 仅预留命名）。
- 不实现 Multi-Agent / Agent Team。
- 不做 Skill Marketplace。

## Gate

只有当以下问题都有唯一答案才能进入下一阶段：

1. 谁能改变 Approval 状态？
2. Runtime 是否能修改 Policy？
3. Run 绑定哪个 Version？Task 绑定哪个 Version？
4. Tool Call 从哪里执行？（统一执行链是否对 Built-in / MCP Tool 一致？）
5. Model API Key 在哪里？Conversation 是否允许直连 Provider SDK？（唯一正确答案：不允许）
6. AgentEngine 最小接口与 EngineCapabilities 是否冻结？
7. Skill 与 Tool 的边界是否明确（Skill 无执行权限）？
8. Agent Version Manifest 的字段是否冻结（含 exact SkillVersion）？
9. Published Agent Version 使用的是 ToolDefinition 还是 exact ToolVersion？（唯一正确答案：exact ToolVersion）
10. Conversation / Task / Run 的区别与执行规则是否唯一（新指令新 Run、Approval Resume 原 Run）？
11. Workspace / Team / User 与 Scope / Role / Effective Capability 是否冻结？
12. Agent Template / Skill Clone 的语义是否唯一（Snapshot Copy，非实时继承）？
13. Agent 状态语义是否唯一（ENABLED / DISABLED；执行状态只属于 Run）？
14. 一个 User 属于多个 Team 时，是否将全部 Team Policy 做全局交集？（唯一正确答案：**否**——Team Resource 按来源 Team 独立校验 Membership + Team Policy，Workspace Policy 始终作为最高边界）
15. Task 创建后是否允许切换 Agent？（唯一正确答案：**否**——Task 固定 `agentId` + exact Published `agentVersionId`）
16. 企业级最高业务管理员角色叫什么？（唯一正确答案：**WORKSPACE_ADMIN**）
