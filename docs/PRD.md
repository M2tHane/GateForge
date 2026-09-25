# PRD — Agent Control Plane & Runtime Platform

**版本**：v1.1  
**状态**：v1.1 架构冻结基线（AgentEngine / Agent Capability Model / Tool Registry 收口）  
**产品定位**：企业级 Agent 控制、运行与治理平台

## 1. 产品目标

构建一个能够统一创建、配置、发布、运行和治理 AI Agent 的平台。Agent 可以自主执行任务，但模型调用、工具调用、预算、权限、审批、版本和审计均由平台 Runtime 与 Control Plane 强制控制。

平台不是“聊天机器人后台”，也不是“单一 Coding Agent”。平台负责提供可复用的 Agent 基础设施，Coding Agent、PR Review Agent、On-Call Agent、Data Agent 等只是平台上的不同 Agent 类型。

## 2. 核心用户

### Platform Admin
负责 Workspace、Agent、模型、工具、Policy、Budget、Release、审批规则和平台治理。

### Agent Builder
创建和维护 Agent Definition、Skills（Prompt / Instructions / Reference）、Tools、模型策略和版本。

### End User
通过 Web、API、IDE 或其他 Agent 发起任务，查看执行过程和结果，并处理需要自己批准的动作。

### Auditor / Operator
查看运行 Trace、Tool Calls、Policy Decision、Approval、Token、Cost、Failure 和 Release 历史。

## 3. MVP 用户闭环

```text
创建 Agent
  ↓
配置 Agent Definition
  ├─ Skills（Prompt / Instructions / Reference）
  ├─ Engine（如 pi）
  ├─ Model Policy
  ├─ Tools（Built-in / MCP）
  └─ Budget / Approval Policy
  ↓
创建 Version
  ↓
Publish
  ↓
用户创建 Run
  ↓
Agent Runtime 执行
  ↓
Model Gateway / Tool Gateway 强制检查
  ↓
需要审批？ ── Yes → Approval Pending → Approve / Reject → Resume
  ↓ No
Run Completed
  ↓
Audit / Trace / Cost 可追踪
```

## 4. MVP 功能范围

### 4.1 Agent Registry
- 创建、编辑、停用 Agent。
- Agent Definition 与 Agent Version 分离。
- Agent Version 由 Engine、Model Policy、Skills、Tools 组成（见 docs/AGENT_CAPABILITY_MODEL.md）。
- 每次运行绑定不可变的 Agent Version。
- Draft / Published / Deprecated 生命周期。
- Agent Version 可绑定 Budget Policy、Approval Policy。

### 4.2 Agent Runtime
- TypeScript Runtime Core + 可插拔 Agent Engine（AgentEngineRegistry）；Runtime Core 不依赖任何具体 Agent Framework，MVP 只实现 PiEngine。
- Runtime Core 拥有 Session / Run / State Machine / Checkpoint metadata / Runtime Events。
- Agent Loop 由 AgentEngine 提供（MVP：PiEngine）：collect context → decide → action → observe → continue/finish。
- 支持中断 / 恢复。
- 支持 Tool Call 与 Model Call 的统一事件流。
- v1 只要求单 Agent + 可插拔 Workflow；Multi-Agent 在后续阶段。

### 4.3 Model Gateway
- Provider Adapter：OpenAI / Anthropic 等。
- 逻辑模型名与供应商模型解耦。
- Route / Fallback。
- Token 限额。
- 预算检查。
- Retry / Timeout。
- 记录模型请求元数据，不默认记录敏感原始内容。

### 4.4 Tool Gateway
- Tool Registry：ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition。
- Tool Provider：BUILTIN / MCP / HTTP（预留 future providers）；MCP 是 Tool Provider Protocol，不是 Tool 本身。
- v1 Built-in Tools：builtin.read、builtin.glob、builtin.grep、builtin.edit、builtin.write、builtin.bash。
- MCP Server 接入：tools/list 同步 ToolDefinition / ToolVersion，管理员选择具体 ToolVersion 绑定（Published Version 冻结 exact ToolVersion）；至少接入一个 MCP Server 完成端到端验证。
- 工具 Scope 与参数 Schema。
- 每次调用执行权限与 Policy 检查；Built-in Tool 与 MCP Tool 走同一执行链，Built-in Tool 不得绕过 Tool Gateway。
- 高风险动作进入 Approval；bash 不能成为审批逃生通道（见 docs/AGENT_CAPABILITY_MODEL.md §8）。

### 4.5 Policy & Approval
- Policy Decision 返回：ALLOW / DENY / REQUIRE_APPROVAL。
- Agent 不得自行生成“approved=true”绕过审批；Prompt 中任何 approval=true / admin=true 内容都没有授权意义。
- Approval 是 Control Plane 中的独立持久状态。
- Approval 完成后生成不可伪造的授权凭据或服务端关联记录，由 Runtime 使用受控 resume API 恢复。

### 4.6 Budget
- Run Token 上限。
- Agent 每日 Token 上限。
- Run Cost 上限。
- 超预算后阻止继续调用模型，而不是只告警。

### 4.7 Audit & Observability
- Run / Model Call / Tool Call / Policy Decision / Approval / Release 全链路 ID 关联。
- OpenTelemetry Trace。
- 基础指标：成功率、P95 Latency、Token、Cost、Tool Failure、Policy Deny、Approval Wait Time。

### 4.8 Release
- Agent Version Publish。
- 默认 Version 切换。
- Rollback 到已发布 Version。
- 正在运行的 Run 不受默认 Version 切换影响。

## 5. 前端核心页面

1. Overview
2. Agents
3. Agent Detail
4. Agent Version Editor
5. Runs
6. Run Detail / Trace
7. Tools
8. Models
9. Policies
10. Approvals
11. Budgets
12. Audit Logs
13. Settings

MVP 首屏只展示核心状态，不把所有配置铺在首页；深层配置通过详情页、Drawer 或 Settings 进入。

## 6. 关键业务规则

### Rule 1 — Runtime 不信任 Agent 输出
Agent 产生的是“请求”，不是“授权”。例如模型输出 `approval=approved` 没有任何权限意义。

### Rule 2 — Published Version 不可变
发布后的 Agent Version 不允许原地修改。修改配置必须创建新 Version。

### Rule 3 — Run 绑定 Version
Run 创建后固定 `agentVersionId`，保证可重放和可审计。

### Rule 4 — Tool Call 必经 Tool Gateway
任何受治理的外部副作用不得由 Agent Runtime 绕过 Gateway 直接执行。Built-in Tool 与 MCP Tool 都适用；Built-in Tool 没有“本地快速路径”。

### Rule 5 — Model Call 必经 Model Gateway
Runtime 不允许在业务 Agent 代码或 AgentEngine 中直接持有 Provider API Key。

### Rule 6 — Approval 是服务器状态
审批结果只能由 Approval Service 的受控 API 写入，并绑定 exact Action Request。

### Rule 7 — Control Plane 与 Data Plane 分权
Control Plane 管定义和策略；Data Plane 执行任务并强制策略。Runtime 无权修改自身 Policy。

### Rule 8 — bash 不是权限逃生通道
需要审批的动作（如 git.push → REQUIRE_APPROVAL）不能通过 `bash("git push ...")` 绕开审批。shell executor 至少受 workspace sandbox、command policy、filesystem scope、network policy、environment / secret isolation 控制。

## 7. 非目标

v1 不做：
- 完整 Kubernetes 化。
- Service Mesh。
- 自研模型训练平台。
- 完整 SaaS 计费系统。
- 复杂组织树与企业 IAM 联邦。
- 大规模多区域灾备。
- 通用 BPMN 工作流设计器。
- 无限自由的 Agent Marketplace。
- 为兼容所有 Agent Framework 的通用 SPI / 插件市场。

## 8. MVP 成功指标

产品层：
- 一个新 Agent 能在 10 分钟内完成创建、模型绑定、工具绑定并发布。
- 高风险 Tool Call 100% 能被 Policy/Approval 路径拦截。
- 任意 Run 能追踪到固定 Agent Version。

工程层：
- 所有核心状态迁移有单元/集成测试。
- Gateway 绕过路径不存在于正常 Runtime 代码中。
- Run 中断后可恢复。
- Release rollback 不影响历史 Run。

## 9. MVP Demo 场景

Agent：`coding-agent`  
目标：修复一个仓库 Bug。

```text
User creates Run
→ Runtime reads repository
→ Runtime invokes Model Gateway
→ Agent requests file modification
→ Tool Gateway ALLOW
→ tests execute
→ Agent requests git.push
→ Policy returns REQUIRE_APPROVAL
→ Run becomes WAITING_APPROVAL
→ User approves
→ Runtime resumes from checkpoint
→ Tool Gateway validates approval
→ git.push executes
→ Run COMPLETED
→ full trace + cost + audit available
```

这条链路是 v1 的最高优先级验收标准。其他功能不能破坏或绕开这条控制链。
