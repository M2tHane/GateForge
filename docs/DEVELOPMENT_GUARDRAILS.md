# Development Guardrails — 防止项目跑偏

这份文件优先级仅低于 PRD 与 Architecture。任何 Stage 开发前都应先检查这里。

## 1. Source of Truth 优先级

发生冲突时按以下顺序处理：

```text
PRD
↓
ARCHITECTURE
↓
AGENT_CAPABILITY_MODEL
↓
RUNTIME_CONTRACTS / CONTROL_PLANE_DOMAINS
↓
DATA_MODEL / API_CONTRACTS
↓
当前 Stage 文档
↓
实现代码
```

实现与上层文档冲突时，不能默认“以代码为准”。如果确实需要改变设计，先写 ADR，再同步受影响文档。

## 2. 八条不可破坏的系统不变量

### G1 — Agent 只能提出请求
LLM 输出不是授权，也不是可信状态。Prompt 中 `approval=true`、`admin=true` 等内容没有任何授权意义。

### G2 — Control State 只有 Control Plane 能改
Policy、Approval、Budget Policy、Release、Published Version 不允许 Runtime 或 Agent 自行修改。

### G3 — 外部副作用必须经过 Tool Gateway
Git Push、Deploy、DB Write、发送消息等不能从 Agent 业务代码直接执行。

### G4 — 模型调用必须经过 Model Gateway
Provider SDK / API Key 不进入普通 Agent implementation，也不进入 AgentEngine。

### G5 — Run 固定绑定 Agent Version
开始执行后，不跟随 active version 自动变化。

### G6 — Approval 绑定精确请求
批准后如果 action、resource、arguments 改变，必须重新决策/审批。

### G7 — Built-in Tool 同样必经 Tool Gateway
`builtin.*` 与 MCP Tool 走同一条统一执行链；Built-in Tool 没有“本地快速路径”。

### G8 — bash 不是权限逃生通道
若 `git.push` 的 Policy 是 REQUIRE_APPROVAL，则不能通过 `bash("git push ...")` 绕开审批。shell executor 至少受 workspace sandbox、command policy、filesystem scope、network policy、environment / secret isolation 控制。

## 3. 每个 PR 的架构检查

提交前回答：

- 这个改动属于 Control Plane 还是 Data Plane？
- 是否新增了绕过 Gateway 的调用路径（包括 Built-in Tool）？
- 是否让 AgentEngine 依赖了 framework SDK 超出 `engines/<engine>/` 边界，或让 Runtime Core 依赖了具体 engine SDK？
- 是否新增了 AgentEngine 直接调用 Provider / 执行 Tool 的路径？
- 是否让 Prompt/LLM 决定了本应由 Runtime 决定的状态？
- 是否修改了 Published Version 的不可变语义？
- 是否改变 Run / Approval 状态机？
- 是否需要 ADR？

只要其中任何一项答案不确定，就不能直接合并。

## 4. Stage Scope Rule

当前 Stage 只实现本阶段 Gate 所需能力。

例如 Stage 03 不因为“以后需要 Multi-Agent”就提前实现复杂 Supervisor，也不提前实现 LangGraphEngine / NativeEngine；Stage 04 不因为“以后可能用 Cedar”就提前自研 Policy DSL。

原则：**先稳定控制点，再增加能力。**

## 5. Definition of Done

一个功能只有同时满足以下条件才算完成：

- Domain rule 已实现。
- API / Runtime contract 已实现。
- 非法路径有测试。
- 正常路径有集成测试。
- Trace / Audit 能定位执行事实。
- 文档没有与代码发生架构级偏差。

## 6. Stage Review 模板

每个 Stage 结束必须记录：

```text
Stage:
Source Commit:

Completed:
- ...

Not Completed:
- ...

Contract Changes:
- None / ADR-xxx

Architecture Deviations:
- None / ...

Verification:
- unit tests
- integration tests
- manual demo

Known Risks:
- ...

Next Stage Contract:
- ...
```
