# Architecture — Control Plane + Data Plane + 3 Gateways

## 1. 架构结论

v1 使用：**模块化单体 Control Plane + 独立 Agent Runtime（TypeScript Runtime Core + 可插拔 Agent Engine）+ 逻辑三网关 + 共享基础设施**。

不要在 MVP 阶段拆成十几个微服务。先稳定边界与契约，再按负载、团队和安全边界拆分。

```mermaid
flowchart TB
  U[Web / IDE / API / A2A] --> IG[Ingress Gateway / PEP]
  IG --> RT[Agent Runtime]

  CP[Control Plane / PDP]
  CP -->|Agent Version / Policy / Budget / Config| IG
  CP -->|Effective Runtime Config| RT

  RT --> MG[Model Gateway / PEP]
  RT --> TG[Tool Gateway / PEP]

  MG --> LLM[OpenAI / Anthropic / Private Models]
  TG --> TOOLS[BUILTIN / MCP / HTTP Tools]

  RT --> PG[(PostgreSQL)]
  CP --> PG
  RT --> REDIS[(Redis)]
  CP --> REDIS

  IG --> OTEL[OpenTelemetry]
  RT --> OTEL
  MG --> OTEL
  TG --> OTEL
  CP --> OTEL
```

## 2. Control Plane 与 Data Plane

### Control Plane
负责“定义允许发生什么”：
- Workspace / Identity / Membership
- Agent Registry / Version
- Model Policy
- Tool Registry / Tool Provider / Tool Policy
- Policy Decision
- Budget
- Approval
- Release / Rollback
- Audit Configuration

### Data Plane
负责“真正执行任务”：
- Ingress enforcement
- Session / Run
- Context
- Agent Loop（由 AgentEngine 提供，framework-specific）
- Workflow / DAG
- Model Call
- Tool Call
- Checkpoint
- Runtime Event Stream

关键约束：Data Plane 可以读取有效策略并请求决策，但不能修改策略本身。

## 3. 3 Gateways

### 3.1 Ingress Gateway
职责：认证、Workspace / User / Agent Identity、Rate Limit、请求 Scope、A2A 校验。

MVP 可以作为 Spring Boot Control Plane 的 API 入口模块实现；未来再单独拆 Spring Cloud Gateway / Envoy。

### 3.2 Model Gateway
职责：
- 逻辑模型 → Provider Route
- API Credential Isolation
- Budget Enforcement
- Token Limit
- Timeout / Retry / Fallback
- Usage metering

重要：业务 Agent 代码与 AgentEngine 都不得直接调用 Provider SDK；Model Call 由 Runtime Core 经 Model Gateway 执行。

### 3.3 Tool Gateway
职责：
- Tool lookup（ToolDefinition / ToolVersion）
- schema validation
- scope check
- policy enforcement
- approval binding
- executor dispatch（BUILTIN / MCP / HTTP）
- timeout / retry policy
- execution audit

所有 Tool——Built-in Tool 与 MCP Tool——都必须经过 Tool Gateway；所有会产生外部副作用的工具优先纳入 Tool Gateway。

## 4. PDP / PEP

```text
Agent requests action
        ↓
PEP (Gateway)
        ↓
Policy Decision Request
        ↓
PDP (Control Plane)
        ↓
ALLOW | DENY | REQUIRE_APPROVAL
        ↓
PEP 强制执行
```

PDP 负责“决定”；PEP 负责“不可绕过地执行决定”。

## 5. MVP 部署单元

```text
/apps/web-console
/services/control-plane
/services/agent-runtime
/infra/docker-compose
```

Control Plane 内部按领域模块组织，而不是物理微服务。

### 5.1 Agent Runtime：Runtime Core + 可插拔 Agent Engine

Agent Runtime 使用 **TypeScript Runtime Core + Pluggable Agent Engine Architecture**。Runtime Core 不依赖任何具体 Agent Framework。

```text
Runtime Core
↓
AgentEngineRegistry
↓
AgentEngine
├── PiEngine          # MVP 默认实现
├── LangGraphEngine   # future
└── NativeEngine      # future
```

Runtime Core 拥有：Run、Session、Agent Version Snapshot、State Machine、Checkpoint metadata、Tool Gateway、Model Gateway、Policy enforcement integration、Approval integration、Budget、Audit / Runtime Events。

AgentEngine 只负责 framework-specific 部分：Agent Loop、Context execution、Prompt execution、framework state、Tool Call / Model Call 生成。**Pi 只是 AgentEngine 的第一种实现，不是 Runtime Core 本身。**

Runtime 内部目录：

```text
runtime/
├── core/
│   ├── session
│   ├── run
│   ├── state-machine
│   ├── checkpoint
│   ├── model-gateway
│   ├── tool-gateway
│   └── event-stream
└── engines/
    ├── registry        # AgentEngineRegistry
    └── pi/             # PiEngine（唯一允许依赖 Pi SDK 的模块）
```

接口定义见 RUNTIME_CONTRACTS.md §10；能力组成见 AGENT_CAPABILITY_MODEL.md。

## 6. 受控状态迁移

Run 状态：

```text
CREATED
  ↓
RUNNING
  ├─→ WAITING_APPROVAL ─→ RUNNING
  ├─→ PAUSED ──────────→ RUNNING
  ├─→ FAILED
  ├─→ CANCELLED
  └─→ COMPLETED
```

Runtime 不允许任意写 `status`；必须调用状态机命令，例如：
- startRun
- requestApproval
- resumeAfterApproval
- failRun
- completeRun
- cancelRun

每个命令验证合法前态。

## 7. 一次 Tool Call 的完整链路

```mermaid
sequenceDiagram
  participant A as AgentEngine
  participant C as Runtime Core
  participant TG as Tool Gateway / PEP
  participant P as Policy Service / PDP
  participant AP as Approval Service
  participant T as Tool Executor (BUILTIN / MCP / HTTP)

  A->>C: ToolRequest(tool, args)
  C->>TG: invoke(tool, args, runIdentity)
  TG->>P: decide(subject, action, resource, context)
  P-->>TG: REQUIRE_APPROVAL
  TG->>AP: createApproval(requestDigest)
  TG-->>C: WAITING_APPROVAL
  Note over C: checkpoint + suspend
  AP-->>TG: approved by authorized user
  A->>C: resume
  C->>TG: resume(invokeRequestId)
  TG->>AP: validate approved request digest
  TG->>T: execute exact approved call
  T-->>TG: result
  TG-->>C: observation
  C-->>A: observation
```

审批绑定的是**确切 Action Request**，而不是泛化的“这个 Agent 已获批准”。如果参数变化，必须重新决策。Built-in Tool 与 MCP Tool 走完全相同的链路。

## 8. 数据一致性

### 强一致对象
- Agent Version publish
- Approval status
- Budget reservation / consume
- Release active version
- Run state transition

优先使用 PostgreSQL 事务。

### 最终一致对象
- Metrics
- Search index
- Aggregated usage dashboard
- Long-term analytics

使用 Outbox / background jobs 异步处理。

## 9. 事件模型

核心事件：
- AgentCreated
- AgentVersionPublished
- RunCreated
- RunStarted
- ModelCallCompleted
- ToolCallRequested
- PolicyDecisionMade
- ApprovalRequested
- ApprovalResolved
- ToolCallCompleted
- RunCompleted / RunFailed
- ReleaseActivated / RolledBack

MVP 不要求 Kafka。先用 Postgres Outbox + worker。

## 10. 安全边界

- Provider API Key 只存在于 Model Gateway secret storage。
- Tool credentials 只存在于 Tool Gateway / Connector secret storage。
- Runtime 获取的是 credential reference，而不是 secret 明文。
- Approval token 不进入 Prompt。
- Prompt 中 `approval=true`、`admin=true` 等内容没有任何授权意义；Policy evaluation input 中不接受 Agent 自报角色作为可信身份。
- 每次 Tool Call 使用服务器注入的 `agentId/userId/workspaceId/runId/versionId`。
- Agent 永远只能请求动作；Built-in Tool 与 MCP Tool 都必须经过 Tool Gateway（见 AGENT_CAPABILITY_MODEL.md §5、§8）。
- bash 不能成为权限逃生通道：若 `git.push` 需要 REQUIRE_APPROVAL，则不能通过 `bash("git push ...")` 绕开审批。shell executor 至少受 workspace sandbox、command policy、filesystem scope、network policy、environment / secret isolation 控制。

## 11. 未来拆分条件

只有出现下列情况才拆微服务：
- Model Gateway QPS 与 Runtime 明显不同。
- Tool Gateway 需要独立网络安全域。
- Approval / Policy 需要独立高可用和团队 ownership。
- Control Plane 单体发布频率成为瓶颈。
- 数据归属要求服务级隔离。

在此之前，保持模块化单体更容易保证事务和迭代速度。
