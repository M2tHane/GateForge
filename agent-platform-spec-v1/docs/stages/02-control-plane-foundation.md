# Stage 02 — Control Plane Foundation

## 目标

完成 Spring Boot 模块化单体和最核心的控制面事实源。

## Domain

本阶段实现：
- workspace
- identity（MVP 简化）
- agent
- release
- audit 基础设施

只建立 model/tool/budget/policy 的接口占位，不做完整执行。

## 核心功能

- Workspace 创建。
- Agent CRUD。
- Draft Agent Version。
- Publish Version，发布后不可变。
- Active Version。
- Rollback。
- Audit append-only。
- Postgres migration。

## 测试重点

- Published Version 无法修改。
- Rollback 只能指向 Published Version。
- 跨 Workspace 资源引用失败。
- 并发 publish / release 不产生两个 active 状态。

## Gate

前端 Agents / Versions 页面完全接真实 Control Plane API，不再使用 Mock。
