# API Contracts — MVP Surface

## 1. API 原则

- REST 管理控制面；SSE 用于 Run Event Stream。
- API 不允许客户端直接提交受保护的状态字段。
- 状态变化通过 command endpoint（`:command`），而不是通用 PATCH。
- 所有写接口支持 request/correlation id；关键副作用支持 idempotency key。
- workspaceId 解析规则：Employee 面向的 API（`/api/me/...`、`/api/conversations`、`/api/tasks`、`/api/skills` 等）从认证会话解析 workspaceId，不接受路径参数传入；`/api/workspaces/{workspaceId}/...` 保留给 Administration 显式上下文。
- 授权重点不是路径名称，而是冻结：谁能做什么、对象关系、状态语义、exact version binding。

## 2. Agent（含 Personal Agent）

```text
POST   /api/workspaces/{workspaceId}/agents        # Administration：创建 Agent（含 TEMPLATE）
GET    /api/workspaces/{workspaceId}/agents
GET    /api/agents/{agentId}
PATCH  /api/agents/{agentId}

GET    /api/me/agents                              # 当前用户的 Personal Agent 列表
POST   /api/agents                                 # 创建 Personal Agent（scope=PERSONAL 固定，owner=当前用户）

POST   /api/agents/{agentId}/versions
GET    /api/agents/{agentId}/versions
GET    /api/agent-versions/{versionId}
POST   /api/agent-versions/{versionId}:publish
POST   /api/agent-versions/{versionId}:deprecate

POST   /api/agents/{agentId}:enable                # Agent.status → ENABLED（可用）
POST   /api/agents/{agentId}:disable               # Agent.status → DISABLED（已停用）
```

创建 / 修改 Version 的 payload 携带 Agent Version Manifest（engine / modelPolicy / skills / tools，见 docs/AGENT_CAPABILITY_MODEL.md §7），以及 budgetPolicyId / approvalPolicyId。`tools` 必须提交 exact `toolVersionId`，`skills` 必须提交 exact `skillVersionId`（`name` 仅用于展示）：

```json
{
  "tools": [ { "toolVersionId": "tv_123" } ],
  "skills": [ { "name": "java-backend", "skillVersionId": "sv_456" } ]
}
```

约束：

- 候选 Model / Skill / Tool 全部来自当前用户的 Effective Capability；服务端校验越权候选（如无权 ToolVersion）直接 403。
- 禁止 `PATCH published AgentVersion`。
- Agent.status 只有 `ENABLED | DISABLED`（UI：可用 / 已停用）；不存在 RUNNING / STOPPED。

## 3. Agent Templates

```text
GET  /api/agent-templates?scope=WORKSPACE|TEAM
GET  /api/agent-templates/{id}
POST /api/agent-templates/{versionId}:clone       # Clone Published Template Version → Personal Agent Draft
```

- 模板本身是 `kind = TEMPLATE` 的 Agent，复用 §2 的版本端点管理。
- Clone 语义：Snapshot Copy，创建 Personal Agent Draft 并记录 `sourceTemplateVersionId`；模板后续更新不影响 Clone 结果（见 USER_AND_RESOURCE_MODEL.md §5）。
- Clone 响应返回新 Personal Agent 与 Draft AgentVersion；后续走 §2 的 publish 流程。

## 4. Release

```text
POST /api/agents/{agentId}/releases
POST /api/agents/{agentId}:rollback
GET  /api/agents/{agentId}/releases
```

## 5. Task 与 Run

### Task

```text
POST /api/tasks                    # 创建 Task：固定 agentId + agentVersionId（exact Published AgentVersion）
GET  /api/tasks
GET  /api/tasks/{id}

POST /api/tasks/{id}/messages      # 新用户指令 → 新 Run；响应返回 runId
GET  /api/tasks/{id}/runs          # Task 的 Run 列表
POST /api/tasks/{id}:archive       # Task.status → ARCHIVED
```

Task 创建 / 消息请求不接受 `agentVersionId` 变更；Task 生命周期内固定创建时的 Published Version（升级必须显式操作，MVP 不做自动升级）。

### Run

```text
GET  /api/runs/{runId}
POST /api/runs/{runId}:cancel
POST /api/runs/{runId}:resume      # Approval / Pause Resume → 恢复原 Run，不新建 Run
GET  /api/runs/{runId}/events      # SSE
GET  /api/runs/{runId}/trace
```

执行规则（冻结）：**New user instruction → New Run；Approval / Pause Resume → Same Run**（见 RUNTIME_CONTRACTS.md §3b）。

`POST /api/agents/{agentId}/runs` 保留为平台内部 / 管理性执行入口（run.task_id 为空），不在 Employee 产品面使用。

## 6. Approval

```text
GET  /api/approvals?status=PENDING
GET  /api/approvals/{approvalId}
POST /api/approvals/{approvalId}:approve
POST /api/approvals/{approvalId}:reject
GET  /api/me/approvals             # Employee：与我的 Task 相关的待审批
```

- Approve body 可以包含 comment，但不能修改原始 tool arguments。
- UI 入口（Task Inspector → Approval、More → My Approvals、Administration → Approvals）不作为授权依据；权限仍由 Approval Service 控制。

## 7. Tools

Tool 列表包含 `builtin.*`（由 Runtime 注册，provider = BUILTIN）与 MCP / HTTP Provider 的 Tool。

```text
POST /api/tools                      # 仅用于注册 HTTP provider Tool
GET  /api/tools
GET  /api/tools/{toolId}
GET  /api/tools/{toolId}/versions    # 历史 ToolVersion 列表，供绑定选择
PATCH /api/tools/{toolId}            # 不允许修改 builtin.* / MCP 同步的 schema
POST /api/tools/{toolId}:disable

POST /api/mcp-servers
GET  /api/mcp-servers
GET  /api/mcp-servers/{id}
POST /api/mcp-servers/{id}:sync      # tools/list → 同步 ToolDefinition / ToolVersion
POST /api/mcp-servers/{id}:disable

POST /api/tool-policies
GET  /api/tool-policies/{id}
PATCH /api/tool-policies/{id}
```

MCP sync 产生“可绑定候选”（ToolDefinition + ToolVersion）；管理员必须显式选择具体 ToolVersion 绑定到 Agent Version（ToolBinding）。绑定不等于授权，执行仍需 Policy 决策。

如果 MCP sync 产生新 ToolVersion，旧版本必须仍然可查询（`GET /api/tools/{toolId}/versions`），不能被原地覆盖。MCP sync 不允许静默改变已经 Published Agent Version 的 ToolBinding。

## 8. Models

```text
GET  /api/models                    # Administration：模型目录
GET  /api/me/models                 # Employee：“我当前允许使用哪些模型”（Effective Capability 候选集）
POST /api/model-policies
GET  /api/model-policies/{id}
PATCH /api/model-policies/{id}
```

Provider credentials 使用单独 secret management API，响应永远不返回明文 secret。Employee 不能编辑 API Key / Provider Endpoint Secret / Fallback Secret。

## 9. Policy

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

## 10. Budget

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

## 11. Teams

```text
GET /api/teams
GET /api/teams/{id}
GET /api/teams/{id}/members
```

Administration 管理端按需增加写 API（创建 Team、调整 TeamMember、Team Policy 配置）。

## 12. Skills

### Skill 与 SkillVersion

```text
GET  /api/skills?scope=WORKSPACE|TEAM|PERSONAL
GET  /api/skills/{id}
GET  /api/skills/{id}/versions

POST /api/skills                          # Employee 固定 scope=PERSONAL；Admin 可创建 WORKSPACE / TEAM Skill
POST /api/skill-versions/{id}:publish
POST /api/skill-versions/{id}:clone       # Clone Published SkillVersion → Personal Skill Draft
```

### Skill Category（Admin 管理）

```text
GET   /api/skill-categories
POST  /api/skill-categories               # 仅 Platform Admin
PATCH /api/skill-categories/{id}          # 仅 Platform Admin
```

普通用户不能创建 / 修改 Category；Skill.categoryId NOT NULL。

### Skill Enablement

```text
POST   /api/me/skills/{skillId}:enable
POST   /api/me/skills/{skillId}:disable
```

约束：

- Clone 语义与 Agent Template 一致：Snapshot Copy，记录 `sourceSkillVersionId`，不建立实时继承。
- Published SkillVersion immutable；Skill 更新走新 SkillVersion。
- Employee 不能创建 Skill Category，不能修改 Workspace / Team Skill 本体。

## 13. Conversations

```text
POST   /api/conversations                       # 新建会话（可带 defaultModelPolicyId）
GET    /api/conversations
GET    /api/conversations/{id}

POST   /api/conversations/{id}/messages         # 多轮对话；必经 Model Gateway
GET    /api/conversations/{id}/messages

POST   /api/conversations/{id}/skills           # /skill 导入：body 携带 skillVersionId（exact）
DELETE /api/conversations/{id}/skills/{skillVersionId}
```

约束：

- Conversation 不绑定 Agent，不产生 Run；服务端拒绝任何携带 agentId 的 Conversation 请求。
- Skill 绑定写入 ConversationSkillBinding（exact SkillVersion）；添加 / 移除不重写历史消息。
- 每条 Assistant 消息的 metadata 记录实际使用的 modelPolicy / provider / model / usage。
- MVP Conversation 不执行 Tool；不接受 tool 相关字段。

## 14. Skill Picker / Model Selector 支撑查询

```text
GET /api/me/skill-candidates?scope=WORKSPACE|TEAM|PERSONAL&categoryId=...
GET /api/me/model-candidates
```

Agent Editor 与 Conversation `/skill` 复用同一 Skill Picker 数据源（Effective Capability 过滤后的候选集）。

## 15. Error Contract

```json
{
  "code": "RUN_INVALID_STATE",
  "message": "Run cannot be resumed from COMPLETED",
  "correlationId": "...",
  "details": {}
}
```

前端逻辑依据 `code`，不要解析 message。
