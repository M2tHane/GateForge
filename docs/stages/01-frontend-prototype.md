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

## Implementation Progress

### Completed
- [x] 工程基础：apps/web-console 接入 theme.css 设计基线；路由骨架全部就位
- [x] 类型 / Mock 数据种子 / Workspace Store（mock backend：对话流式、Run 模拟、Template/Skill Snapshot Clone、Tab 模型）
- [x] App Shell：左侧导航（＋新建会话 / ＋新建任务 / Agents / Skills / 今天·昨天·更早 History / More；Admin 视角额外 Administration 分组）+ IDE 式多 Tab Bar
- [x] 统一 Skill Picker Drawer（§8，Conversation /skill 与 Agent Editor 复用）
- [x] Conversation Workspace：多轮聊天（流式）、Model Selector、/skill + chips（§6）
- [x] Task Workspace：New Task Composer（Agent Selector）→ 发送创建并固定 Agent + Pinned Version；Existing Task 只读身份展示（无 ▾ / 无 Switch）；每条新指令 → 新 Run（§7）
- [x] Task Inspector：Run / Files / Tool / Trace / Approval 五 Tab；聊天流仅简洁工具进度（§7.4）
- [x] Approval Mock Flow：Run 进入 WAITING_APPROVAL → 批准后同一 Run 恢复并完成；Reject 走拒绝收尾（同一 Run）；My Approvals 页面（§15）
- [x] Agents 页面群：四列 Card Grid / Create Agent / 平台·团队 Template Picker / Clone → Draft / Editor（6 分区 + Publish Modal）/ Detail（概览·版本·Skills·Tools·历史任务·设置）/ 启停（§9–§12）
- [x] Skills 页面：平台 / 团队 / 我的 Tabs + Category 过滤 + Enable/Disable + Clone（Snapshot Copy）+ 创建 Skill（模板克隆 / 空白）（§13）
- [x] Administration 骨架：Models / Tools（Registry + MCP Servers）/ Skill Categories / Policies（WHEN/THEN 预览）/ Approvals（治理视角 + Approve/Reject）/ Teams / Audit（§16）
- [x] Store scoped tests：13 项通过（Task 固定 Agent、新指令新 Run、审批同 Run 恢复、Reject、Clone 快照、Publish 只读、createDraftFromPublished v2、Conversation P1 语义、Tab 模型）
- [x] 浏览器走查：DESIGN.md §20 的 25 项 Employee Workspace 交互全部可点击演示（含同一 Agent 多 Task 多 Tab、Waiting Approval → 批准 → 同一 Run 完成的完整链路）
- [x] Stage Gate 验证：`pnpm -r typecheck` / `pnpm -r lint` / `pnpm -r test` / `pnpm -r build` 全部通过

### In Progress
- [ ]（无）

### Pending
- [ ]（无）

**Stage 01 Gate：通过（2026-09-26）。证据见 `docs/stages/01-stage-review.md`。**

