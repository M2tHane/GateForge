# Stage 01 — Frontend Prototype with Mock Data

## 目标

先验证平台的信息架构、页面层级和关键交互，再冻结 API 形状。

## 实现

页面：
- Overview
- Agents
- Agent Detail
- Version Editor
- Runs
- Run Detail
- Approvals
- Tools
- Models
- Policies
- Audit

使用本地 Mock / MSW，不连接真实后端。

必须重点验证：
- Agent Version 是否容易理解。
- Run Detail 时间线是否能快速定位 Model / Tool / Approval。
- Approval 是否明确展示“批准的精确动作”。
- 配置是否过度铺满页面。

## Gate

- 能从 Create Agent 一路演示到 Publish。
- 能演示一个 Run 进入 Waiting Approval 后被批准再完成。
- 主要页面不再需要结构级重做。

通过后再实现后端，避免数据库/API 跟着 UI 反复变。
