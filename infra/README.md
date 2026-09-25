# infra/

Deployment / local environment infrastructure (PostgreSQL, Redis, OpenTelemetry, Grafana stack).

Stage 00 establishes the directory only. Docker Compose for local dependencies is introduced by the Stage that first needs it (Stage 02 Control Plane / Stage 03 Runtime). Stage 01 (frontend prototype with mock data) does not require any infrastructure.
