# Development Stages

| Stage | 目标 | 核心验收 |
|---|---|---|
| 00 | 冻结边界与契约 | 状态、权限、Gateway 边界无歧义 |
| 01 | 前端 Mock 原型 | 完整演示 Create Agent → Run → Approval |
| 02 | Control Plane 基础 | Agent Version / Publish / Rollback 真实可用 |
| 03 | Runtime + Model Gateway | 第一条真实 LLM Run 闭环；Runtime Core 不依赖 Pi SDK |
| 04 | Tool Gateway + Policy | Builtin / MCP Tool 副作用全部经过强制策略入口 |
| 05 | Approval | Suspend / Approve / Resume / exact action |
| 06 | Budget + OTel + Release | 可治理、可排障、可控成本 |
| 07 | Multi-Agent + A2A | 复杂协作不突破既有权限边界 |

## 阶段规则

- 不通过当前 Stage Gate，不进入下一阶段。
- 新需求先判断属于哪个 Stage，不允许为了一个后期功能破坏前期边界。
- 每个 Stage 结束生成一份 `stage-review.md`，至少包含：完成项、未完成项、架构偏差、测试证据、下一 Stage 输入。
- 如果必须修改已冻结契约，新增 ADR 说明原因，而不是静默修改。
