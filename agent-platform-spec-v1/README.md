# Agent Platform Specification v1

这是一套用于分阶段开发企业级 Agent 平台的约束性文档包。目标不是一次性实现完整平台，而是让产品、前端、Control Plane、Agent Runtime、Gateway 和数据模型在同一套契约下演进，避免开发过程中不断改方向。

## 推荐开发顺序

1. 阅读 `docs/PRD.md`：确认产品边界、MVP 和非目标。
2. 阅读 `frontend/DESIGN.md` + `frontend/theme.css`：先完成静态前端原型与交互确认。
3. 阅读 `docs/ARCHITECTURE.md`：确认 Control Plane / Data Plane / Gateway 边界。
4. 阅读 `docs/CONTROL_PLANE_DOMAINS.md`：按领域实现 Spring Boot 模块化单体。
5. 阅读 `docs/RUNTIME_CONTRACTS.md`：实现 Runtime 与 Control Plane 的强边界。
6. 阅读 `docs/DATA_MODEL.md` 与 `docs/API_CONTRACTS.md`：冻结核心实体与 API。
7. 阅读 `docs/DEVELOPMENT_GUARDRAILS.md`：把系统不变量作为每个 PR 的检查项。
8. 按 `docs/stages/` 从 Stage 00 到 Stage 07 开发，每个 Stage 必须通过 Gate 才进入下一阶段。

## v1 技术基线

- Web Console：React / Next.js / TypeScript / Tailwind CSS / shadcn/ui / Base UI
- Control Plane：Java 21 + Spring Boot 3.x，模块化单体
- Agent Runtime：TypeScript + Pi SDK（保留替换为其他 Harness 的能力）
- Database：PostgreSQL
- Cache / Lock / ephemeral state：Redis
- Policy：先使用平台内置 Policy API + 结构化规则；Stage 04 后可接 OPA / Cedar
- Observability：OpenTelemetry + Prometheus + Loki + Tempo
- Object Storage：S3-compatible，MVP 可先用本地 MinIO

## 核心原则

```text
Prompt 决定 Agent “想做什么”
Runtime / Gateway / Policy 决定 Agent “实际能不能做”
```

所有高风险状态变更必须经过受控入口；LLM、Agent、Tool 不得直接修改 Policy、Approval、Budget、Release 等控制状态。

## MVP 最终验收场景

管理员创建一个 Coding Agent → 配置模型与工具 → 发布 v1 → 用户发起“修复仓库中的一个 Bug”任务 → Runtime 调用模型 → 读取和修改文件 → 执行测试 → 请求 git push → Tool Gateway 判断为高风险 → 创建审批 → 用户批准 → Runtime 恢复任务 → push 成功 → 全链路 Trace、Token、成本、Tool Call 和审批记录可审计。
