# Stage 04 — Tool Gateway + Policy Enforcement

## 目标

建立平台真正的安全控制点：Agent 只能“请求”动作，Tool Gateway 决定是否执行。

## Control Plane Domain

实现：
- tool
- policy

## Tool Gateway

至少支持：
- repo.read
- repo.write
- shell.exec
- git.commit
- git.push

链路：

```text
Agent Action Request
↓
Tool Gateway schema validation
↓
Policy Decision
↓
ALLOW / DENY / REQUIRE_APPROVAL
```

本阶段 REQUIRE_APPROVAL 可以先返回 waiting，但完整审批在 Stage 05。

## Policy MVP

先实现结构化 Java Rule：
- subject matcher
- action matcher
- resource matcher
- conditions
- effect
- priority

不要先自研 DSL parser。

## Gate

- Runtime 没有正常路径可以绕过 Tool Gateway 直接执行受治理工具。
- DENY 请求 100% 不产生副作用。
- arguments schema 验证失败不进入工具执行。
- Policy Decision 有 matched rules 和 reason code。
