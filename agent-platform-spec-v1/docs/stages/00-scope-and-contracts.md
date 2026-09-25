# Stage 00 — Scope Freeze & Contracts

## 目标

在写业务代码前冻结 v1 的产品边界、核心实体、状态机和跨服务契约。

## 做什么

- 确认 PRD 的 MVP / 非目标。
- 确认 Control Plane 与 Runtime 边界。
- 确认 Run / Approval / Agent Version 状态机。
- 确认 3 Gateway 的职责。
- 建立 monorepo / multi-repo 目录和基础 CI。
- 建立 API error contract、ID、时间、审计和 correlation id 规范。

## 产物

- PRD.md
- ARCHITECTURE.md
- CONTROL_PLANE_DOMAINS.md
- RUNTIME_CONTRACTS.md
- DATA_MODEL.md
- API_CONTRACTS.md
- DESIGN.md
- theme.css

## 不做

- 不实现真实 Agent。
- 不接真实模型。
- 不做 Policy DSL。

## Gate

只有当以下问题都有唯一答案才能进入下一阶段：
1. 谁能改变 Approval 状态？
2. Runtime 是否能修改 Policy？
3. Run 绑定哪个 Version？
4. Tool Call 从哪里执行？
5. Model API Key 在哪里？
