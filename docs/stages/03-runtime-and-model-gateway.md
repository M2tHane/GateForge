# Stage 03 — Agent Runtime + Model Gateway

## 目标

跑通“用户创建 Run → Runtime 调模型 → 返回结果”的第一条真实执行链。

## 实现

Runtime Core（TypeScript）：
- Session / Run
- Run state machine
- Checkpoint metadata（framework state 由 engine 序列化提供）
- SSE events / Runtime events

Agent Engine 层：
- AgentEngine interface（engine id / capabilities / start / resume / cancel）+ EngineCapabilities
- AgentEngineRegistry（manifest `engine.type` → engine 实例）
- PiEngine（MVP 唯一实现）：Agent Loop / Context execution / Prompt execution / framework state / Tool Call 与 Model Call 生成

Model Gateway：
- Model Provider Adapter
- logical model policy
- timeout
- retry
- fallback
- usage record

Control Plane 新增：
- model domain
- basic budget policy schema（先只记录，不强制全部规则）

## 架构验证要求

必须证明 Runtime Core 不依赖 Pi SDK 的具体 API：

- 只有 `engines/pi/` 模块 import Pi SDK；`core/`、`gateways/` 等模块只依赖 `AgentEngine` 接口（依赖检查进 CI）。
- 用一个 stub engine 注册进 AgentEngineRegistry 替换 PiEngine 跑通 Run 闭环，证明 engine 可替换、Control Plane / Gateway / Run 状态模型不感知具体 engine。

## Demo

```text
User input
→ create Run
→ active Agent Version snapshot（manifest engine.type=pi → AgentEngineRegistry → PiEngine）
→ Runtime Core
→ Model Gateway
→ LLM
→ Runtime result
→ Completed
```

## Gate

- Agent 业务代码没有 Provider Secret。
- Runtime 不能直接调用 Provider SDK，必须走 Model Gateway port；PiEngine 也不直接调用 Provider。
- Runtime Core 源码无 Pi SDK import，且 stub engine 可替换 PiEngine 通过测试。
- 每次 Model Call 有 trace / token / latency 记录。
- Runtime 重启后 Run 的最终状态不会丢失。
