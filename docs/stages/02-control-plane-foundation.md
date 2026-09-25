# Stage 02 — Control Plane Foundation

## 目标

完成 Spring Boot 模块化单体和 v1.2 产品模型的控制面事实源：Workspace / Team / Membership、Personal Agent、Agent Template Clone、Skill 资源模型与版本发布。

## Domain

本阶段实现：
- workspace（Workspace + Team）
- identity（MVP 简化：User / Membership / TeamMembership / RoleBinding）
- agent（含 kind = PERSONAL | TEMPLATE、scope、ownership、sourceTemplateVersionId）
- skill（Skill / SkillVersion / SkillCategory / AgentSkillBinding / UserSkillEnablement）
- release
- audit 基础设施

只建立 model/tool/budget/policy 的接口占位，不做完整执行；tool 域先落 ToolDefinition / ToolVersion / ToolBinding / ToolPolicy / McpServerDefinition 的 schema 占位。Tool Runtime 仍由 Stage 04 落地，本阶段不抢做。

## 核心功能

- Workspace / Team / Membership 创建与管理。
- Agent CRUD（Personal Agent：scope = PERSONAL + ownerUserId；Workspace / Team Template：kind = TEMPLATE）。
- Agent Template Clone：Clone Published Template Version → Personal Agent Draft（Snapshot Copy，记录 sourceTemplateVersionId，无实时继承）。
- Draft Agent Version（携带 Agent Version Manifest：engine / modelPolicy / skills（exact SkillVersion）/ tools（exact ToolVersion），见 docs/AGENT_CAPABILITY_MODEL.md §7）。
- Publish Version，发布后不可变；AgentSkillBinding 冻结 exact SkillVersion。
- Agent enable / disable（status = ENABLED | DISABLED）。
- Skill CRUD / Skill Category（仅 Platform Admin）/ Skill Version Publish / Skill Clone（Snapshot Copy，记录 sourceSkillVersionId）/ Skill Enablement（user_skill_enablement）。
- Active Version、Rollback。
- Audit append-only。
- Postgres migration（含 team / team_member / skill / skill_version / skill_category / agent_skill_binding / user_skill_enablement / agent / agent_version 调整）。

## 测试重点

- Published Agent Version 无法修改；Published SkillVersion 无法修改。
- AgentSkillBinding / ToolBinding 冻结 exact SkillVersion / ToolVersion；源 Skill 更新不影响已发布版本。
- Template Clone 后修改模板 → Personal Agent 不变；Skill Clone 后修改源 Skill → Personal Skill 不变。
- PERSONAL / TEMPLATE 的 kind / scope 约束校验（缺 ownerUserId / teamId 拒绝）。
- Employee 无法创建 Skill Category、无法越权候选（Effective Capability 校验）。
- Rollback 只能指向 Published Version。
- 跨 Workspace 资源引用失败。
- 并发 publish / release 不产生两个 active 状态。

## Gate

前端 Agents / Agent Detail / Skills / Create / Clone 页面完全接真实 Control Plane API，不再使用 Mock。
