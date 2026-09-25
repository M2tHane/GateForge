# Stage 05 — Approval + Suspend / Resume

## 目标

完成平台最关键的 Human-in-the-loop 安全闭环。

## 用户入口

- Employee：Task Workspace Inspector → Approval 直接处理自己 Task 中的审批；More → My Approvals 聚合入口。
- Admin / 授权 approver：Administration → Approvals。
- UI 按钮是否可见不作为授权依据；授权仍由 approval domain 控制。

## 实现

Control Plane：
- approval domain
- approver authorization
- expiration
- audit

Runtime：
- checkpoint before suspend
- WAITING_APPROVAL
- event-driven resume

Tool Gateway：
- request digest
- approval validation
- idempotency

## 必测攻击路径

1. LLM 输出 `approved=true` → 无效。
2. Approval 后修改 tool arguments → 原审批无效。
3. 重放已使用 approval → 不重复副作用。
4. 未授权用户 approve → 403。
5. Approval expired → 不能 resume。
6. 用 `bash("git push ...")` 绕过 `git.push` 审批 → 被 command policy 拦截（G8）。

## Gate

完整 Demo 必须跑通：

```text
builtin.write → ALLOW
builtin.bash (run tests) → ALLOW
git.push → REQUIRE_APPROVAL
→ Run WAITING_APPROVAL
→ User Approve
→ Resume
→ exact git.push executes once
→ Run COMPLETED
```
