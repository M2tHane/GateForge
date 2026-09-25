# API Contracts — MVP Surface

## 1. API 原则

- REST 管理控制面；SSE 用于 Run Event Stream。
- API 不允许客户端直接提交受保护的状态字段。
- 状态变化通过 command endpoint，而不是通用 PATCH。
- 所有写接口支持 request/correlation id；关键副作用支持 idempotency key。

## 2. Agent

```text
POST   /api/workspaces/{workspaceId}/agents
GET    /api/workspaces/{workspaceId}/agents
GET    /api/agents/{agentId}
PATCH  /api/agents/{agentId}

POST   /api/agents/{agentId}/versions
GET    /api/agents/{agentId}/versions
GET    /api/agent-versions/{versionId}
POST   /api/agent-versions/{versionId}:publish
POST   /api/agent-versions/{versionId}:deprecate
```

禁止 `PATCH published AgentVersion`。

## 3. Release

```text
POST /api/agents/{agentId}/releases
POST /api/agents/{agentId}:rollback
GET  /api/agents/{agentId}/releases
```

## 4. Run

```text
POST /api/agents/{agentId}/runs
GET  /api/runs/{runId}
POST /api/runs/{runId}:cancel
POST /api/runs/{runId}:resume
GET  /api/runs/{runId}/events        # SSE
GET  /api/runs/{runId}/trace
```

创建 Run 请求不接受 `agentVersionId` 时使用当前 active version；响应中必须返回最终固定 versionId。

## 5. Approval

```text
GET  /api/approvals?status=PENDING
GET  /api/approvals/{approvalId}
POST /api/approvals/{approvalId}:approve
POST /api/approvals/{approvalId}:reject
```

Approve body 可以包含 comment，但不能修改原始 tool arguments。

## 6. Tools

```text
POST /api/tools
GET  /api/tools
GET  /api/tools/{toolId}
PATCH /api/tools/{toolId}
POST /api/tools/{toolId}:disable

POST /api/tool-policies
GET  /api/tool-policies/{id}
PATCH /api/tool-policies/{id}
```

## 7. Models

```text
GET  /api/models
POST /api/model-policies
GET  /api/model-policies/{id}
PATCH /api/model-policies/{id}
```

Provider credentials 使用单独 secret management API，响应永远不返回明文 secret。

## 8. Policy

管理：

```text
POST /api/policies
GET  /api/policies
PATCH /api/policies/{id}
POST /api/policies/{id}:enable
POST /api/policies/{id}:disable
```

内部决策：

```text
POST /internal/policy-decisions
```

仅 Data Plane service identity 可访问。

## 9. Budget

```text
POST /api/budget-policies
GET  /api/budget-policies/{id}
PATCH /api/budget-policies/{id}
GET  /api/usage?agentId=...
```

内部：

```text
POST /internal/budget/reservations
POST /internal/budget/reservations/{id}:settle
POST /internal/budget/reservations/{id}:release
```

## 10. Error Contract

```json
{
  "code": "RUN_INVALID_STATE",
  "message": "Run cannot be resumed from COMPLETED",
  "correlationId": "...",
  "details": {}
}
```

前端逻辑依据 `code`，不要解析 message。
