# Stage 03 — Agent Runtime + Model Gateway

## 目标

跑通两条 MVP 真实链路：

- A. 普通 Conversation：`User → Conversation → Model Gateway → LLM → Message`（不启动 PiEngine）。
- B. Agent Task：`User → Task → Pinned AgentVersion → Run → Runtime Core → PiEngine → Model Gateway → Result`。

两条链路都必须经 Model Gateway；Stage 03 不实现 Tool 执行（Tool Gateway 仍由 Stage 04 落地），但 Task / Conversation / Run 的对象关系必须在此阶段真实跑通。

## 实现

Runtime Core（TypeScript）：
- Conversation 模块（runtime/conversation）：Conversation / ConversationMessage / ConversationSkillBinding，必经 Model Gateway
- Task 模块（runtime/task）：Task / TaskMessage / Task → Run 编排（Task 固定 exact Published AgentVersion；新指令新 Run）
- Session / Run / Run state machine
- Checkpoint metadata（framework state 由 engine 序列化提供）
- SSE events / Runtime events

Agent Engine 层：
- AgentEngine interface（engine id / capabilities / start / resume / cancel）+ EngineCapabilities
- AgentEngineRegistry（manifest `engine.type` → engine 实例）
- PiEngine（MVP 唯一实现）：Agent Loop / Context execution / Prompt execution / framework state / Tool Call 与 Model Call 生成

Model Gateway：
- Model Provider Adapter
- logical model policy
- timeout / retry / fallback
- usage record（model_call 同时支持 Run 驱动与 Conversation 驱动，exactly one execution owner）

Control Plane 新增：
- model domain
- basic budget policy schema（先只记录，不强制全部规则）

MVP 约束：
- Conversation 不绑定 Agent、不产生 Run、不执行 Tool；禁止直接调用 Provider SDK。
- Task 固定创建时的 Published AgentVersion；不自动跟随新版本。
- Task 单 Agent（AgentEngineRegistry 每个 Run 只启动一个 engine 实例）。

## 架构验证要求

必须证明 Runtime Core 不依赖 Pi SDK 的具体 API：

- 只有 `engines/pi/` 模块 import Pi SDK；`core/`、`conversation/`、`task/`、`gateways/` 等模块只依赖 `AgentEngine` 接口（依赖检查进 CI）。
- 用一个 stub engine 注册进 AgentEngineRegistry 替换 PiEngine 跑通 Task Run 闭环，证明 engine 可替换、Control Plane / Gateway / Run 状态模型不感知具体 engine。

## Demo

Demo A（Conversation）：

```text
User
→ 新建会话（POST /api/conversations）
→ 选择 Model（me/model-candidates）
→ /skill 导入（ConversationSkillBinding，exact SkillVersion）
→ 多轮 Chat（POST /api/conversations/{id}/messages）
→ Model Gateway
→ LLM
→ ConversationMessage（含实际 modelPolicy / provider / model / usage）
```

Demo B（Agent Task）：

```text
User
→ 新建 Task（固定 Personal Agent + exact Published AgentVersion）
→ 用户指令（POST /api/tasks/{id}/messages）
→ create Run
→ Agent Version snapshot（manifest engine.type=pi → AgentEngineRegistry → PiEngine）
→ Runtime Core
→ Model Gateway
→ LLM
→ Runtime result
→ Run Completed
→ 用户继续新指令 → Run #2（同一 Task）
```

## Gate

- Agent 业务代码没有 Provider Secret；Conversation 链路同样没有。
- Runtime（含 Conversation 模块）不能直接调用 Provider SDK，必须走 Model Gateway port；PiEngine 也不直接调用 Provider。
- Runtime Core 源码无 Pi SDK import，且 stub engine 可替换 PiEngine 通过测试。
- 每次 Model Call 有 trace / token / latency 记录；Run 驱动与 Conversation 驱动的 Model Call 可区分且不重复记录。
- Task 新指令产生新 Run；Run 状态与 Task 的 ACTIVE / ARCHIVED 语义不混淆。
- Runtime 重启后 Run 的最终状态不会丢失。
