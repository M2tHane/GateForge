# Stage Review — Stage 01: Frontend Prototype with Mock Data

```text
Stage: 01 — Frontend Prototype with Mock Data
Source Commit: 273a974 (Stage 00 Gate 通过后的起点)
```

## Completed

### Employee Workspace（全部 25 项交互可点击演示，见 DESIGN.md §20）

- [x] App Shell：左侧导航（＋新建会话 / ＋新建任务 / Agents / Skills / 今天·昨天·更早 History / More）+ IDE 式 Tab Bar；治理入口不挤占员工导航（Administration 分组仅 Admin 视角可见，Settings 提供视角切换供演示）
- [x] Conversation Workspace：多轮流式聊天、Model Selector（切换只影响后续调用）、/skill 统一 Picker、exact SkillVersion chips（可移除）
- [x] Task Workspace：New Task Composer（候选 = PERSONAL + ENABLED + 有 Published Version；首条指令创建 Task 并固定 agentId + exact agentVersionId）；Existing Task 只读身份展示（🤖 Name · vN + Pinned Version，无 ▾ / 无 Switch，明确提示换 Agent 需新建任务）
- [x] Task 执行模拟：每条新指令 → 新 Run；聊天流仅简洁工具进度；Inspector 五 Tab（Run / Files / Tool / Trace / Approval）承载完整 Request / Result / Policy Decision / 事件时间线
- [x] Approval Mock Flow：`github.push` 命中 `production-write-approval` → Run #1 停在 WAITING_APPROVAL → Inspector / My Approvals 展示「本次精确请求」（action / resource / args digest / policy / risk）→ Approve → **同一个 Run** 恢复执行并完成；Reject → 工具调用标记 REJECTED、同一 Run 以拒绝说明收尾
- [x] 多 Tab：同一 Agent 多个 Task 并存多 Tab；Tab 切换保留消息、草稿、滚动位置（store 持有 + localStorage 持久化）
- [x] Agents：四列 Card Grid（状态 / Published Version 徽章 / 启动任务 / 启停 / ··· 菜单）；Create Agent（平台·团队 Template Picker → Snapshot Clone → Editor；自定义空白）；Editor（基本信息 / Engine 只读 pi / Model / Skills / Tools / Review + Publish Modal 确认）；Detail（概览 / 版本时间线 / exact Skill·ToolVersion 冻结绑定 / 历史任务 / 设置 + 来源模板说明）
- [x] Skills：平台 / 团队 / 我的 Tabs + Category 过滤 + Enable/Disable + Clone 到我的（Snapshot Copy，记录 sourceSkillVersionId）+ 创建 Skill（模板克隆 / 空白表单，Scope 固定 PERSONAL）；Effective Capability mock（增长团队 Skill 对当前用户不可见）
- [x] My Approvals：聚合待审批（含 Task Inspector 直达处理入口）

### Administration 骨架（可点击，优先级低于 Employee Workspace）

- [x] Models / Tools（Tool Registry + MCP Servers 二级 Tab）/ Skill Categories / Policies（WHEN/THEN 只读预览）/ Approvals（治理视角 + Approve/Reject Drawer）/ Teams / Audit（metadata Drawer）

### 实现约束遵守

- 本地 Mock 数据，未连接任何真实后端 / Model Gateway / Agent Runtime / Tool Gateway
- Conversation 不绑 Agent、不产生 Run（P1）；Task 固定 Agent（P12/P17）；新指令新 Run、Approval Resume 同一 Run（P2）；批准绑定精确请求（G6）；Template / Skill Clone 均为 Snapshot Copy（P7/P8/P9）；Agent 状态只有 ENABLED/DISABLED（P4）
- Mock API 形状镜像 `docs/API_CONTRACTS.md` 端点语义，Stage 02 可按 action 层逐个替换为真实端点

## Not Completed

- （无 — Stage 01 范围内全部完成）

## Contract Changes

- None（未修改冻结契约；新增 `store.createDraftFromPublished` 为前端内部 action，语义对应 §12 的 Published → Clone Draft → Publish v2）

## Architecture Deviations

- None。一处实现注记：Agent Editor 的 Tools 复选框直接绑定 registry 当前版本（mock 中每工具仅一个 ACTIVE ToolVersion），与 exact ToolVersion 绑定语义一致；Stage 02 提供多版本候选时按版本选择即可。

## Verification

- `pnpm -r typecheck` — pass
- `pnpm -r lint` — pass（0 error / 0 warning）
- `pnpm -r test` — 2 files / 13 tests passed（store 层：Task 创建固定版本、busy 守卫、审批 approve/reject 同一 Run、新指令新 Run、Template/Skill Clone 快照、Publish 只读与 v2、Conversation 流式与 exact Skill 绑定、Tab 模型）
- `pnpm -r build` — pass
- 浏览器 GUI 走查（in-app browser，1440×900）：§20 的 25 项交互逐项演示通过；重点链路「新建任务 → Run #1 WAITING_APPROVAL → Inspector Approve → 同一 Run 恢复 → COMPLETED → 第二条指令 Run #2」全程实时可见

## Known Risks

- Dev 模式下热更新（HMR）替换 store 模块会产生瞬时双实例，导致模拟链路与 UI 短暂失联；生产构建（单实例）与正常刷新后无此问题。开发时如遇 UI 冻结，刷新页面即可恢复。
- 流式回复在页面刷新时若处于流式中，该条消息会直接落定为当前部分内容（可接受的 mock 行为）。
- 演示数据存于 localStorage（key `gateforge-workspace-v1`）；如需重置演示状态，清除该 key 即可恢复种子数据。

## Next Stage Contract

- Stage 02 Control Plane 实现时，前端 store 的 action 层（`workspace-store.ts`）即真实 API 的对接面；Mock 形状已对齐 API_CONTRACTS（含 Task Agent 不可变的 400 / `TASK_AGENT_IMMUTABLE` 语义）。
- Mock 数据形状（`lib/mock/catalog.ts`）可直接作为 Stage 02 的种子 / fixture 参考。
