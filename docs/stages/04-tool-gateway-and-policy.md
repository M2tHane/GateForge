# Stage 04 — Tool Gateway + Policy Enforcement

## 目标

建立平台真正的安全控制点：Agent 只能“请求”动作，Tool Gateway 决定是否执行。

## Control Plane Domain

实现：
- tool：ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition
- policy：结构化规则

## Runtime 实现

- Built-in Tool Registry（Runtime 注册 `builtin.*` 到 Tool Registry）
- Built-in Executors
- MCP Server Registry（McpServerDefinition）
- MCP tools/list discovery
- MCP Tool synchronization（同步 ToolDefinition / ToolVersion，管理员选择可绑定项）
- Tool Gateway（统一执行链）
- Policy Enforcement

## Tool 范围

Built-in 至少支持：

```text
builtin.read
builtin.glob
builtin.grep
builtin.edit
builtin.write
builtin.bash
```

并至少接入一个 MCP Server 完成端到端验证：`tools/list` → 同步 ToolDefinition / ToolVersion → 管理员绑定 → Agent 请求 → Policy → 执行。

## 统一执行链

Built-in Tool 与 MCP Tool 走同一条链：

```text
AgentEngine
↓
ToolRequest
↓
Runtime Core
↓
Tool Gateway schema validation
↓
Policy Decision
↓
ALLOW / DENY / REQUIRE_APPROVAL
↓
Executor（BUILTIN / MCP）
```

本阶段 REQUIRE_APPROVAL 可以先返回 waiting，但完整审批在 Stage 05。

## bash 安全边界

`builtin.bash` 不能成为权限逃生通道。shell executor 至少受控于：

- workspace sandbox
- command policy
- filesystem scope
- network policy
- environment / secret isolation

例如 `git.push` 配置为 REQUIRE_APPROVAL 时，`bash("git push ...")` 必须被 command policy 拦截。

## Policy MVP

先实现结构化 Java Rule：
- subject matcher
- action matcher
- resource matcher
- conditions
- effect
- priority

不要先自研 DSL parser。

## Gate

- Runtime 没有正常路径可以绕过 Tool Gateway 直接执行受治理工具；Built-in Tool 与 MCP Tool 都经过同一执行链。
- DENY 请求 100% 不产生副作用。
- arguments schema 验证失败不进入工具执行。
- Policy Decision 有 matched rules 和 reason code。
- `bash("git push ...")` 无法绕过 `git.push` 的审批策略。
- 至少一个 MCP Tool 完成端到端调用验证。
