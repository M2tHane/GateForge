import type { Scope } from "@/lib/types";

/**
 * Stage 01 页面间 Tab handoff：从创建页克隆 / 创建 Personal Skill 后跳回
 * /skills 时，让 Skills 页直接落在「我的」Tab。仅前端内存态，不持久化；
 * 读取与清除分离，避免 React StrictMode 下 useState initializer 双调用丢值。
 */
let pendingScope: Scope | null = null;

export function handoffScope(scope: Scope): void {
  pendingScope = scope;
}

export function peekHandoffScope(): Scope | null {
  return pendingScope;
}

export function clearHandoffScope(): void {
  pendingScope = null;
}
