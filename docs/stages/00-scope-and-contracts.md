# Stage 00 — Scope Freeze & Contracts

## 目标

在写业务代码前冻结 v1 的产品边界、核心实体、状态机和跨服务契约。

## 冻结的契约

- AgentEngine 最小接口（engine id / capabilities / start / resume / cancel）
- EngineCapabilities（streaming / checkpoint / interrupt-resume / toolCalling / structuredOutput / multiAgent）
- Agent Capability Model（Agent Version = Engine / Model Policy / Skills / Tools；Skill 与 Tool 的边界）
- ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition
- ToolDefinition vs ToolVersion（identity vs immutable executable contract）
- ToolBinding binds exact ToolVersion
- Published Agent Version freezes ToolVersion
- Runtime never resolves "latest tool version" for historical Runs
- Tool Provider 抽象（BUILTIN / MCP / HTTP / future providers）
- Agent Version Manifest

## 做什么

- 确认 PRD 的 MVP / 非目标。
- 确认 Control Plane 与 Runtime 边界，以及 Runtime Core 与 AgentEngine 的职责边界。
- 确认 Run / Approval / Agent Version 状态机。
- 确认 3 Gateway 的职责与统一 Tool 执行链（Built-in 与 MCP Tool 一致）。
- 建立 monorepo / multi-repo 目录和基础 CI。
- 建立 API error contract、ID、时间、审计和 correlation id 规范。

## 产物

- PRD.md
- ARCHITECTURE.md
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

## Gate

只有当以下问题都有唯一答案才能进入下一阶段：
1. 谁能改变 Approval 状态？
2. Runtime 是否能修改 Policy？
3. Run 绑定哪个 Version？
4. Tool Call 从哪里执行？（统一执行链是否对 Built-in / MCP Tool 一致？）
5. Model API Key 在哪里？
6. AgentEngine 最小接口与 EngineCapabilities 是否冻结？
7. Skill 与 Tool 的边界是否明确（Skill 无执行权限）？
8. Agent Version Manifest 的字段是否冻结？
9. Published Agent Version 使用的是 ToolDefinition 还是 exact ToolVersion？（唯一正确答案：exact ToolVersion）
