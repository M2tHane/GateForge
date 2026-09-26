import { describe, expect, it } from "vitest";
import { buildHistoryItems, type HistoryFilter } from "./history";
import type { Agent, Conversation, Task } from "./types";

/** 最小 fixture：History 只读 persisted / title / updatedAt / status / agentId。 */
function conv(id: string, updatedAt: string, persisted = true): Conversation {
  return {
    id,
    title: `会话 ${id}`,
    defaultModelPolicyId: "mp_gpt52",
    skillVersionIds: [],
    messages: [],
    createdAt: updatedAt,
    updatedAt,
    persisted,
  };
}

function task(id: string, agentId: string, updatedAt: string, persisted = true): Task {
  return {
    id,
    title: `任务 ${id}`,
    agentId,
    agentVersionId: "av_x_v1",
    status: "ACTIVE",
    messages: [],
    runs: [],
    createdAt: updatedAt,
    updatedAt,
    persisted,
  };
}

const agent: Agent = {
  id: "ag_coding",
  name: "Coding Agent",
  description: "",
  avatarEmoji: "🤖",
  avatarColor: "#3b82f6",
  kind: "PERSONAL",
  scope: "PERSONAL",
  status: "ENABLED",
  versions: [],
  publishedVersionId: null,
  draftVersionId: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function iso(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const conversations = {
  c1: conv("c1", iso(0, 9)),
  c2: conv("c2", iso(1)),
  c3: conv("c3", iso(0, 12), false), // 未持久化（草稿）不进 History
};
const tasks = {
  t1: task("t1", "ag_coding", iso(0, 11)),
  t2: task("t2", "ag_coding", iso(2)),
  t3: task("t3", "ag_coding", iso(0, 13)),
  t4: { ...task("t4", "ag_coding", iso(0, 14)), status: "ARCHIVED" as const }, // 归档不进 History
};
const agents = { ag_coding: agent };

const cases: [HistoryFilter, string[]][] = [
  ["all", ["task:t3", "task:t1", "conv:c1", "conv:c2", "task:t2"]],
  ["task", ["task:t3", "task:t1", "task:t2"]],
  ["conversation", ["conv:c1", "conv:c2"]],
];

describe("buildHistoryItems", () => {
  it.each(cases)('filter "%s" keeps only matching kinds in updatedAt DESC order', (filter, expected) => {
    const items = buildHistoryItems(conversations, tasks, agents, filter);
    expect(items.map((i) => i.key)).toEqual(expected);
  });

  it("returns one flat list without 今天 / 昨天 / 更早 grouping", () => {
    const items = buildHistoryItems(conversations, tasks, agents, "all");
    const sorted = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    expect(items).toEqual(sorted);
  });

  it("task items carry agent avatar + name; conversation items do not", () => {
    const items = buildHistoryItems(conversations, tasks, agents, "all");
    const taskItem = items.find((i) => i.id === "t1")!;
    expect(taskItem.agentEmoji).toBe("🤖");
    expect(taskItem.agentName).toBe("Coding Agent");
    const convItem = items.find((i) => i.id === "c1")!;
    expect(convItem.agentEmoji).toBeUndefined();
    expect(convItem.agentName).toBeUndefined();
  });
});
