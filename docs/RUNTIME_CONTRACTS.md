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
- Conversation / Task 的 user-work 执行状态（见 §6b、§11；域归属见 USER_AND_RESOURCE_MODEL.md §7）

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
  "taskId": "...",
  "workspaceId": "...",
  "agentId": "...",
  "agentVersionId": "...",
  "agentVersionManifest": {
    "engine": { "type": "pi", "config": {} },
    "modelPolicy": "coding-default",
    "skills": [
      { "name": "java-backend", "skillVersionId": "sv_java_backend_3" }
    ],
    "tools": [
      { "name": "builtin.read", "toolVersionId": "tv_builtin_read_v1" }
    ]
  },
  "effectiveConfigVersion": "...",
  "subject": {},
  "modelPolicyRef": "...",
  "toolPolicyRef": "...",
  "budgetPolicyRef": "..."
}
```

Snapshot 绑定 exact Published Agent Version；manifest 为其冻结内容（含 exact ToolVersion 与 exact SkillVersion，见 AGENT_CAPABILITY_MODEL.md §7），Run 生命周期内不跟随配置变化，也不动态解析 ToolDefinition / SkillDefinition 的“最新版本”。Snapshot 中可以放引用与已解析的非敏感配置，但不能放 Provider Secret。

所有 Employee 产品面发起的 Run 都由 Task 创建（`taskId` 必填）；`taskId` 为空的 Run 仅保留给平台内部 / 管理性执行，不在 Employee 产品面暴露（见 API_CONTRACTS.md §4）。

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

注意：Run 状态机只属于执行实例。Agent.status = ENABLED | DISABLED（可用 / 已停用），Task.status = ACTIVE | ARCHIVED；不要把 RUNNING / WAITING_APPROVAL 等执行状态放到 Agent 或 Task 上（见 USER_AND_RESOURCE_MODEL.md §5.4、§7）。

## 3b. Task → Run 执行规则

```text
Task ≠ Run
```

- Task 创建时固定 `agentId` + `agentVersionId`（exact Published AgentVersion）；Task 创建后两者不可通过普通 API 修改（消息 API 不接受，见 API_CONTRACTS.md §5）；Task 生命周期内不自动跟随 Agent 后续新 Version，升级必须显式操作（MVP 不做自动升级）。
- **New user instruction → New Run**：Task 中每条新的用户指令创建一个新 Run（共享 Task 上下文与固定 AgentVersion）。
- **Approval / Pause Resume → Same Run**：Run 进入 WAITING_APPROVAL / PAUSED 后，批准或恢复继续**同一个 Run**，不新建 Run。
- MVP 固定：1 Task → 1 Agent → 1 exact Published AgentVersion → 1 AgentEngine；Multi-Agent 留到后续 Stage。

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

ToolRequest 在 Runtime 内部解析后必须得到 `toolDefinitionId` + `toolVersionId`；Tool Gateway 针对 exact ToolVersion 执行（schema 校验、审计、idempotency 均以 ToolVersion 为准）。执行时不允许动态取 ToolDefinition 的“最新版本”，保证历史 Run 确定性、可重放。

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
- execution identity（Run 驱动或 Conversation 驱动，见 §6b；两者必居其一）
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

ModelCall 记录兼容两种驱动来源（Run 驱动 / Conversation 驱动），共用同一套记录与 usage 体系，不复制两套系统；每次调用记录实际使用的 modelPolicy / provider / model / usage（见 DATA_MODEL.md model_call）。

## 6b. Conversation Contract（普通对话链路）

```text
Conversation ≠ Task：Conversation 不绑定 Agent、不经过 AgentEngine、不产生 Run。
```

执行链：

```text
Employee
↓
Conversation
↓
Ingress
↓
Conversation Runtime（runtime/conversation 模块，Data Plane 内独立模块，非新部署服务）
↓
Model Gateway
↓
LLM
↓
ConversationMessage
```

- Conversation 必须使用 Model Gateway，**禁止直接调用 Provider SDK**。
- Conversation 保存 `defaultModelPolicyId`；用户可中途切换 Model，历史消息不改变，只影响后续调用；每次 Assistant Model Call 记录实际使用的 modelPolicy / provider / model / usage。
- `/skill` 通过统一 Skill Picker 导入 Skill，产生 ConversationSkillBinding（conversationId + exact SkillVersion）；Skill 只注入上下文：
  - 不获得 Tool 权限，不经过 Tool Gateway；
  - 不修改 Agent、Policy、Approval、Budget 等任何控制状态；
  - 添加 / 移除 Skill 不重写历史消息；源 Skill 更新不改变已绑定的 exact SkillVersion。
- MVP Conversation 不执行任何 Tool。

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
(workspaceId, toolVersionId, idempotencyKey) -> execution result
```

Runtime 崩溃后重试时，不重复执行 git push / deploy / email 等副作用。

## 9. Runtime Event Stream

建议统一事件：
- run.started
- agent.message
- model.call.started/completed        # Run 驱动与 Conversation 驱动共用
- tool.call.requested/completed
- policy.denied
- approval.requested/resolved
- checkpoint.created
- conversation.message.completed
- task.run.created
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
