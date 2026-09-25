# Stage 03 — Agent Runtime + Model Gateway

## 目标

跑通“用户创建 Run → Runtime 调模型 → 返回结果”的第一条真实执行链。

## 实现

Agent Runtime：
- Session / Run
- Run state machine
- HarnessPort + PiHarnessAdapter
- Context assembly
- Basic checkpoint
- SSE events

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

## Demo

```text
User input
→ create Run
→ active Agent Version snapshot
→ Runtime
→ Model Gateway
→ LLM
→ Runtime result
→ Completed
```

## Gate

- Agent 业务代码没有 Provider Secret。
- Runtime 不能直接调用 Provider SDK，必须走 Model Gateway port。
- 每次 Model Call 有 trace / token / latency 记录。
- Runtime 重启后 Run 的最终状态不会丢失。
