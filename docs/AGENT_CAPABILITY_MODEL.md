# Agent Capability Model

本文档正式定义 GateForge 中 Agent Version 的能力组成、Skill 与 Tool 的边界、Tool Provider 模型和统一执行链。它是 Agent Definition / Agent Version / Tool Registry 相关实现的契约来源，与 PRD、ARCHITECTURE、RUNTIME_CONTRACTS、CONTROL_PLANE_DOMAINS 保持一致；发生冲突时按 DEVELOPMENT_GUARDRAILS 的 Source of Truth 顺序处理。

## 1. Agent Version 组成

```text
Agent Version
├── Engine            # 用哪个 AgentEngine 执行（如 pi）
├── Model Policy      # 经 Model Gateway 的模型路由与限额策略
├── Skills            # Prompt / Instructions / Reference
└── Tools             # Agent 可以请求执行的能力
    ├── Built-in Tools
    └── MCP Tools
```

规则：

- Agent Version 一旦 PUBLISHED 即不可变；其冻结序列化就是 Agent Version Manifest（见 §7）。
- Run 启动后绑定 exact Agent Version，不跟随后续配置改变。
- Tools 只表示“允许请求”，不表示“允许执行”；真正执行与否由 Policy 决定。
- Tools 绑定到 **exact ToolVersion**；Agent Version 发布时冻结（见 §3、§7）。

## 2. Skill

```text
Skill = Prompt / Instructions / Reference
```

- Skill 告诉 Agent **应该怎么做**：工作方式、领域知识、输出规范、参考文档。
- Skill **本身没有执行权限**：它不能发起 Tool Call，也不能改变 Policy、Approval、Budget、Release 等控制状态。
- Skill 的效果只能通过 Agent 发出的 Action Request 体现，而每个 Action Request 都必须经过 Runtime Core / Tool Gateway / Policy（见 §5）。

## 3. Tool

```text
Tool = Agent 能请求执行的能力
```

- Agent 与 Tool 之间只有一种关系：**请求执行**（ToolRequest）。
- Skill 与 Tool 的边界：Skill 回答“应该怎么做”，Tool 回答“能做什么动作”。Skill 不是 Tool，Prompt 也不能生成 Tool 权限。

### 3.1 ToolDefinition / ToolVersion / ToolBinding

```text
ToolDefinition = Tool identity（工具身份）
↓
ToolVersion    = immutable executable contract（不可变可执行契约）
↓
ToolBinding    = Agent Version 对 exact ToolVersion 的绑定
```

| 概念 | 职责 | 包含 |
|---|---|---|
| ToolDefinition | Tool identity | name、provider、riskLevel 等 identity 元数据 |
| ToolVersion | immutable executable contract | input schema、provider/executor binding、version/checksum、capability metadata |
| ToolBinding | AgentVersion → exact ToolVersion | 只表示“这个 Agent Version 可以请求这个精确版本的 Tool”，不代表执行授权 |

- ToolDefinition 负责工具身份；ToolVersion 负责具体不可变的可执行契约。
- Agent Version 发布时冻结 exact ToolVersion；后续即使 ToolDefinition 出现 v3，旧 AgentVersion 仍固定使用 v2。
- 实际调用仍必须经过 §5 的统一执行链；ToolBinding 本身不产生执行授权。

## 4. Built-in Tool 与 MCP

### 4.1 Built-in Tool

Built-in Tool = Runtime 原生实现的 Tool，由 Runtime 注册进 Tool Registry：

| Tool | 说明 |
|---|---|
| `builtin.read` | 读取文件 |
| `builtin.glob` | 文件模式匹配 |
| `builtin.grep` | 内容搜索 |
| `builtin.edit` | 编辑文件 |
| `builtin.write` | 写文件 |
| `builtin.bash` | 受控 shell 执行 |

Built-in Tool 由 Runtime 注册时同样产生 ToolDefinition + ToolVersion（如 `tv_builtin_read_v1`）；**Built-in Tool 不是 ToolVersion 概念的例外**。

Built-in Tool 与其他 Tool 一样必须经过 Tool Gateway（见 §5），**不存在“本地快速路径”**。

### 4.2 MCP

MCP = **Tool Provider Protocol**，不是 Tool 本身。

- 一个 MCP Server 可以通过 `tools/list` 暴露多个 MCP Tools。
- MCP 是 Tool 的来源之一，不是唯一来源；**不是所有 Tool 都必须 MCP 化**。
- MCP Server 接入流程：

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

同步只产生“可绑定候选”；ToolBinding 必须由管理员显式操作，且绑定对象是 exact ToolVersion。MCP sync 不允许静默改变已经 Published Agent Version 的 ToolBinding；历史 ToolVersion 必须保持可查询。

## 5. 统一执行链

Built-in Tool 与 MCP Tool（以及未来 Provider 的 Tool）都必须经过同一条链：

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

- ALLOW：Executor 执行（BUILTIN executor / MCP client / HTTP connector）。
- DENY：不执行，返回 reason code。
- REQUIRE_APPROVAL：进入 Approval 流程；Approval 绑定 exact Action Request。

任何绕过该链的执行路径都是架构违规，包括 Built-in Tool。

## 6. Tool Provider 模型

Tool 是统一平台抽象，可来自不同 Provider / Executor：

| Provider | 说明 |
|---|---|
| BUILTIN | Runtime 原生实现（`builtin.*`） |
| MCP | 通过 MCP Server 接入 |
| HTTP | 通过 HTTP connector 接入 |
| (future) | 预留扩展；新增 Provider 不得改变统一执行链 |

Control Plane tool domain 对应实体：ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition（见 CONTROL_PLANE_DOMAINS.md §7）。ToolDefinition 承载工具身份，ToolVersion 承载不可变执行契约；绑定发生在 exact ToolVersion 级（见 §3.1）。

## 7. Agent Version Manifest

```json
{
  "agentId": "coding-agent",
  "version": "1.0.0",

  "engine": {
    "type": "pi",
    "config": {}
  },

  "modelPolicy": "coding-default",

  "skills": [
    "java-backend",
    "code-review"
  ],

  "tools": [
    { "name": "builtin.read", "toolVersionId": "tv_builtin_read_v1" },
    { "name": "builtin.grep", "toolVersionId": "tv_builtin_grep_v1" },
    { "name": "builtin.edit", "toolVersionId": "tv_builtin_edit_v1" },
    { "name": "builtin.write", "toolVersionId": "tv_builtin_write_v1" },
    { "name": "builtin.bash", "toolVersionId": "tv_builtin_bash_v1" },
    { "name": "github.create_pull_request", "toolVersionId": "tv_github_create_pr_7" }
  ]
}
```

- `engine.type` 由 Runtime Core 的 AgentEngineRegistry 解析为具体 AgentEngine（见 RUNTIME_CONTRACTS.md §10）。
- `tools[]` 中 `name` 只用于展示；`toolVersionId` 才是运行时绑定依据（API / DB 内部使用 ID）。
- Published Agent Version immutable；manifest 是它的冻结序列化，tools 冻结为 exact ToolVersion。
- Run 启动后绑定 exact Agent Version，不跟随后续配置改变；运行时引用见 RUNTIME_CONTRACTS.md §2 的 Execution Snapshot。

## 8. 安全不变量

1. Agent 永远只能**请求**动作；Skill / Prompt 内容不产生任何权限。
2. Prompt 中出现 `approval=true`、`admin=true` 等内容没有任何授权意义。
3. Built-in Tool 也不能绕过 Tool Gateway。
4. **bash 不能成为权限逃生通道**：若 `git.push` 的 Policy 是 REQUIRE_APPROVAL，则不能通过 `bash("git push ...")` 绕开审批。shell executor 至少受以下控制：
   - workspace sandbox
   - command policy
   - filesystem scope
   - network policy
   - environment / secret isolation
5. Approval 必须绑定 exact Action Request；action、resource 或 arguments 改变则原审批无效。

## 9. 与其他文档的关系

| 文档 | 关系 |
|---|---|
| RUNTIME_CONTRACTS.md §10 | AgentEngine 接口与 EngineCapabilities 的正式定义 |
| CONTROL_PLANE_DOMAINS.md §7 | ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition 领域模型 |
| ARCHITECTURE.md §5 | Runtime Core 与 AgentEngine 的职责边界 |
| DATA_MODEL.md | manifest / tool_binding / mcp_server_definition 等表结构 |
| docs/stages/00 | 冻结本模型与相关契约 |
| docs/stages/04 | Built-in Tool Registry、Executors、MCP 接入的实现与验收 |
