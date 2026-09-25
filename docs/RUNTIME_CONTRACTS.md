# Runtime Contracts

## 1. Runtime 的职责

Agent Runtime 是执行引擎，不是控制策略的来源。

Agent Runtime 采用 **TypeScript Runtime Core + 可插拔 Agent Engine** 架构（见 ARCHITECTURE.md §5）。Runtime Core 不依赖任何具体 Agent Framework；Pi 只是 AgentEngine 的第一种实现，不是 Runtime Core 本身。

Runtime Core 拥有：
- Run
- Session
- Agent Version Snapshot
- State Machine
- Checkpoint metadata
- Tool Gateway
- Model Gateway
- Policy enforcement integration
- Approval integration
- Budget
- Audit / Runtime Events

AgentEngine 只拥有 framework-specific 部分：
- Agent Loop
- Context execution
- Prompt execution
- framework state
- Tool Call / Model Call 生成（作为请求提交给 Runtime Core）

它不拥有：
- Agent published definition
- Policy rules
- Approval truth
- Budget policy
- Release state
- Provider secrets
- Tool secrets

## 2. Run Start Contract

Control Plane / Ingress 创建 Run 时生成不可变 Execution Snapshot：

```json
{
  "runId": "...",
  "workspaceId": "...",
  "agentId": "...",
  "agentVersionId": "...",
  "agentVersionManifest": {
    "engine": { "type": "pi", "config": {} },
    "modelPolicy": "coding-default",
    "skills": [],
    "tools": []
  },
  "effectiveConfigVersion": "...",
  "subject": {},
  "modelPolicyRef": "...",
  "toolPolicyRef": "...",
  "budgetPolicyRef": "..."
}
```

Snapshot 绑定 exact Published Agent Version；manifest 为其冻结内容（见 AGENT_CAPABILITY_MODEL.md §7），Run 生命周期内不跟随配置变化。Snapshot 中可以放引用与已解析的非敏感配置，但不能放 Provider Secret。

## 3. Runtime 状态机

```text
CREATED → RUNNING
RUNNING → WAITING_APPROVAL
RUNNING → PAUSED
RUNNING → COMPLETED
RUNNING → FAILED
RUNNING → CANCELLED
WAITING_APPROVAL → RUNNING
WAITING_APPROVAL → CANCELLED
PAUSED → RUNNING
PAUSED → CANCELLED
```

任何非法迁移返回 conflict，不直接覆盖 status。

## 4. Action Request

Agent 永远输出 Action Request：

```json
{
  "runId": "r1",
  "stepId": "s12",
  "actionType": "tool.invoke",
  "tool": "git.push",
  "arguments": {},
  "idempotencyKey": "..."
}
```

Runtime 为请求附加可信 Identity，然后提交 Tool Gateway。

统一执行链（Built-in Tool 与 MCP Tool 一致，见 AGENT_CAPABILITY_MODEL.md §5）：

```text
AgentEngine
↓
ToolRequest
↓
Runtime Core
↓
Tool Gateway
↓
Policy
↓
ALLOW / DENY / REQUIRE_APPROVAL
↓
Executor
```

AgentEngine 不直接执行任何 Tool；Built-in Tool 也没有绕过 Tool Gateway 的本地路径。

## 5. Tool Gateway Response

```text
EXECUTED
DENIED
WAITING_APPROVAL
RETRYABLE_FAILURE
NON_RETRYABLE_FAILURE
```

如果 `WAITING_APPROVAL`：
1. 保存 checkpoint。
2. 将 Run 迁移到 WAITING_APPROVAL。
3. 结束当前执行线程，不 busy wait。
4. Approval resolved 后由服务事件触发 resume。

## 6. Model Gateway Contract

Request：
- run identity
- model policy ref
- messages/context reference
- structured output schema（可选）
- timeout class

Gateway 必须完成：
- budget reserve
- provider route
- timeout/retry/fallback
- usage settle
- event/audit metadata

Provider response 不得绕过 Gateway 直接写 Run 状态。AgentEngine 同样不得直接调用 Provider SDK——Model Call 由 Runtime Core 经 Model Gateway 执行。

## 7. Checkpoint

最小 checkpoint：

```text
runId
agentVersionId
stepIndex
workflowState
conversation/context references
pendingAction
lastObservation
createdAt
```

Checkpoint metadata 与存储由 Runtime Core 拥有；framework state（engine 内部对话 / 图状态）由 AgentEngine 序列化提供，前提是其 EngineCapabilities 声明支持 checkpoint。

必须保证“审批前 suspend → 审批后 resume”不需要重新执行已完成副作用。

## 8. Idempotency

高风险 Tool Call 必须带 `idempotencyKey`。

Tool Gateway 保存：

```text
(workspaceId, toolName, idempotencyKey) -> execution result
```

Runtime 崩溃后重试时，不重复执行 git push / deploy / email 等副作用。

## 9. Runtime Event Stream

建议统一事件：
- run.started
- agent.message
- model.call.started/completed
- tool.call.requested/completed
- policy.denied
- approval.requested/resolved
- checkpoint.created
- run.completed/failed

Web Console 通过 SSE 或 WebSocket 订阅；MVP 推荐 SSE。

## 10. Agent Engine 抽象

Runtime Core 不依赖任何具体 Agent Framework。抽象层级：

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

AgentEngine 最小接口只抽象稳定能力：

```ts
interface AgentEngine {
  readonly id: string; // "pi" | "langgraph" | "native" | ...
  capabilities(): EngineCapabilities;
  start(request: EngineStartRequest): Promise<EngineHandle>;
  resume(request: EngineResumeRequest): Promise<EngineHandle>;
  cancel(handle: EngineHandle): Promise<void>;
}

interface EngineCapabilities {
  streaming: boolean;
  checkpoint: boolean;       // engine 内部 framework state 可序列化
  interruptResume: boolean;  // 支持 suspend / resume
  toolCalling: boolean;
  structuredOutput: boolean;
  multiAgent: boolean;
}
```

AgentEngineRegistry 负责：

```text
register(engine: AgentEngine)
get(engineId: string): AgentEngine   // manifest engine.type → engine 实例
list(): EngineDescriptor[]
```

职责边界：

| Runtime Core 拥有 | AgentEngine 拥有 |
|---|---|
| Run / Session / Agent Version Snapshot | Agent Loop |
| State Machine | Context execution |
| Checkpoint metadata（framework state 由 engine 序列化提供） | Prompt execution |
| Tool Gateway / Model Gateway | framework state |
| Policy enforcement integration / Approval integration | Tool Call / Model Call 生成 |
| Budget / Audit / Runtime Events | |

依赖规则：

- 只有 `engines/<engine>/` 模块允许 import 对应 framework SDK（如 Pi SDK）；Runtime Core 及其他模块禁止。
- AgentEngine 不直接调用 Provider 或执行 Tool；它生成 Model Call / Tool Call 请求，由 Runtime Core 经 Gateway 执行并回填 observation。
- 不为兼容未来所有 Framework 设计复杂 SPI；接口保持以上最小面。
- MVP 只实现 PiEngine；LangGraphEngine / NativeEngine 仅为预留命名。
