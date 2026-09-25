# Stage 05 — Approval + Suspend / Resume

## 目标

完成平台最关键的 Human-in-the-loop 安全闭环。

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

## Gate

完整 Demo 必须跑通：

```text
repo.write → ALLOW
shell.test → ALLOW
git.push → REQUIRE_APPROVAL
→ Run WAITING_APPROVAL
→ User Approve
→ Resume
→ exact git.push executes once
→ Run COMPLETED
```
