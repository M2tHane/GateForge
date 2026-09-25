# Development Stages

| Stage | 目标 | 核心验收 |
|---|---|---|
| 00 | 冻结边界与契约 | 状态、权限、Gateway 边界、User & Resource Model（Workspace / Team / Agent / Skill / Conversation / Task / Run）无歧义 |
| 01 | 前端 Mock 原型 | 完整 Employee Workspace 可点击演示（新建会话 / 新建任务 / Agents / Skills / Tabs / Inspector）；Administration 仅保留骨架 |
| 02 | Control Plane 基础 | Workspace / Team / Membership / Personal Agent / Template Clone / Skill（含 Category、Enablement）/ Draft-Publish 真实可用；Agent Version 冻结 exact SkillVersion |
| 03 | Runtime + Model Gateway | 两条真实链路闭环：Conversation → Model Gateway；Task → Run → PiEngine → Model Gateway；Runtime Core 不依赖 Pi SDK |
| 04 | Tool Gateway + Policy | Builtin / MCP Tool 副作用全部经过强制策略入口 |
| 05 | Approval | Suspend / Approve / Resume / exact action；Approval Resume 恢复原 Run |
| 06 | Budget + OTel + Release | 可治理、可排障、可控成本 |
| 07 | Multi-Agent + A2A | 复杂协作不突破既有权限边界（此前 Task 严格单 Agent） |

## 阶段规则

- 不通过当前 Stage Gate，不进入下一阶段。
- 新需求先判断属于哪个 Stage，不允许为了一个后期功能破坏前期边界。
- 每个 Stage 结束生成一份 `stage-review.md`，至少包含：完成项、未完成项、架构偏差、测试证据、下一 Stage 输入。
- 如果必须修改已冻结契约，新增 ADR 说明原因，而不是静默修改。
