# Stage 01 — Frontend Prototype with Mock Data

## 目标

用 Mock Data 优先验证完整 Employee Workspace（日常 AI 工作空间）的信息架构、页面层级和关键交互，再冻结 API 形状。Administration 仅保留基础可点击骨架，优先级低于 Employee Workspace。

## 实现

Employee Workspace 页面（优先级最高）：

- 左侧导航：＋ 新建会话 / ＋ 新建任务 / Agents / Skills / 今天·昨天 History / More
- Conversation Workspace（多轮聊天、Model Selector、/skill）
- Task Workspace（New Task Composer：Agent Selector；Existing Task：只读展示固定 Agent · Pinned Version；多轮工作会话；Inspector：Run / Files / Tool / Trace / Approval）
- 多 Conversation / Task Tabs（顶部 IDE 式 Tab Bar，切换不丢上下文）
- Agents：Personal Agent 四列 Card Grid
- Create Agent：从模板创建（平台 / 团队 Tab）→ Clone → Agent Editor → Publish；自定义创建
- Agent Detail：概览 / 版本 / Skills / Tools / 历史任务 / 设置
- Skills 页面：平台 / 团队 / 我的 Tabs + Category 过滤 + Skill Cards
- Create Skill / Clone Skill
- 统一 Skill Picker（大型 Drawer，多选）
- My Approvals / Approval Mock Flow

Administration 骨架（可点击即可，不深做）：

- Models
- Tools / MCP Servers
- Skill Categories
- Policies
- Approvals
- Teams
- Audit

使用本地 Mock / MSW，不连接真实后端。

## 必须重点验证

- 普通员工能否零配置理解“新建会话 → 选模型 → /skill → 多轮对话”。
- Agent Version 是否容易理解；Template Clone → Personal Agent Draft → Publish 是否顺畅。
- Conversation 与 Task 的区别是否在 UI 上清晰（Tab 形态、Inspector、状态展示）。
- New Task Composer 与 Existing Task Workspace 的 Agent 展示差异是否清晰：创建前可选择 Agent，创建后只读固定 Agent + Pinned Version，不暗示可中途切换。
- Task 聊天流的简化工具进度 vs Inspector 的完整 Trace 分层是否成立。
- Approval 是否明确展示“批准的精确动作”。
- 治理入口是否完全没有挤占员工日常导航。

## Gate

- 能完成 DESIGN.md §20 列出的 25 项 Employee Workspace 交互演示（含新建会话、多轮聊天、/skill、新建任务、Template Clone、Publish、Skills Tabs、Task Inspector、Approval Mock Flow）。
- 能演示一个 Task 的 Run 进入 Waiting Approval 后被批准、在同一个 Run 上 Resume 再完成。
- 能演示同一 Agent 的多个 Task 并存为多个 Tab。
- 主要页面不再需要结构级重做。

通过后再实现后端，避免数据库/API 跟着 UI 反复变。
