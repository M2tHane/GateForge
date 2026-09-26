/**
 * Sidebar History（DESIGN.md §5.1 / §21）：Conversation + Task 混排的紧凑单行
 * 列表，统一按 updatedAt DESC 排序（不按 今天 / 昨天 / 更早 分组）；
 * 顶部「全部 / 任务 / 会话」视图过滤。
 * 纯函数：过滤只是 UI View State，不改 Conversation / Task 业务数据模型。
 */
import type { Agent, Conversation, Task } from "@/lib/types";

export type HistoryFilter = "all" | "task" | "conversation";

export const HISTORY_FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "task", label: "任务" },
  { id: "conversation", label: "会话" },
];

export interface HistoryItem {
  key: string;
  kind: "conversation" | "task";
  id: string;
  title: string;
  updatedAt: string;
  /** Task 专属：所属 Agent（标题尾部的 Avatar 与 Tooltip 用） */
  agentEmoji?: string;
  agentName?: string;
}

export function buildHistoryItems(
  conversations: Record<string, Conversation>,
  tasks: Record<string, Task>,
  agents: Record<string, Agent>,
  filter: HistoryFilter,
): HistoryItem[] {
  const items: HistoryItem[] = [];

  if (filter !== "task") {
    for (const conv of Object.values(conversations)) {
      if (!conv.persisted) continue;
      items.push({
        key: `conv:${conv.id}`,
        kind: "conversation",
        id: conv.id,
        title: conv.title,
        updatedAt: conv.updatedAt,
      });
    }
  }

  if (filter !== "conversation") {
    for (const task of Object.values(tasks)) {
      if (!task.persisted || task.status === "ARCHIVED") continue;
      const agent = agents[task.agentId];
      items.push({
        key: `task:${task.id}`,
        kind: "task",
        id: task.id,
        title: task.title,
        updatedAt: task.updatedAt,
        agentEmoji: agent?.avatarEmoji,
        agentName: agent?.name,
      });
    }
  }

  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return items;
}
