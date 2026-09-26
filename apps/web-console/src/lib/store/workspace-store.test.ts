import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeRunOf,
  currentRunOf,
  fileDiffTabKey,
  taskTabKey,
  useWorkspaceStore,
} from "./workspace-store";

/**
 * Scoped tests for the Stage 01 mock backend: the frozen execution rules that
 * the frontend demo must not violate.
 * - Task fixed agentId + exact published agentVersionId at creation (P12/P17)
 * - New instruction → NEW Run; approval resume → SAME Run (P2)
 * - Approval binds the exact request (G6)
 * - Template/Skill Clone = Snapshot Copy (P7)
 * - Conversation never touches agents/runs (P1)
 */

const DAY = 24 * 3600 * 1000;

async function settle(ms = 30_000) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  return () => {
    vi.useRealTimers();
  };
});

describe("task creation (New Task Composer)", () => {
  it("fixes agentId and exact published agentVersionId at first send", () => {
    const store = useWorkspaceStore.getState();
    const taskId = store.createTaskFromComposer("ag_coding", "修复仓库登录超时");
    expect(taskId).not.toBeNull();
    const task = useWorkspaceStore.getState().tasks[taskId!];
    expect(task.agentId).toBe("ag_coding");
    expect(task.agentVersionId).toBe("av_coding_v120"); // exact published version
    expect(task.persisted).toBe(true);
    expect(task.runs).toHaveLength(1); // first instruction creates Run #1
  });

  it("rejects disabled agents and agents without published version", () => {
    const store = useWorkspaceStore.getState();
    expect(store.createTaskFromComposer("ag_data", "跑个分析")).toBeNull(); // DISABLED
    expect(store.createTaskFromComposer("tpl_coding", "不存在")).toBeNull(); // TEMPLATE, not personal
  });
});

describe("approval mock flow (Gate: Waiting Approval → approve → same Run resume → complete)", () => {
  it("pauses at WAITING_APPROVAL, resumes the SAME run on approve, completes", async () => {
    const store = useWorkspaceStore.getState();
    const taskId = store.createTaskFromComposer("ag_coding", "修复登录超时并推送")!;
    expect(taskId).not.toBeNull();

    // Run #1 starts RUNNING
    let task = useWorkspaceStore.getState().tasks[taskId!];
    expect(task.runs).toHaveLength(1);
    expect(task.runs[0].status).toBe("RUNNING");

    // Script reaches the github.push REQUIRE_APPROVAL gate
    await settle();
    task = useWorkspaceStore.getState().tasks[taskId!];
    const run = task.runs[0];
    expect(run.status).toBe("WAITING_APPROVAL");
    expect(run.index).toBe(1);

    // An exact approval request was created
    const approvals = Object.values(useWorkspaceStore.getState().approvals);
    const pending = approvals.find((a) => a.taskId === taskId && a.status === "PENDING");
    expect(pending).toBeDefined();
    expect(pending!.toolName).toBe("github.push");
    expect(pending!.resource).toContain("acme/payment-service");
    expect(pending!.policyName).toBe("production-write-approval");

    // Approve → SAME Run resumes (still 1 run), tool call completes, run COMPLETED
    useWorkspaceStore.getState().decideApproval(pending!.id, "APPROVED");
    await settle();

    task = useWorkspaceStore.getState().tasks[taskId!];
    expect(task.runs).toHaveLength(1); // no new run for approval resume (P2)
    expect(task.runs[0].status).toBe("COMPLETED");
    const push = task.runs[0].toolCalls.find((c) => c.toolName === "github.push");
    expect(push?.status).toBe("SUCCEEDED");
    expect(task.runs[0].events.some((e) => e.type === "approval" && e.title.includes("恢复同一个 Run"))).toBe(true);
  });

  it("reject keeps the same run and marks the tool call REJECTED", async () => {
    const taskId = useWorkspaceStore.getState().createTaskFromComposer("ag_coding", "推送修复分支")!;
    await settle();
    const pending = Object.values(useWorkspaceStore.getState().approvals).find(
      (a) => a.taskId === taskId && a.status === "PENDING",
    );
    useWorkspaceStore.getState().decideApproval(pending!.id, "REJECTED", "先评审");
    await settle();

    const task = useWorkspaceStore.getState().tasks[taskId!];
    expect(task.runs).toHaveLength(1);
    expect(task.runs[0].status).toBe("COMPLETED");
    expect(task.runs[0].toolCalls.find((c) => c.toolName === "github.push")?.status).toBe("REJECTED");
    const approval = useWorkspaceStore.getState().approvals[pending!.id];
    expect(approval.status).toBe("REJECTED");
    expect(approval.comment).toBe("先评审");
  });

  it("a new user instruction starts a NEW run (Run #2)", async () => {
    const taskId = useWorkspaceStore.getState().createTaskFromComposer("ag_coding", "修复登录超时")!;
    await settle();
    // 首个 Run 停在审批门：先批准，让 Run #1 完成
    const pending = Object.values(useWorkspaceStore.getState().approvals).find(
      (a) => a.taskId === taskId && a.status === "PENDING",
    );
    useWorkspaceStore.getState().decideApproval(pending!.id, "APPROVED");
    await settle();
    expect(useWorkspaceStore.getState().tasks[taskId!].runs[0].status).toBe("COMPLETED");

    // 新指令 → 新 Run（同 pinned agentVersion）
    useWorkspaceStore.getState().sendTaskMessage(taskId!, "把对应测试补完整");
    let task = useWorkspaceStore.getState().tasks[taskId!];
    expect(task.runs).toHaveLength(2);
    expect(task.runs[1].index).toBe(2);
    expect(task.runs[1].agentVersionId).toBe(task.agentVersionId); // pinned

    await settle();
    task = useWorkspaceStore.getState().tasks[taskId!];
    expect(currentRunOf(task)!.status).toBe("COMPLETED");
  });

  it("blocks sending while a run is still active", async () => {
    const taskId = useWorkspaceStore.getState().createTaskFromComposer("ag_coding", "第一个指令")!;
    const result = useWorkspaceStore.getState().sendTaskMessage(taskId!, "第二个指令");
    expect(result).toBe("busy");
    await settle();
  });
});

describe("agent template clone → publish (Snapshot Copy)", () => {
  it("clone creates a personal draft with snapshot manifest and records source", () => {
    const store = useWorkspaceStore.getState();
    const result = store.cloneAgentTemplate("av_tpl_coding_v120");
    expect(result).not.toBeNull();
    const agent = useWorkspaceStore.getState().agents[result!.agentId];
    expect(agent.kind).toBe("PERSONAL");
    expect(agent.sourceTemplateVersionId).toBe("av_tpl_coding_v120");
    expect(agent.publishedVersionId).toBeNull();
    const draft = agent.versions.find((v) => v.id === agent.draftVersionId);
    expect(draft?.status).toBe("DRAFT");
    expect(draft!.manifest.skills.length).toBe(2); // snapshot of template manifest
  });

  it("publish freezes v1.0.0 and makes the version read-only (no more draft)", async () => {
    vi.useRealTimers();
    const store = useWorkspaceStore.getState();
    const { agentId } = store.createBlankAgentDraft();
    useWorkspaceStore.getState().updateDraftAgent(agentId, { name: "My Agent" });
    const versionId = useWorkspaceStore.getState().publishAgentDraft(agentId);
    expect(versionId).not.toBeNull();

    const agent = useWorkspaceStore.getState().agents[agentId];
    expect(agent.publishedVersionId).toBe(versionId);
    expect(agent.draftVersionId).toBeNull();
    const published = agent.versions.find((v) => v.id === versionId);
    expect(published!.version).toBe("v1.0.0");
    expect(published!.status).toBe("PUBLISHED");

    // 编辑 published 无效（updateDraftAgent 只作用于 DRAFT）
    useWorkspaceStore.getState().updateDraftAgent(agentId, { name: "Renamed After Publish" });
    expect(useWorkspaceStore.getState().agents[agentId].name).toBe("My Agent");

    // 创建新版本：在同一 Agent 上以 published manifest 快照建 DRAFT（§12）
    const draftId = useWorkspaceStore.getState().createDraftFromPublished(agentId);
    expect(draftId).not.toBeNull();
    const withDraft = useWorkspaceStore.getState().agents[agentId];
    expect(withDraft.draftVersionId).toBe(draftId);
    const draft = withDraft.versions.find((v) => v.id === draftId);
    expect(draft!.status).toBe("DRAFT");
    expect(draft!.manifest).toEqual(published!.manifest); // snapshot of published
    // 再次调用不重复建草稿
    expect(useWorkspaceStore.getState().createDraftFromPublished(agentId)).toBeNull();

    // 从 published draft 发布 → v2.0.0，版本时间线累积在同一 Agent 上
    useWorkspaceStore.getState().publishAgentDraft(agentId);
    const v2 = useWorkspaceStore.getState().agents[agentId];
    expect(v2.versions).toHaveLength(2);
    expect(v2.versions.every((v) => v.status === "PUBLISHED")).toBe(true);
    expect(v2.versions[1].version).toBe("v2.0.0");
    expect(v2.publishedVersionId).toBe(v2.versions[1].id);

    vi.useFakeTimers();
    void DAY;
  });
});

describe("skill clone (Snapshot Copy)", () => {
  it("clone records sourceSkillVersionId and is independent", () => {
    const skillId = useWorkspaceStore.getState().cloneSkill("sv_jb_v120");
    const clone = useWorkspaceStore.getState().skills[skillId];
    expect(clone.scope).toBe("PERSONAL");
    expect(clone.sourceSkillVersionId).toBe("sv_jb_v120");
    expect(clone.currentVersionId).not.toBe("sv_jb_v120"); // new exact version
    expect(clone.versions[0].changelog).toContain("Clone 自");
  });

  it("createPersonalSkill can import a source version as an editable independent snapshot", () => {
    const source = useWorkspaceStore.getState().skills.skill_java_backend;
    const sourceName = source.name;
    const skillId = useWorkspaceStore.getState().createPersonalSkill({
      name: `${sourceName} - 我的版本`,
      description: "导入后调整过的描述",
      categoryId: source.categoryId,
      sourceSkillVersionId: source.currentVersionId,
    });

    const imported = useWorkspaceStore.getState().skills[skillId];
    expect(imported.scope).toBe("PERSONAL");
    expect(imported.sourceSkillVersionId).toBe(source.currentVersionId);
    expect(imported.currentVersionId).not.toBe(source.currentVersionId);
    expect(imported.versions[0].version).toBe("v1.0.0");
    expect(imported.versions[0].changelog).toContain("导入自");

    source.name = "源 Skill 后续改名";
    expect(useWorkspaceStore.getState().skills[skillId].name).toBe(`${sourceName} - 我的版本`);
  });
});

describe("conversation (P1: no agent, no run, exact skill binding)", () => {
  it("persists on first message, streams an assistant reply", async () => {
    const convId = useWorkspaceStore.getState().createDraftConversation();
    let conv = useWorkspaceStore.getState().conversations[convId];
    expect(conv.persisted).toBe(false);

    useWorkspaceStore.getState().sendConversationMessage(convId, "解释一下 Spring 认证链");
    conv = useWorkspaceStore.getState().conversations[convId];
    expect(conv.persisted).toBe(true);
    expect(conv.title).toBe("解释一下 Spring 认证链");
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[1].streaming).toBe(true);

    await vi.advanceTimersByTimeAsync(60_000);
    conv = useWorkspaceStore.getState().conversations[convId];
    expect(conv.messages[1].streaming).toBe(false);
    expect(conv.messages[1].content.length).toBeGreaterThan(0);
    expect(conv.messages[1].meta?.usage).toBeDefined();
  });

  it("binds and unbinds exact skill versions", () => {
    const convId = useWorkspaceStore.getState().createDraftConversation();
    const store = useWorkspaceStore.getState();
    expect(store.addConversationSkill(convId, "sv_jb_v120")).toBe(true);
    expect(store.addConversationSkill(convId, "sv_jb_v120")).toBe(false); // dedupe
    expect(store.conversations[convId].skillVersionIds).toEqual(["sv_jb_v120"]);
    store.removeConversationSkill(convId, "sv_jb_v120");
    expect(store.conversations[convId].skillVersionIds).toEqual([]);
  });
});

describe("tab model", () => {
  it("keeps one composer tab and switches active tab", () => {
    const store = useWorkspaceStore.getState();
    store.openComposerTab("ag_coding");
    expect(useWorkspaceStore.getState().tabs.filter((t) => t.kind === "composer")).toHaveLength(1);
    const convId = useWorkspaceStore.getState().createDraftConversation();
    expect(useWorkspaceStore.getState().activeTabKey).toBe(`conv:${convId}`);
    useWorkspaceStore.getState().openComposerTab(null);
    expect(useWorkspaceStore.getState().activeTabKey).toBe("composer");
    // 关闭激活 tab 后激活邻居
    useWorkspaceStore.getState().closeTab("composer");
    expect(useWorkspaceStore.getState().tabs.some((t) => t.key === "composer")).toBe(false);
    void taskTabKey;
    void activeRunOf;
  });

  it("opens one deduplicated file diff tab and activates it", () => {
    const path = "src/main/java/com/acme/repo/OrderRepository.java";
    const store = useWorkspaceStore.getState();
    const first = store.openFileDiffTab("task_seed_1", "task_seed_1_run1", path);
    const second = useWorkspaceStore.getState().openFileDiffTab(
      "task_seed_1",
      "task_seed_1_run1",
      path,
    );

    expect(first).toBe(second);
    expect(first).toBe(fileDiffTabKey("task_seed_1", "task_seed_1_run1", path));
    const state = useWorkspaceStore.getState();
    expect(state.tabs.filter((t) => t.kind === "file-diff" && t.key === first)).toHaveLength(1);
    expect(state.activeTabKey).toBe(first);
    expect(state.tabs.find((t) => t.key === first)?.title).toBe("OrderRepository.java");
  });
});

describe("theme", () => {
  it("switches between light and night", () => {
    const store = useWorkspaceStore.getState();
    store.setTheme("night");
    expect(useWorkspaceStore.getState().theme).toBe("night");
    useWorkspaceStore.getState().setTheme("light");
    expect(useWorkspaceStore.getState().theme).toBe("light");
  });
});

describe("administration mock settings", () => {
  it("updates policies and MCP connection state locally", () => {
    const store = useWorkspaceStore.getState();
    const policy = store.policies[0];
    const mcp = store.mcpServers[0];

    store.updatePolicy(policy.id, { enabled: !policy.enabled, effect: "DENY" });
    expect(useWorkspaceStore.getState().policies.find((p) => p.id === policy.id)).toMatchObject({
      enabled: !policy.enabled,
      effect: "DENY",
    });

    store.setMcpServerStatus(mcp.id, "DISABLED");
    expect(useWorkspaceStore.getState().mcpServers.find((server) => server.id === mcp.id)?.status).toBe(
      "DISABLED",
    );
  });
});
