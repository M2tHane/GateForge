# @gateforge/api-contracts

Shared API contract types / schemas for GateForge (source of truth: `docs/API_CONTRACTS.md`).

Stage 00 establishes the package boundary only. Types and schemas are introduced by the Stage that first consumes them (Stage 01 frontend uses local mock API mirroring these endpoints; Stage 02+ Control Plane will generate/implement the real contracts).

Rules:

- Never hand-roll endpoint shapes that diverge from `docs/API_CONTRACTS.md`.
- Error contract is frozen in `docs/API_CONTRACTS.md` §15 (`code` / `message` / `correlationId` / `details`).
