# Control Plane Domain Design

## 1. 设计原则

Control Plane 使用 Spring Boot 模块化单体。每个 Domain 有独立 Application Service、Domain Model、Repository 和 API；禁止跨 Domain 直接访问对方表或 Repository。

推荐根包：

```text
com.example.agentplatform.controlplane
```

## 2. Domain Map

```text
Control Plane
├── workspace        租户/工作空间边界
├── identity         用户、服务身份、成员关系
├── agent            Agent Definition / Version（Agent Capability Model）
├── model            Model Catalog / Model Policy
├── tool             Tool Registry / Tool Provider / Tool Binding
├── policy           PDP / Policy Rule / Decision
├── approval         Human Approval
├── budget           Token / Cost 限额
├── release          Publish / Active Version / Rollback
├── audit            不可变审计记录
└── shared           ID、clock、outbox、error contract
```

## 3. workspace Domain

职责：隔离资源归属。

核心实体：
- Workspace
- WorkspaceSettings

核心规则：
- Agent、Tool、Policy、Budget 均属于 Workspace。
- 跨 Workspace ID 不允许关联。

MVP 不做复杂企业组织树。

## 4. identity Domain

职责：可信主体。

实体：
- User
- ServicePrincipal
- Membership
- RoleBinding

Subject 类型：
- USER
- AGENT
- SERVICE

重要：Agent Prompt 声称的身份不属于 Identity 输入。Subject 由服务端上下文注入。

## 5. agent Domain

职责：Agent 的定义和版本。

聚合：

```text
Agent
├── id
├── workspaceId
├── name
├── description
├── status
└── currentPublishedVersionId

AgentVersion（Agent Capability Model，见 docs/AGENT_CAPABILITY_MODEL.md）
├── versionNumber
├── engine: { type, config }       # 经 AgentEngineRegistry 解析（如 pi）
├── modelPolicyId
├── skills                         # Prompt / Instructions / Reference，无执行权限
├── toolBindings                   # 绑定 exact ToolVersion（builtin.* / MCP / HTTP）
├── toolPolicyId
├── budgetPolicyId
├── approvalPolicyId
├── checksum
└── state: DRAFT | PUBLISHED | DEPRECATED
```

规则：
- Published Version immutable；Agent Version Manifest（docs/AGENT_CAPABILITY_MODEL.md §7）是其冻结序列化。
- 修改 published 配置 → clone draft → publish new version。
- Runtime 只能通过 Published Version 启动正式 Run；Run 启动后绑定 exact Agent Version，不跟随后续配置改变。
- ToolBinding 绑定 exact ToolVersion，只表示“可以请求哪些精确版本的 Tool”，不等于授权；真正执行时仍必须经过 Policy 决策。
- 发布时冻结 exact ToolVersion；后续 MCP sync 产生新 ToolVersion 不影响已发布版本。

## 6. model Domain

职责：模型目录和路由策略，不负责真正调用模型。

实体：
- ModelProvider
- ModelDefinition
- ModelPolicy
- ModelRoute

例：

```text
modelPolicy: coding-default
primary: openai/gpt-main
fallback:
  - anthropic/claude-fallback
maxTokensPerCall: 32000
maxRetries: 2
```

Runtime 调用 Model Gateway 时只提交 logical model policy reference。

## 7. tool Domain

职责：统一 Tool 平台抽象与 Agent 工具授权配置。Tool 可以来自不同 Provider / Executor。

实体：
- ToolDefinition
- ToolVersion
- ToolBinding
- ToolPolicy
- McpServerDefinition

关系：

```text
ToolDefinition
├── ToolVersion
├── ToolPolicy
└── provider metadata

AgentVersion
↓
ToolBinding
↓
ToolVersion
```

ToolDefinition = Tool identity，包含：
- name（如 `builtin.read`、`github.create_pull_request`）
- provider: BUILTIN | MCP | HTTP（预留 future providers）
- providerRef（BUILTIN 为空 / mcpServerId / HTTP connector ref）
- riskLevel
- capability tags

ToolVersion = immutable executable contract，包含：
- input schema
- provider / executor binding
- version / checksum
- capability metadata

Built-in Tools 由 Runtime 注册（同样产生 ToolDefinition + ToolVersion，Built-in 不是版本概念的例外）：

```text
builtin.read
builtin.glob
builtin.grep
builtin.edit
builtin.write
builtin.bash
```

MCP Server 接入流程：

```text
MCP Server
↓
tools/list
↓
生成/更新 ToolDefinition
↓
生成新的 ToolVersion（schema/checksum 变化时）
↓
管理员选择具体 ToolVersion 绑定 Agent Version
```

注意：MCP sync 不允许静默改变已经 Published Agent Version 的 ToolBinding；已发布版本继续使用其冻结的 exact ToolVersion，历史 ToolVersion 保持可查询。

ToolBinding 绑定 exact ToolVersion，表示 Agent Version “可以请求哪些精确版本的 Tool”，但最终仍需 Policy 决策。Built-in Tool 与 MCP Tool 都必须经过 Tool Gateway 统一执行链（见 docs/AGENT_CAPABILITY_MODEL.md §5）。

## 8. policy Domain

职责：Policy Decision Point。

统一输入：

```json
{
  "subject": {},
  "action": "tool.invoke",
  "resource": {},
  "context": {}
}
```

统一结果：

```text
ALLOW
DENY
REQUIRE_APPROVAL
```

Decision 必须携带：
- decisionId
- matchedRuleIds
- reasonCode
- expiresAt（可选）

v1 先用 Java 结构化规则；Domain API 保持稳定，后续替换 OPA/Cedar 不影响 Runtime。

Policy input 中不接受 Agent 自报身份或 Prompt 声明（如 `approval=true`）作为可信输入。

## 9. approval Domain

职责：对特定动作进行人类授权。

聚合：ApprovalRequest

```text
PENDING
├─→ APPROVED
├─→ REJECTED
├─→ EXPIRED
└─→ CANCELLED
```

关键字段：
- runId
- actionType
- requestDigest
- requestedByAgentId
- requiredApproverScope
- expiresAt
- resolvedBy
- resolutionReason

`requestDigest` 绑定 tool + normalized arguments + resource + identity。Resume 时参数改变则 approval 无效。

## 10. budget Domain

职责：资源使用上限。

对象：
- BudgetPolicy
- BudgetWindow
- BudgetReservation
- UsageRecord

MVP 支持：
- maxTokensPerRun
- maxCostPerRun
- maxTokensPerDayPerAgent

关键链：

```text
Model Gateway wants model call
↓
reserve budget
↓
PASS → provider call
FAIL → BLOCK
↓
actual usage
↓
settle reservation
```

## 11. release Domain

职责：Agent Version 上线、默认流量与回滚。

对象：
- Release
- ReleaseHistory

MVP：单 active version，不做灰度百分比分流。

规则：
- Active Version 切换是原子操作。
- 旧 Run 继续使用创建时的 version。
- rollback 本质是将 active version 指回已发布历史版本。

## 12. audit Domain

职责：保存安全与治理事件，不承载业务状态。

记录：
- subject
- operation
- resource
- result
- correlationId / traceId
- before/after summary（必要时）
- sourceIp / client metadata（按隐私策略）

Audit append-only；普通业务 API 不提供 update/delete。

## 13. Domain 依赖方向

```text
workspace ← identity
workspace ← agent
agent → model (ID reference only)
agent → tool  (ID reference only)
agent → budget (ID reference only)
agent → policy (ID reference only)
release → agent
approval → policy decision context
budget ← model usage

audit ← domain events from all domains
```

禁止形成 Repository 层循环依赖。跨域协作通过 Application Service、Domain Event 或只读 Query Port。

## 14. 建议模块目录

```text
control-plane/src/main/java/.../
├── workspace/
│   ├── api/
│   ├── application/
│   ├── domain/
│   └── infrastructure/
├── identity/
├── agent/
├── model/
├── tool/
├── policy/
├── approval/
├── budget/
├── release/
├── audit/
└── shared/
```

不要先建立 `controller/service/mapper/repository` 的全局分层目录；按 Domain 垂直切片。
