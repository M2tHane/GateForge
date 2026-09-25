# Stage 06 — Budget + Observability + Operational Readiness

## 目标

让平台从“能运行”变成“可治理、可排障、可控制成本”。

## Budget

实现：
- maxTokensPerRun
- maxCostPerRun
- maxTokensPerDayPerAgent
- reservation / settle

Model Gateway 在调用 Provider 前强制检查，而不是调用完才报警。

## Observability

OpenTelemetry：
- Run root span
- Model Call span
- Tool Call span
- Policy Decision span
- Approval wait metadata

Dashboard：
- Run success rate
- P95 duration
- token / cost
- tool errors
- policy deny
- approval waiting time

## Release

完善：
- active version switch
- rollback
- release history
- run/version pinning

## Gate

- 可通过 traceId 从 Run 追踪到 Model / Tool / Policy / Approval。
- 超预算请求在 Provider 调用前被拒绝。
- Rollback 不改变历史 Run 的 version。
