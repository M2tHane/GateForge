import type { Scope, AgentStatus, RunStatus, ApprovalStatus, VersionStatus } from "./types";

/** Generate a readable mock id, e.g. `ag_9f3ab2c1`. */
export function nid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function scopeLabel(scope: Scope): string {
  switch (scope) {
    case "WORKSPACE":
      return "平台";
    case "TEAM":
      return "团队";
    case "PERSONAL":
      return "我的";
  }
}

export function agentStatusLabel(status: AgentStatus): string {
  return status === "ENABLED" ? "可用" : "已停用";
}

export function runStatusLabel(status: RunStatus): string {
  switch (status) {
    case "CREATED":
      return "已创建";
    case "RUNNING":
      return "运行中";
    case "WAITING_APPROVAL":
      return "等待审批";
    case "PAUSED":
      return "已暂停";
    case "COMPLETED":
      return "已完成";
    case "FAILED":
      return "失败";
    case "CANCELLED":
      return "已取消";
  }
}

export function approvalStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case "PENDING":
      return "待审批";
    case "APPROVED":
      return "已批准";
    case "REJECTED":
      return "已拒绝";
    case "EXPIRED":
      return "已过期";
    case "CANCELLED":
      return "已取消";
  }
}

export function versionStatusLabel(status: VersionStatus): string {
  switch (status) {
    case "DRAFT":
      return "草稿";
    case "PUBLISHED":
      return "已发布";
    case "DEPRECATED":
      return "已弃用";
  }
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export type DayGroup = "today" | "yesterday" | "earlier";

export function dayGroupOf(iso: string): DayGroup {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 3600 * 1000;
  const t = d.getTime();
  if (t >= startOfToday) return "today";
  if (t >= startOfYesterday) return "yesterday";
  return "earlier";
}

export function truncateTitle(text: string, max = 18): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export function formatDuration(startedAt?: string, finishedAt?: string): string {
  if (!startedAt || !finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return "<1s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
