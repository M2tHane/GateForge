# Stage 07 — Multi-Agent / A2A / Enterprise Integration

## 目标

在单 Agent 控制链稳定后，再扩展复杂协作能力。

前置约束：MVP（Stage 00–06）中 Task 严格单 Agent（1 Task → 1 Agent → 1 exact Published AgentVersion）；本阶段是唯一允许放开该约束的阶段，且不得突破既有权限边界。

## 实现方向

### Multi-Agent
- Supervisor / Specialist
- DAG scheduler
- Task Contract
- Artifact contract
- child run / parent run relationship
- shared budget hierarchy

### A2A
- Agent Card
- service identity
- trusted Agent allowlist
- request scope propagation

### Enterprise Integration
- GitHub
- Jira / Slack / internal systems
- connector credential isolation

（MCP Tool Provider 已在 Stage 04 落地；本阶段只扩展企业 connector 与凭据隔离，不改变统一执行链。）

### Policy
需要支持 parent/child Agent delegation：

```text
User grants MainAgent scope
↓
MainAgent delegates subset to Specialist
↓
Specialist cannot exceed parent scope
```

## Gate

- 子 Agent 的权限只能等于或小于父级有效权限。
- Parent Run 能完整查看 Child Run trace 和费用。
- Multi-Agent 不绕开 Stage 04/05 已建立的 Model/Tool/Approval 控制链。
