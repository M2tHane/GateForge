"use client";

/**
 * Workspace store — the Stage 01 mock backend.
 *
 * All mutations happen here (in-memory + localStorage persistence). Action
 * names mirror the frozen API semantics in docs/API_CONTRACTS.md so Stage 02
 * can swap this layer for real endpoints:
 * - Conversation: not bound to any Agent, no Run, skills bind exact SkillVersion
 * - Task: agentId + exact agentVersionId fixed at creation (P17 — immutable)
 * - New user instruction → New Run; Approval resume → SAME Run (P2)
 * - Approve applies to the exact requested action only (G6)
 *
 * Rendering contract (MANDATORY): components must subscribe with
 * `useWorkspaceStore()` (full-store). Mock mutations update nested state in
 * place, so narrow selectors (`(s) => s.slice`) see unchanged references and
 * will silently miss updates.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AGENTS,
  AUDIT_ENTRIES,
  CURRENT_USER,
  MCP_SERVERS,
  MODEL_CANDIDATES,
  POLICY_RULES,
  SEEDED_APPROVALS,
  SEEDED_CONVERSATIONS,
  SEEDED_TASKS,
  SKILLS,
  SKILL_CATEGORIES,
  TEAMS,
  TOOLS,
} from "@/lib/mock/catalog";
import {
  buildFirstRunPlan,
  buildFollowupRunPlan,
  buildGenericRunPlan,
  buildRejectedTail,
  conversationReply,
  type RunStep,
} from "@/lib/mock/scripts";
import { truncateTitle } from "@/lib/format";
import type {
  Agent,
  AgentStatus,
  AgentVersionManifest,
  ApprovalRequest,
  ApprovalStatus,
  AuditEntry,
  Conversation,
  McpServer,
  ModelCandidate,
  PolicyRule,
  Run,
  Skill,
  SkillCategory,
  TabKind,
  TabUiState,
  Task,
  TeamInfo,
  Tool,
  ToolCall,
  ToolRiskLevel,
  User,
  WorkspaceTab,
} from "@/lib/types";

export const COMPOSER_TAB_KEY = "composer";

export function convTabKey(id: string) {
  return `conv:${id}`;
}
export function taskTabKey(id: string) {
  return `task:${id}`;
}
export function fileDiffTabKey(taskId: string, runId: string, path: string) {
  return `diff:${taskId}:${runId}:${encodeURIComponent(path)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function humanizeToolProgress(step: RunStep): string {
  if (!step.tool) return step.title;
  if (step.tool.decision === "REQUIRE_APPROVAL") {
    return `⏸ ${step.tool.name} 等待审批：${step.tool.resource ?? step.tool.argsDigest}`;
  }
  return `▸ ${step.title}`;
}

// ---------------------------------------------------------------- simulation

/** Module-level simulation registry; the class itself lives in the store closure. */
interface ActiveSimulation {
  resume(): void;
  skipToTail(tail: RunStep[]): void;
}

const activeSimulations = new Map<string, ActiveSimulation>();

interface WorkspaceStore {
  // data
  currentUser: User;
  viewAsAdmin: boolean;
  theme: "light" | "night";
  agents: Record<string, Agent>;
  skills: Record<string, Skill>;
  categories: SkillCategory[];
  modelCandidates: ModelCandidate[];
  tools: Tool[];
  mcpServers: McpServer[];
  policies: PolicyRule[];
  teams: TeamInfo[];
  auditEntries: AuditEntry[];
  approvals: Record<string, ApprovalRequest>;
  conversations: Record<string, Conversation>;
  tasks: Record<string, Task>;

  // tabs & per-tab ui state（切 Tab 不丢上下文）
  tabs: WorkspaceTab[];
  activeTabKey: string | null;
  tabUi: Record<string, TabUiState>;
  composerAgentId: string | null;

  // ---- tabs ----
  openConversationTab: (convId: string) => string;
  openTaskTab: (taskId: string) => string;
  openComposerTab: (agentId?: string | null) => string;
  openFileDiffTab: (taskId: string, runId: string, path: string) => string;
  closeTab: (key: string) => void;
  setActiveTab: (key: string) => void;
  setTabDraft: (key: string, draft: string) => void;
  setTabScroll: (key: string, scrollTop: number) => void;
  resetComposer: () => void;

  // ---- conversation ----
  createDraftConversation: () => string;
  sendConversationMessage: (convId: string, content: string) => void;
  setConversationModel: (convId: string, modelPolicyId: string) => void;
  addConversationSkill: (convId: string, skillVersionId: string) => boolean;
  removeConversationSkill: (convId: string, skillVersionId: string) => void;

  // ---- task / run / approval ----
  createTaskFromComposer: (agentId: string, instruction: string) => string | null;
  sendTaskMessage: (taskId: string, instruction: string) => "started" | "busy" | "invalid";
  decideApproval: (
    approvalId: string,
    decision: Extract<ApprovalStatus, "APPROVED" | "REJECTED">,
    comment?: string,
  ) => void;
  archiveTask: (taskId: string) => void;

  // ---- agents ----
  cloneAgentTemplate: (sourceTemplateVersionId: string) => { agentId: string; draftVersionId: string } | null;
  createBlankAgentDraft: () => { agentId: string; draftVersionId: string };
  /** 已发布 Agent → 同一 Agent 上的新 DRAFT（Clone published manifest；§12 版本时间线） */
  createDraftFromPublished: (agentId: string) => string | null;
  updateDraftAgent: (
    agentId: string,
    patch: Partial<Pick<Agent, "name" | "description" | "avatarEmoji" | "avatarColor">> & {
      manifest?: Partial<AgentVersionManifest>;
    },
  ) => void;
  discardDraftAgent: (agentId: string) => void;
  publishAgentDraft: (agentId: string) => string | null;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;

  // ---- skills ----
  createPersonalSkill: (input: { name: string; description: string; categoryId: string }) => string;
  cloneSkill: (sourceSkillVersionId: string) => string;
  setSkillEnabled: (skillId: string, enabled: boolean) => void;

  // ---- administration mock controls ----
  addModelCandidate: (input: Omit<ModelCandidate, "id">) => string;
  updateModelCandidate: (id: string, patch: Partial<Omit<ModelCandidate, "id">>) => void;
  setToolRiskLevel: (toolId: string, riskLevel: ToolRiskLevel) => void;
  setToolStatus: (toolId: string, status: "ACTIVE" | "DISABLED") => void;
  setMcpServerStatus: (id: string, status: McpServer["status"]) => void;
  setMcpCredentialStatus: (id: string, status: McpServer["credentialStatus"]) => void;
  addSkillCategory: (name: string) => string;
  updateSkillCategory: (id: string, patch: Partial<Pick<SkillCategory, "name" | "sortOrder">>) => void;
  moveSkillCategory: (id: string, direction: "up" | "down") => void;
  addPolicy: (input: Omit<PolicyRule, "id">) => string;
  updatePolicy: (id: string, patch: Partial<Omit<PolicyRule, "id">>) => void;
  addTeam: (input: Omit<TeamInfo, "id">) => string;
  updateTeam: (id: string, patch: Partial<Omit<TeamInfo, "id">>) => void;

  // ---- session ----
  setViewAsAdmin: (v: boolean) => void;
  setTheme: (theme: "light" | "night") => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => {
      /** Mutate nested mock state in place, then bump top-level identity. */
      const mutate = (fn: (s: WorkspaceStore) => void) => {
        set((s) => {
          fn(s);
          return {};
        });
      };

      function ensureTab(state: WorkspaceStore, kind: TabKind, refId: string, title: string): string {
        const key =
          kind === "composer"
            ? COMPOSER_TAB_KEY
            : kind === "conversation"
              ? convTabKey(refId)
              : taskTabKey(refId);
        if (!state.tabs.some((t) => t.key === key)) {
          state.tabs = [...state.tabs, { key, kind, refId, title }];
        }
        state.activeTabKey = key;
        if (!state.tabUi[key]) state.tabUi[key] = { draft: "", scrollTop: 0 };
        return key;
      }

      function setTabTitle(state: WorkspaceStore, key: string, title: string) {
        state.tabs = state.tabs.map((t) => (t.key === key ? { ...t, title } : t));
      }

      function choosePlan(agent: Agent, pinnedAgentVersionId: string, isFirstRun: boolean, instruction: string): RunStep[] {
        const version = agent.versions.find((v) => v.id === pinnedAgentVersionId);
        const toolNames = version?.manifest.tools.map((t) => t.name) ?? [];
        const hasHighRiskMcp = toolNames.some((name) => {
          const tool = get().tools.find((tl) => tl.name === name);
          return tool?.provider === "MCP" && tool.riskLevel === ("HIGH" satisfies ToolRiskLevel);
        });
        if (hasHighRiskMcp) {
          return isFirstRun ? buildFirstRunPlan(agent.name, instruction) : buildFollowupRunPlan(instruction);
        }
        return buildGenericRunPlan(agent.name, instruction);
      }

      function applyRunStep(taskId: string, runId: string, step: RunStep) {
        mutate((s) => {
          const task = s.tasks[taskId];
          const run = task?.runs.find((r) => r.id === runId);
          if (!task || !run) return;
          const at = nowIso();

          // 审批通过后真正执行挂起 ToolCall 的那一步（不新建重复 tool call）
          if (step.completesPendingTool && step.tool) {
            const pending = run.toolCalls.find(
              (c) => c.toolName === step.tool!.name && c.status === "AWAITING_APPROVAL",
            );
            if (pending) {
              pending.status = "SUCCEEDED";
              pending.resultDigest = step.tool.resultDigest ?? "done";
              pending.finishedAt = at;
              run.events.push({
                id: nid("evt"), runId, type: "tool_call", title: step.title,
                detail: step.detail, toolName: step.tool.name, decision: "ALLOW", at,
              });
              task.messages.push({
                id: nid("msg"), role: "system", kind: "tool-progress",
                content: `▸ ${step.title}`, createdAt: at, runId,
              });
            }
            return;
          }

          switch (step.type) {
            case "model":
            case "state":
              run.events.push({
                id: nid("evt"), runId,
                type: step.type === "model" ? "model_call" : "state",
                title: step.title, detail: step.detail, at,
              });
              break;
            case "file":
              run.events.push({ id: nid("evt"), runId, type: "file", title: step.title, detail: step.detail, at });
              if (step.file && !run.files.some((f) => f.path === step.file!.path)) {
                run.files.push(step.file);
              }
              break;
            case "assistant":
              task.messages.push({
                id: nid("msg"), role: "assistant", kind: "text",
                content: step.assistantText ?? "", createdAt: at, runId,
              });
              run.events.push({ id: nid("evt"), runId, type: "message", title: "Agent 输出结果", at });
              break;
            case "tool": {
              const t = step.tool!;
              if (t.decision === "REQUIRE_APPROVAL") {
                const approvalId = nid("apr");
                const toolCall: ToolCall = {
                  id: nid("tc"), runId, toolName: t.name, toolVersionId: t.versionId,
                  provider: t.provider, argsDigest: t.argsDigest, resource: t.resource,
                  decision: "REQUIRE_APPROVAL", status: "AWAITING_APPROVAL",
                  approvalId, startedAt: at,
                };
                run.toolCalls.push(toolCall);
                run.approvalId = approvalId;
                run.status = "WAITING_APPROVAL";
                run.events.push({
                  id: nid("evt"), runId, type: "approval",
                  title: `${t.name} 需要审批（REQUIRE_APPROVAL）`,
                  detail: `Policy 命中：本次精确请求 ${t.argsDigest}`,
                  toolName: t.name, decision: "REQUIRE_APPROVAL", at,
                });
                const approval: ApprovalRequest = {
                  id: approvalId, taskId, runId, agentId: task.agentId,
                  agentName: s.agents[task.agentId]?.name ?? "Agent",
                  taskTitle: task.title, toolName: t.name,
                  action: "tool.invoke", resource: t.resource ?? t.argsDigest,
                  argsDigest: t.argsDigest,
                  policyName:
                    t.name === "github.push" ? "production-write-approval" : "default-tool-policy",
                  riskLevel: t.riskLevel, status: "PENDING",
                  requestedAt: at,
                  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
                };
                s.approvals[approvalId] = approval;
                task.messages.push({
                  id: nid("msg"), role: "system", kind: "tool-progress",
                  content: humanizeToolProgress(step), createdAt: at, runId,
                });
              } else {
                const toolCall: ToolCall = {
                  id: nid("tc"), runId, toolName: t.name, toolVersionId: t.versionId,
                  provider: t.provider, argsDigest: t.argsDigest, resource: t.resource,
                  decision: "ALLOW", status: "SUCCEEDED",
                  resultDigest: t.resultDigest, startedAt: at, finishedAt: at,
                };
                run.toolCalls.push(toolCall);
                run.events.push({
                  id: nid("evt"), runId, type: "tool_call", title: step.title,
                  detail: step.detail, toolName: t.name, decision: "ALLOW", at,
                });
                if (step.file && !run.files.some((f) => f.path === step.file!.path)) {
                  run.files.push(step.file);
                }
                task.messages.push({
                  id: nid("msg"), role: "system", kind: "tool-progress",
                  content: humanizeToolProgress(step), createdAt: at, runId,
                });
              }
              break;
            }
          }

          if (step.endStatus && run.status === "RUNNING") {
            run.status = step.endStatus;
            run.finishedAt = at;
            if (step.usage) run.usage = step.usage;
            run.events.push({
              id: nid("evt"), runId, type: "state",
              title: `运行 #${run.index} ${step.endStatus === "COMPLETED" ? "完成（RUNNING → COMPLETED）" : "失败"}`,
              at,
            });
            task.messages.push({
              id: nid("msg"), role: "system", kind: "run-status",
              content: `运行 #${run.index} ${step.endStatus === "COMPLETED" ? "已完成" : "失败"}`,
              createdAt: at, runId,
            });
            task.updatedAt = at;
          }
        });
      }

      class RunSimulator {
        private cursor = 0;
        private steps: RunStep[];
        private timer: ReturnType<typeof setTimeout> | null = null;

        constructor(
          private readonly taskId: string,
          private readonly runId: string,
          steps: RunStep[],
        ) {
          this.steps = steps;
          activeSimulations.set(runId, this);
        }

        start() {
          this.scheduleNext();
        }

        /** Approval / reject resume continues the SAME run. */
        resume() {
          this.scheduleNext();
        }

        /** Reject: drop the remaining plan and play the rejection tail instead. */
        skipToTail(tail: RunStep[]) {
          if (this.timer) clearTimeout(this.timer);
          this.steps = tail;
          this.cursor = 0;
          this.scheduleNext();
        }

        private scheduleNext() {
          if (this.cursor >= this.steps.length) {
            activeSimulations.delete(this.runId);
            return;
          }
          const step = this.steps[this.cursor];
          this.timer = setTimeout(() => {
            this.cursor += 1;
            applyRunStep(this.taskId, this.runId, step);
            const run = get().tasks[this.taskId]?.runs.find((r) => r.id === this.runId);
            if (!run) return;
            if (run.status === "RUNNING") this.scheduleNext();
            // WAITING_APPROVAL 挂起，直到 decideApproval → resume()
          }, step.delay);
        }
      }

      return {
        currentUser: CURRENT_USER,
        viewAsAdmin: false,
        theme: "light",
        agents: toRecord(AGENTS),
        skills: toRecord(SKILLS),
        categories: SKILL_CATEGORIES,
        modelCandidates: MODEL_CANDIDATES,
        tools: TOOLS,
        mcpServers: MCP_SERVERS,
        policies: POLICY_RULES,
        teams: TEAMS,
        auditEntries: AUDIT_ENTRIES,
        approvals: toRecord(SEEDED_APPROVALS),
        conversations: toRecord(SEEDED_CONVERSATIONS),
        tasks: toRecord(SEEDED_TASKS),

        tabs: [],
        activeTabKey: null,
        tabUi: {},
        composerAgentId: null,

        // ---------- tabs ----------
        openConversationTab: (convId) => {
          const key = convTabKey(convId);
          mutate((s) => {
            ensureTab(s, "conversation", convId, s.conversations[convId]?.title ?? "新会话");
          });
          return key;
        },
        openTaskTab: (taskId) => {
          const key = taskTabKey(taskId);
          mutate((s) => {
            ensureTab(s, "task", taskId, s.tasks[taskId]?.title ?? "任务");
          });
          return key;
        },
        openComposerTab: (agentId) => {
          mutate((s) => {
            ensureTab(s, "composer", "", "新建任务");
            // undefined=仅确保 Tab（保留已选 Agent，防止 Tab 往返丢失选择）
            // null=清空选择；string=预选 Agent
            if (agentId !== undefined) s.composerAgentId = agentId;
          });
          return COMPOSER_TAB_KEY;
        },
        openFileDiffTab: (taskId, runId, path) => {
          const key = fileDiffTabKey(taskId, runId, path);
          mutate((s) => {
            if (!s.tabs.some((t) => t.key === key)) {
              s.tabs = [
                ...s.tabs,
                {
                  key,
                  kind: "file-diff",
                  refId: key,
                  title: path.split("/").at(-1) ?? path,
                  taskId,
                  runId,
                  path,
                },
              ];
            }
            s.activeTabKey = key;
            if (!s.tabUi[key]) s.tabUi[key] = { draft: "", scrollTop: 0 };
          });
          return key;
        },
        closeTab: (key) =>
          mutate((s) => {
            const idx = s.tabs.findIndex((t) => t.key === key);
            s.tabs = s.tabs.filter((t) => t.key !== key);
            const ui = { ...s.tabUi };
            delete ui[key];
            s.tabUi = ui;
            if (s.activeTabKey === key) {
              const neighbor = s.tabs[Math.min(idx, s.tabs.length - 1)];
              s.activeTabKey = neighbor?.key ?? null;
            }
          }),
        setActiveTab: (key) =>
          mutate((s) => {
            s.activeTabKey = key;
          }),
        setTabDraft: (key, draft) =>
          mutate((s) => {
            s.tabUi[key] = { draft, scrollTop: s.tabUi[key]?.scrollTop ?? 0 };
          }),
        setTabScroll: (key, scrollTop) =>
          mutate((s) => {
            s.tabUi[key] = { draft: s.tabUi[key]?.draft ?? "", scrollTop };
          }),
        resetComposer: () =>
          mutate((s) => {
            s.composerAgentId = null;
            s.tabUi[COMPOSER_TAB_KEY] = { draft: "", scrollTop: 0 };
          }),

        // ---------- conversation ----------
        createDraftConversation: () => {
          const id = nid("conv");
          mutate((s) => {
            s.conversations[id] = {
              id,
              title: "新会话",
              defaultModelPolicyId: s.modelCandidates[0]?.id ?? "mp_gpt52",
              skillVersionIds: [],
              messages: [],
              createdAt: nowIso(),
              updatedAt: nowIso(),
              persisted: false,
            };
            ensureTab(s, "conversation", id, "新会话");
          });
          return id;
        },
        sendConversationMessage: (convId, content) => {
          const s0 = get();
          const conv = s0.conversations[convId];
          if (!conv) return;
          if (conv.messages.some((m) => m.streaming)) return;
          const at = nowIso();
          const model = s0.modelCandidates.find((m) => m.id === conv.defaultModelPolicyId);
          const round = Math.floor(conv.messages.length / 2);
          const reply = conversationReply(content, round);
          const msgId = nid("msg");

          mutate((s) => {
            const c = s.conversations[convId];
            if (!c) return;
            c.messages.push({ id: nid("msg"), role: "user", content, createdAt: at });
            c.updatedAt = at;
            if (!c.persisted) {
              c.persisted = true;
              c.title = truncateTitle(content);
              setTabTitle(s, convTabKey(convId), c.title);
            }
            // 模拟 Model Gateway 流式输出（Conversation 必经 Model Gateway，G4/P11）
            c.messages.push({
              id: msgId, role: "assistant", content: "", createdAt: nowIso(), streaming: true,
              meta: { modelPolicyId: model?.id, provider: model?.provider, model: model?.model },
            });
          });

          const chunks = reply.match(/[\s\S]{1,14}/g) ?? [reply];
          let i = 0;
          const timer = setInterval(() => {
            i += 1;
            const done = i >= chunks.length;
            const piece = chunks.slice(0, i).join("");
            mutate((s) => {
              const target = s.conversations[convId]?.messages.find((m) => m.id === msgId);
              if (!target) return;
              target.content = piece;
              if (done) {
                target.streaming = false;
                target.meta = {
                  modelPolicyId: model?.id,
                  provider: model?.provider,
                  model: model?.model,
                  usage: {
                    inputTokens: 420 + Math.floor(content.length * 1.3),
                    outputTokens: Math.floor(reply.length * 0.9),
                  },
                };
                const c2 = s.conversations[convId];
                if (c2) c2.updatedAt = nowIso();
              }
            });
            if (done) clearInterval(timer);
          }, 90);
        },
        setConversationModel: (convId, modelPolicyId) =>
          mutate((s) => {
            const c = s.conversations[convId];
            // 中途切换默认 Model：历史消息不变，只影响后续调用
            if (c) c.defaultModelPolicyId = modelPolicyId;
          }),
        addConversationSkill: (convId, skillVersionId) => {
          let added = false;
          mutate((s) => {
            const c = s.conversations[convId];
            if (c && !c.skillVersionIds.includes(skillVersionId)) {
              c.skillVersionIds.push(skillVersionId); // exact SkillVersion binding
              added = true;
            }
          });
          return added;
        },
        removeConversationSkill: (convId, skillVersionId) =>
          mutate((s) => {
            const c = s.conversations[convId];
            if (c) c.skillVersionIds = c.skillVersionIds.filter((id) => id !== skillVersionId);
          }),

        // ---------- task / run / approval ----------
        createTaskFromComposer: (agentId, instruction) => {
          const agent = get().agents[agentId];
          // New Task Composer 候选约束：PERSONAL + ENABLED + 存在 Published Version
          if (!agent || agent.kind !== "PERSONAL" || agent.status !== "ENABLED" || !agent.publishedVersionId) {
            return null;
          }
          const taskId = nid("task");
          const at = nowIso();
          mutate((s) => {
            s.tasks[taskId] = {
              id: taskId,
              title: truncateTitle(instruction),
              agentId, // 创建时固定 exact Published AgentVersion（P12/P17）
              agentVersionId: agent.publishedVersionId!,
              status: "ACTIVE",
              messages: [],
              runs: [],
              createdAt: at,
              updatedAt: at,
              persisted: false,
            };
            ensureTab(s, "task", taskId, truncateTitle(instruction));
          });
          get().sendTaskMessage(taskId, instruction);
          return taskId;
        },
        sendTaskMessage: (taskId, instruction) => {
          const s0 = get();
          const task = s0.tasks[taskId];
          if (!task) return "invalid";
          const busyRun = task.runs.find(
            (r) => r.status === "RUNNING" || r.status === "WAITING_APPROVAL" || r.status === "PAUSED",
          );
          if (busyRun) return "busy";
          const agent = s0.agents[task.agentId];
          if (!agent) return "invalid";
          const at = nowIso();
          const isFirstRun = task.runs.length === 0; // 新指令 → 新 Run；首条指令是 Run #1

          const runId = nid("run");
          const run: Run = {
            id: runId, taskId, index: task.runs.length + 1,
            agentVersionId: task.agentVersionId, // 固定 exact Published AgentVersion（G5）
            status: "RUNNING",
            events: [
              {
                id: nid("evt"), runId, type: "state",
                title: `运行 #${task.runs.length + 1} 开始（CREATED → RUNNING）`, at,
              },
            ],
            toolCalls: [],
            files: [],
            usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
            startedAt: at,
          };

          mutate((s) => {
            const t = s.tasks[taskId];
            if (!t) return;
            t.persisted = true; // 首次发送消息时才持久化（§7.1）
            t.updatedAt = at;
            if (t.messages.length === 0) {
              t.title = truncateTitle(instruction);
              setTabTitle(s, taskTabKey(taskId), t.title);
            }
            t.messages.push({
              id: nid("msg"), role: "user", kind: "text", content: instruction, createdAt: at, runId,
            });
            t.runs.push(run);
          });

          const plan = choosePlan(agent, task.agentVersionId, isFirstRun, instruction);
          new RunSimulator(taskId, runId, plan).start();
          return "started";
        },
        decideApproval: (approvalId, decision, comment) => {
          const s0 = get();
          const approval = s0.approvals[approvalId];
          if (!approval || approval.status !== "PENDING") return;
          const at = nowIso();

          mutate((s) => {
            const apr = s.approvals[approvalId];
            if (!apr || apr.status !== "PENDING") return;
            apr.status = decision;
            apr.decidedAt = at;
            apr.decidedBy = s.currentUser.name;
            if (comment) apr.comment = comment;

            const task = s.tasks[apr.taskId];
            const run = task?.runs.find((r) => r.id === apr.runId);
            if (!task || !run) return;

            const toolCall = run.toolCalls.find((c) => c.approvalId === approvalId);
            run.events.push({
              id: nid("evt"), runId: run.id, type: "approval",
              title:
                decision === "APPROVED"
                  ? "审批通过：恢复同一个 Run（WAITING_APPROVAL → RUNNING）"
                  : "审批拒绝：本次精确请求不放行",
              detail: `${apr.toolName} · ${apr.resource ?? ""}${comment ? ` · 备注：${comment}` : ""}`,
              toolName: apr.toolName, at,
            });
            task.messages.push({
              id: nid("msg"), role: "system", kind: "run-status",
              content:
                decision === "APPROVED"
                  ? `已批准 ${apr.toolName} · 同一运行 #${run.index} 恢复执行`
                  : `已拒绝 ${apr.toolName} · 本次请求不放行`,
              createdAt: at, runId: run.id,
            });

            run.status = "RUNNING"; // Approval Resume → Same Run（P2）
            const sim = activeSimulations.get(run.id);
            if (decision === "APPROVED") {
              if (sim) {
                sim.resume();
              } else {
                // 页面刷新后模拟链路丢失：同一 Run 优雅收尾
                if (toolCall) {
                  toolCall.status = "SUCCEEDED";
                  toolCall.resultDigest = "pushed 9f31c2a（approve 后恢复执行）";
                  toolCall.finishedAt = at;
                }
                task.messages.push({
                  id: nid("msg"), role: "assistant", kind: "text",
                  content:
                    "✅ 审批通过，`github.push` 已在同一个 Run 中恢复并完成。修复分支已推送到远端。",
                  createdAt: at, runId: run.id,
                });
                run.status = "COMPLETED";
                run.finishedAt = at;
                run.usage = { inputTokens: 5800, outputTokens: 2100, costUsd: 0.116 };
                run.events.push({
                  id: nid("evt"), runId: run.id, type: "state",
                  title: `运行 #${run.index} 完成（RUNNING → COMPLETED）`, at,
                });
              }
            } else {
              if (toolCall) {
                toolCall.status = "REJECTED";
                toolCall.finishedAt = at;
              }
              if (sim) {
                sim.skipToTail(buildRejectedTail(apr.taskTitle));
              } else {
                task.messages.push({
                  id: nid("msg"), role: "assistant", kind: "text",
                  content: "⚠️ `github.push` 已被拒绝，本次 Run 不推送任何改动。本地修改保留在工作区。",
                  createdAt: at, runId: run.id,
                });
                run.status = "COMPLETED";
                run.finishedAt = at;
                run.usage = { inputTokens: 5200, outputTokens: 1800, costUsd: 0.1 };
                run.events.push({
                  id: nid("evt"), runId: run.id, type: "state",
                  title: `运行 #${run.index} 完成（RUNNING → COMPLETED）`, at,
                });
              }
            }
          });
        },
        archiveTask: (taskId) =>
          mutate((s) => {
            const t = s.tasks[taskId];
            if (t) t.status = "ARCHIVED";
          }),

        // ---------- agents ----------
        cloneAgentTemplate: (sourceTemplateVersionId) => {
          let result: { agentId: string; draftVersionId: string } | null = null;
          mutate((s) => {
            for (const tpl of Object.values(s.agents)) {
              const version = tpl.versions.find(
                (v) => v.id === sourceTemplateVersionId && v.status === "PUBLISHED",
              );
              if (!version) continue;
              // Template Clone = Snapshot Copy（P7/P8）：复制 manifest、记录来源、不实时继承
              const agentId = nid("ag");
              const draftVersionId = nid("av");
              const at = nowIso();
              s.agents[agentId] = {
                id: agentId,
                name: tpl.name.replace(/ 模板$/, ""),
                description: tpl.description,
                avatarEmoji: tpl.avatarEmoji,
                avatarColor: tpl.avatarColor,
                kind: "PERSONAL",
                scope: "PERSONAL",
                ownerUserId: s.currentUser.id,
                status: "ENABLED",
                sourceTemplateVersionId,
                versions: [
                  {
                    id: draftVersionId, version: "Draft", status: "DRAFT",
                    manifest: structuredClone(version.manifest),
                    createdAt: at,
                  },
                ],
                publishedVersionId: null,
                draftVersionId,
                createdAt: at,
                updatedAt: at,
              };
              result = { agentId, draftVersionId };
              break;
            }
          });
          return result;
        },
        createBlankAgentDraft: () => {
          const agentId = nid("ag");
          const draftVersionId = nid("av");
          const at = nowIso();
          mutate((s) => {
            s.agents[agentId] = {
              id: agentId,
              name: "未命名 Agent",
              description: "",
              avatarEmoji: "🤖",
              avatarColor: "#64748b",
              kind: "PERSONAL",
              scope: "PERSONAL",
              ownerUserId: s.currentUser.id,
              status: "ENABLED",
              versions: [
                {
                  id: draftVersionId, version: "Draft", status: "DRAFT",
                  manifest: {
                    engine: { type: "pi" },
                    modelPolicyId: s.modelCandidates[0]?.id ?? "mp_gpt52",
                    skills: [],
                    tools: [],
                  },
                  createdAt: at,
                },
              ],
              publishedVersionId: null,
              draftVersionId,
              createdAt: at,
              updatedAt: at,
            };
          });
          return { agentId, draftVersionId };
        },
        createDraftFromPublished: (agentId) => {
          let draftId: string | null = null;
          mutate((s) => {
            const agent = s.agents[agentId];
            const published = agent?.versions.find((v) => v.id === agent.publishedVersionId);
            if (!agent || !published || agent.draftVersionId !== null) return; // 已有草稿时不重复建
            const draftVersionId = nid("av");
            agent.versions.push({
              id: draftVersionId,
              version: "Draft",
              status: "DRAFT",
              manifest: structuredClone(published.manifest), // Clone Draft from Published
              createdAt: nowIso(),
            });
            agent.draftVersionId = draftVersionId;
            agent.updatedAt = nowIso();
            draftId = draftVersionId;
          });
          return draftId;
        },
        updateDraftAgent: (agentId, patch) =>
          mutate((s) => {
            const agent = s.agents[agentId];
            const draft = agent?.versions.find((v) => v.status === "DRAFT");
            if (!agent || !draft) return; // Published Version 只读
            if (patch.name !== undefined) agent.name = patch.name;
            if (patch.description !== undefined) agent.description = patch.description;
            if (patch.avatarEmoji !== undefined) agent.avatarEmoji = patch.avatarEmoji;
            if (patch.avatarColor !== undefined) agent.avatarColor = patch.avatarColor;
            if (patch.manifest) draft.manifest = { ...draft.manifest, ...patch.manifest };
            agent.updatedAt = nowIso();
          }),
        discardDraftAgent: (agentId) =>
          mutate((s) => {
            const agent = s.agents[agentId];
            if (agent && agent.publishedVersionId === null && agent.draftVersionId !== null) {
              const agents = { ...s.agents };
              delete agents[agentId];
              s.agents = agents;
            }
          }),
        publishAgentDraft: (agentId) => {
          let publishedId: string | null = null;
          mutate((s) => {
            const agent = s.agents[agentId];
            const draft = agent?.versions.find((v) => v.status === "DRAFT");
            if (!agent || !draft) return;
            // Publish → Personal Agent Version vN.0.0；发布后版本只读
            const publishedCount = agent.versions.filter((v) => v.status !== "DRAFT").length;
            draft.version = `v${publishedCount + 1}.0.0`;
            draft.status = "PUBLISHED";
            draft.publishedAt = nowIso();
            agent.publishedVersionId = draft.id;
            agent.draftVersionId = null;
            agent.updatedAt = nowIso();
            publishedId = draft.id;
          });
          return publishedId;
        },
        setAgentStatus: (agentId, status) =>
          mutate((s) => {
            const agent = s.agents[agentId];
            if (agent) agent.status = status; // ENABLED / DISABLED，不是 RUNNING / STOPPED
          }),

        // ---------- skills ----------
        createPersonalSkill: (input) => {
          const skillId = nid("skill");
          const at = nowIso();
          mutate((s) => {
            const versionId = nid("sv");
            s.skills[skillId] = {
              id: skillId,
              name: input.name,
              description: input.description,
              scope: "PERSONAL", // 普通员工创建 Skill 固定 PERSONAL
              categoryId: input.categoryId,
              ownerUserId: s.currentUser.id,
              versions: [
                { id: versionId, version: "v1.0.0", status: "PUBLISHED", publishedAt: at },
              ],
              currentVersionId: versionId,
              enabledByMe: true,
              createdAt: at,
              updatedAt: at,
            };
          });
          return skillId;
        },
        cloneSkill: (sourceSkillVersionId) => {
          const skillId = nid("skill");
          mutate((s) => {
            for (const src of Object.values(s.skills)) {
              const version = src.versions.find(
                (v) => v.id === sourceSkillVersionId && v.status === "PUBLISHED",
              );
              if (!version) continue;
              // Skill Clone = Snapshot Copy（P7/P9）
              const at = nowIso();
              const newVersionId = nid("sv");
              s.skills[skillId] = {
                id: skillId,
                name: src.name,
                description: src.description,
                scope: "PERSONAL",
                categoryId: src.categoryId,
                ownerUserId: s.currentUser.id,
                sourceSkillVersionId,
                versions: [
                  {
                    id: newVersionId, version: "v1.0.0", status: "PUBLISHED", publishedAt: at,
                    changelog: `Clone 自 ${src.name} ${version.version}`,
                  },
                ],
                currentVersionId: newVersionId,
                enabledByMe: true,
                createdAt: at,
                updatedAt: at,
              };
              break;
            }
          });
          return skillId;
        },
        setSkillEnabled: (skillId, enabled) =>
          mutate((s) => {
            const skill = s.skills[skillId];
            if (skill) skill.enabledByMe = enabled;
          }),

        // ---------- administration mock controls ----------
        addModelCandidate: (input) => {
          const id = nid("mp");
          mutate((s) => {
            s.modelCandidates = [...s.modelCandidates, { id, ...input }];
          });
          return id;
        },
        updateModelCandidate: (id, patch) =>
          mutate((s) => {
            s.modelCandidates = s.modelCandidates.map((model) =>
              model.id === id ? { ...model, ...patch } : model,
            );
          }),
        setToolRiskLevel: (toolId, riskLevel) =>
          mutate((s) => {
            const tool = s.tools.find((item) => item.id === toolId);
            if (tool) tool.riskLevel = riskLevel;
          }),
        setToolStatus: (toolId, status) =>
          mutate((s) => {
            const tool = s.tools.find((item) => item.id === toolId);
            const version = tool?.versions.at(-1);
            if (version) version.status = status;
          }),
        setMcpServerStatus: (id, status) =>
          mutate((s) => {
            const server = s.mcpServers.find((item) => item.id === id);
            if (server) server.status = status;
          }),
        setMcpCredentialStatus: (id, status) =>
          mutate((s) => {
            const server = s.mcpServers.find((item) => item.id === id);
            if (server) server.credentialStatus = status;
          }),
        addSkillCategory: (name) => {
          const id = nid("cat");
          mutate((s) => {
            const maxSort = Math.max(0, ...s.categories.map((item) => item.sortOrder));
            s.categories = [...s.categories, { id, name, sortOrder: maxSort + 10 }];
          });
          return id;
        },
        updateSkillCategory: (id, patch) =>
          mutate((s) => {
            s.categories = s.categories.map((category) =>
              category.id === id ? { ...category, ...patch } : category,
            );
          }),
        moveSkillCategory: (id, direction) =>
          mutate((s) => {
            const ordered = [...s.categories].sort((a, b) => a.sortOrder - b.sortOrder);
            const index = ordered.findIndex((item) => item.id === id);
            const swapIndex = direction === "up" ? index - 1 : index + 1;
            if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
            const currentOrder = ordered[index].sortOrder;
            ordered[index].sortOrder = ordered[swapIndex].sortOrder;
            ordered[swapIndex].sortOrder = currentOrder;
            s.categories = ordered;
          }),
        addPolicy: (input) => {
          const id = nid("policy");
          mutate((s) => {
            s.policies = [...s.policies, { id, ...input }];
          });
          return id;
        },
        updatePolicy: (id, patch) =>
          mutate((s) => {
            s.policies = s.policies.map((policy) =>
              policy.id === id ? { ...policy, ...patch } : policy,
            );
          }),
        addTeam: (input) => {
          const id = nid("team");
          mutate((s) => {
            s.teams = [...s.teams, { id, ...input }];
          });
          return id;
        },
        updateTeam: (id, patch) =>
          mutate((s) => {
            s.teams = s.teams.map((team) => (team.id === id ? { ...team, ...patch } : team));
          }),

        // ---------- session ----------
        setViewAsAdmin: (v) =>
          mutate((s) => {
            s.viewAsAdmin = v;
          }),
        setTheme: (theme) =>
          mutate((s) => {
            s.theme = theme;
          }),
      };
    },
    {
      name: "gateforge-workspace-v1",
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // 刷新后的模拟状态收敛：流式消息落定；中断的 RUNNING / PAUSED Run 标记完成
        //（WAITING_APPROVAL 保留——审批是持久状态，批准后走同一 Run 收尾）
        for (const conv of Object.values(state.conversations)) {
          for (const m of conv.messages) if (m.streaming) m.streaming = false;
        }
        for (const task of Object.values(state.tasks)) {
          for (const run of task.runs) {
            if (run.status === "RUNNING" || run.status === "PAUSED") {
              run.status = "COMPLETED";
              run.finishedAt = run.finishedAt ?? new Date().toISOString();
              run.usage = { inputTokens: 3600, outputTokens: 1400, costUsd: 0.07 };
            }
          }
        }
      },
    },
  ),
);

// Helper: Task 当前活动 Run（执行状态只属于 Run，P4）
export function activeRunOf(task: Task): Run | undefined {
  return task.runs.find(
    (r) => r.status === "RUNNING" || r.status === "WAITING_APPROVAL" || r.status === "PAUSED",
  );
}

export function currentRunOf(task: Task): Run | undefined {
  return task.runs[task.runs.length - 1];
}
