# Stage Review — Stage 00: Scope Freeze & Contracts

```text
Stage: 00 — Scope Freeze & Contracts
Source Commit: 3adf114 (docs: freeze v1.2.1 workspace semantics)
```

## Completed

### 产物（冻结文档，全部已存在）

- [x] PRD.md — `docs/PRD.md`
- [x] ARCHITECTURE.md — `docs/ARCHITECTURE.md`
- [x] USER_AND_RESOURCE_MODEL.md — `docs/USER_AND_RESOURCE_MODEL.md`
- [x] AGENT_CAPABILITY_MODEL.md — `docs/AGENT_CAPABILITY_MODEL.md`
- [x] CONTROL_PLANE_DOMAINS.md — `docs/CONTROL_PLANE_DOMAINS.md`
- [x] RUNTIME_CONTRACTS.md — `docs/RUNTIME_CONTRACTS.md`
- [x] DATA_MODEL.md — `docs/DATA_MODEL.md`
- [x] API_CONTRACTS.md — `docs/API_CONTRACTS.md`
- [x] DESIGN.md — `frontend/DESIGN.md`
- [x] theme.css — `frontend/theme.css`

### 工程基础（本 Stage 新建）

- [x] Monorepo 骨架（pnpm workspace）：`apps/*`、`packages/*`
- [x] `apps/web-console`：Next.js 15 + React 19 + TypeScript（strict）+ Tailwind CSS v4 + ESLint + Vitest；`frontend/theme.css` 作为设计基线直接接入 `globals.css`
- [x] `packages/api-contracts` / `packages/event-contracts` / `packages/ui`：仅建立包边界与规则说明（按 Stage 需要再填充，不预建空壳代码）
- [x] `infra/`：目录占位（Stage 02/03 按需引入 docker-compose，Stage 01 Mock 前端不需要任何基础设施）
- [x] `scripts/dev.sh`、`scripts/test.sh`
- [x] 基础 CI：`.github/workflows/ci.yml`（install → lint → typecheck → test → build）

### API error contract、ID、时间、审计、correlation id 规范

已由冻结文档建立，无需新增：

- Error Contract：`API_CONTRACTS.md` §15（`code` / `message` / `correlationId` / `details`；前端依据 `code`）
- ID：`DATA_MODEL.md` §1（UUID / UUIDv7 / ULID）
- 时间：`DATA_MODEL.md` §3（各表 `created_at / updated_at`）
- 审计：`DATA_MODEL.md` §3 `audit_log`（append-only，含 `correlation_id`）
- correlation / idempotency：`API_CONTRACTS.md` §1（所有写接口支持 request/correlation id；关键副作用支持 idempotency key）

## Stage 00 Gate 验证结果（16 问）

逐条验证由独立文档一致性检查完成，结论：**16/16 UNAMBIGUOUS，无文档间冲突**。关键唯一答案逐字核对一致：

| # | 问题 | 唯一答案 | 出处 |
|---|---|---|---|
| 1 | 谁能改变 Approval 状态 | 仅 Approval Service 受控命令 API（`:approve` / `:reject`），授权审批人操作 | PRD §6 Rule 6；API_CONTRACTS §6；GUARDRAILS G2 |
| 2 | Runtime 能否修改 Policy | 否（PDP/PEP，只读有效策略） | ARCHITECTURE §2；GUARDRAILS G2 |
| 3 | Run / Task 绑定哪个 Version | Task 创建时固定 exact Published AgentVersion；Run 启动绑定同一 Version（不可变 Execution Snapshot） | RUNTIME_CONTRACTS §2/§3b；GUARDRAILS G5/P12 |
| 4 | Tool Call 从哪里执行 | 统一执行链：ToolRequest → Tool Gateway → Policy 决策 → Executor；Built-in 与 MCP 完全一致 | AGENT_CAPABILITY_MODEL §5；GUARDRAILS G3/G7 |
| 5 | Model API Key 位置 / Conversation 直连 | Key 只在 Model Gateway secret storage；Conversation 不允许直连 Provider SDK | ARCHITECTURE §10；GUARDRAILS G4/P11 |
| 6 | AgentEngine 接口与 EngineCapabilities 冻结 | 已冻结（id / capabilities / start / resume / cancel；六项 capability） | RUNTIME_CONTRACTS §10 |
| 7 | Skill 与 Tool 边界 | Skill 只注入上下文，永远没有执行权限 | AGENT_CAPABILITY_MODEL §2；GUARDRAILS P5 |
| 8 | Agent Version Manifest 字段 | 已冻结（engine / modelPolicy / skills[]含 exact skillVersionId / tools[]含 exact toolVersionId） | AGENT_CAPABILITY_MODEL §7 |
| 9 | ToolDefinition 还是 exact ToolVersion | exact ToolVersion | AGENT_CAPABILITY_MODEL §3.1；GUARDRAILS P6 |
| 10 | Conversation / Task / Run 规则 | 唯一：新指令新 Run；Approval / Pause Resume 同一 Run | USER_AND_RESOURCE_MODEL §7.4；RUNTIME_CONTRACTS §3b |
| 11 | Workspace / Team / User / Scope / Role / Effective Capability | 已冻结（Scope = WORKSPACE/TEAM/PERSONAL；六角色） | USER_AND_RESOURCE_MODEL §1–§4 |
| 12 | Clone 语义 | Snapshot Copy，非实时继承（Agent Template 与 Skill 一致） | USER_AND_RESOURCE_MODEL §5.3/§6.2；GUARDRAILS P7–P9 |
| 13 | Agent 状态语义 | ENABLED / DISABLED；执行状态只属于 Run；Task 只有 ACTIVE / ARCHIVED | USER_AND_RESOURCE_MODEL §5.4；GUARDRAILS P4 |
| 14 | 多 Team Policy 全局交集 | 否；按来源 Team 逐资源独立校验 | USER_AND_RESOURCE_MODEL §4；GUARDRAILS P10/P15 |
| 15 | Task 创建后切换 Agent | 否；消息 API 不接受 agentId / agentVersionId | API_CONTRACTS §5；GUARDRAILS P17 |
| 16 | 最高业务管理员角色 | Workspace Admin（WORKSPACE_ADMIN） | USER_AND_RESOURCE_MODEL §3.1；GUARDRAILS P18 |

已知的两处非冲突表述差异（不构成 Gate 阻塞，均为同一语义的命名/展示风格差异）：

- `interrupt-resume`（stages/00）vs `interruptResume`（RUNTIME_CONTRACTS §10）：同一 capability 的命名风格差异。
- Manifest 示例中 `name` 展示字段：所有文档一致明确 "`name` 仅展示，`*VersionId` 才是绑定依据"。

## Not Completed

- （无 — Stage 00 范围内全部完成）

## Contract Changes

- None（未修改任何冻结契约，未新增 ADR）

## Architecture Deviations

- None。工程骨架按 `docs/REPO_STRUCTURE.md` 建立；`packages/*` 仅建立边界不预置代码（更小修改范围原则）。

## Verification

- `pnpm --filter @gateforge/web-console test` — 1 passed（cn util smoke test）
- `pnpm --filter @gateforge/web-console typecheck` — pass
- `pnpm --filter @gateforge/web-console lint` — pass
- `pnpm --filter @gateforge/web-console build` — pass（含 theme.css Tailwind v4 接入验证）
- Stage 00 Gate 16 问文档一致性验证 — 16/16 UNAMBIGUOUS

## Known Risks

- CI workflow 尚未在真实 GitHub Runner 上执行过（本环境无 push）；本地等价命令序列已全部验证通过。
- `frontend/theme.css` 通过跨包 `@import` 接入 web-console，保持单一来源；若后续出现工具链兼容问题，回退方案是把 tokens 复制进 `globals.css` 并记录来源。

## Next Stage Contract

- Stage 01 按 `docs/stages/01-frontend-prototype.md` + `frontend/DESIGN.md` 实现完整 Employee Workspace Mock 前端（本地 Mock 数据，不接真实后端），Administration 仅保留可点击骨架。
- Mock 数据形状遵循 `docs/DATA_MODEL.md` 实体与 `docs/API_CONTRACTS.md` 端点语义（Task Agent 不可变、Conversation 不绑 Agent、Approval 绑定精确请求、Template/Skill Clone = Snapshot Copy）。
