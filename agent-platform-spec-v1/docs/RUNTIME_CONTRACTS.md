# Runtime Contracts

## 1. Runtime 的职责

Agent Runtime 是执行引擎，不是控制策略的来源。

它拥有：
- Session
- Run execution
- Context assembly
- Agent loop
- Workflow / DAG
- Checkpoint
- Runtime events

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
  "effectiveConfigVersion": "...",
  "subject": {},
  "runtimeProfile": {},
  "modelPolicyRef": "...",
  "toolPolicyRef": "...",
  "budgetPolicyRef": "..."
}
```

Snapshot 中可以放引用与已解析的非敏感配置，但不能放 Provider Secret。

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

Runtime 为请求附加可信 Identity，然后提交 Gateway。

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

Provider response 不得绕过 Gateway 直接写 Run 状态。

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

## 10. Harness Adapter

Runtime 核心不能直接依赖 Pi 的具体 API，增加 Adapter：

```text
AgentRuntimeCore
      ↓
HarnessPort
      ↓
PiHarnessAdapter
```

未来替换其他 Agent SDK 时，Control Plane、Gateway 和 Run 状态模型不需要重写。
