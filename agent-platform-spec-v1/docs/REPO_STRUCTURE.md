# Recommended Repository Structure

推荐先使用 Monorepo，方便前后端和 Runtime 共享契约，但保持部署单元独立。

```text
agent-platform/
├── apps/
│   └── web-console/                  # Next.js
├── services/
│   ├── control-plane/                # Spring Boot
│   └── agent-runtime/                # TypeScript / Pi adapter
├── packages/
│   ├── api-contracts/                # OpenAPI generated types / schemas
│   ├── event-contracts/              # runtime event schemas
│   └── ui/                           # shared frontend components
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── CONTROL_PLANE_DOMAINS.md
│   ├── RUNTIME_CONTRACTS.md
│   ├── DATA_MODEL.md
│   ├── API_CONTRACTS.md
│   ├── ADR/
│   └── stages/
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
├── core/
│   ├── session/
│   ├── run/
│   ├── context/
│   ├── checkpoint/
│   └── workflow/
├── harness/
│   ├── port.ts
│   └── pi/
├── gateways/
│   ├── model/
│   └── tool/
├── control-plane-client/
├── events/
└── server/
```

## 关键约束

不要建立一个跨整个 Control Plane 的 `service/`、`repository/`、`controller/` 大目录；这会让领域边界迅速退化成传统三层大单体。
