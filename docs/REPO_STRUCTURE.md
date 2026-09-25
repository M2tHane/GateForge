# Recommended Repository Structure

推荐先使用 Monorepo，方便前后端和 Runtime 共享契约，但保持部署单元独立。

```text
gateforge/
├── apps/
│   └── web-console/                  # Next.js
├── services/
│   ├── control-plane/                # Spring Boot
│   └── agent-runtime/                # TypeScript Runtime Core + Agent Engines
├── packages/
│   ├── api-contracts/                # OpenAPI generated types / schemas
│   ├── event-contracts/              # runtime event schemas
│   └── ui/                           # shared frontend components
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── USER_AND_RESOURCE_MODEL.md
│   ├── AGENT_CAPABILITY_MODEL.md
│   ├── CONTROL_PLANE_DOMAINS.md
│   ├── RUNTIME_CONTRACTS.md
│   ├── DATA_MODEL.md
│   ├── API_CONTRACTS.md
│   ├── ADR/
│   └── stages/
├── frontend/                         # 设计基线（DESIGN.md / theme.css）
├── infra/
│   ├── docker-compose.yml
│   ├── postgres/
│   ├── otel/
│   └── grafana/
├── scripts/
│   ├── dev.sh
│   ├── test.sh
│   └── doctor.sh
└── README.md
```

## Control Plane

```text
services/control-plane/src/main/java/.../
├── workspace/
├── identity/
├── agent/
├── skill/
├── model/
├── tool/
├── policy/
├── approval/
├── budget/
├── release/
├── audit/
└── shared/
```

每个模块内部再使用：

```text
api/
application/
domain/
infrastructure/
```

## Agent Runtime

```text
services/agent-runtime/src/
├── conversation/                     # Conversation Runtime：普通对话链路（必经 Model Gateway，不启动 AgentEngine）
├── task/                             # Task → Run 编排：固定 AgentVersion、新指令新 Run
├── core/                             # Runtime Core：禁止 import 任何 engine SDK
│   ├── session/
│   ├── run/
│   ├── state-machine/
│   ├── checkpoint/
│   └── events/
├── engines/
│   ├── agent-engine.ts               # AgentEngine interface + EngineCapabilities
│   ├── registry.ts                   # AgentEngineRegistry
│   └── pi/                           # PiEngine（MVP 唯一实现；唯一允许 import Pi SDK 的模块）
├── gateways/
│   ├── model/
│   └── tool/
│       ├── registry/                 # Built-in Tool Registry + MCP Tool 缓存
│       └── executors/
│           ├── builtin/              # read / glob / grep / edit / write / bash
│           └── mcp/
├── control-plane-client/
├── events/
└── server/
```

依赖规则：只有 `engines/pi/` 允许依赖 Pi SDK；`core/`、`gateways/` 等模块只能依赖 `engines/agent-engine.ts` 中的接口（见 RUNTIME_CONTRACTS.md §10）。

## 关键约束

不要建立一个跨整个 Control Plane 的 `service/`、`repository/`、`controller/` 大目录；这会让领域边界迅速退化成传统三层大单体。
