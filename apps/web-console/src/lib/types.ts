/**
 * GateForge Stage 01 mock frontend types.
 *
 * Shapes follow the frozen contracts:
 * - docs/DATA_MODEL.md (entities)
 * - docs/API_CONTRACTS.md (endpoint semantics, error contract)
 * - docs/USER_AND_RESOURCE_MODEL.md (scope / status / clone semantics)
 *
 * Mock-only flags (persisted / streaming) are marked `Stage 01 only`.
 */

// ---------- Shared enums (frozen vocabulary) ----------

/** UI 文案：WORKSPACE=平台 / TEAM=团队 / PERSONAL=我的（不使用 PLATFORM） */
export type Scope = "WORKSPACE" | "TEAM" | "PERSONAL";

export type Role =
  | "WORKSPACE_ADMIN"
  | "TEAM_ADMIN"
  | "TEAM_BUILDER"
  | "EMPLOYEE"
  | "AUDITOR"
  | "OPERATOR";

/** Agent.status 只有 ENABLED | DISABLED（可用 / 已停用）；执行状态只属于 Run */
export type AgentStatus = "ENABLED" | "DISABLED";

export type AgentKind = "PERSONAL" | "TEMPLATE";

export type VersionStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";

/** Task.status 只有 ACTIVE | ARCHIVED */
export type TaskStatus = "ACTIVE" | "ARCHIVED";

/** Run 状态机（RUNTIME_CONTRACTS.md §3） */
export type RunStatus =
  | "CREATED"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type ToolProvider = "BUILTIN" | "MCP" | "HTTP";

export type ToolRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type PolicyDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

// ---------- Identity ----------

export interface User {
  id: string;
  name: string;
  role: Role;
  teams: string[];
  avatarColor: string;
}

// ---------- Models（员工视角 = Model Policy 候选集） ----------

/** GET /api/me/model-candidates —— “我当前允许使用哪些模型” */
export interface ModelCandidate {
  id: string; // modelPolicyId
  label: string; // 展示名，如 GPT-5.2
  provider: string;
  model: string;
}

// ---------- Tools ----------

export interface ToolVersion {
  id: string; // exact toolVersionId（绑定依据）
  version: string;
  status: "ACTIVE" | "DISABLED";
  publishedAt: string;
}

export interface Tool {
  id: string;
  name: string; // e.g. builtin.read / github.push
  provider: ToolProvider;
  description: string;
  riskLevel: ToolRiskLevel;
  mcpServerName?: string;
  versions: ToolVersion[];
}

// ---------- Skills ----------

export interface SkillCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface SkillVersion {
  id: string; // exact skillVersionId（绑定依据）
  version: string;
  status: VersionStatus;
  publishedAt?: string;
  changelog?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  scope: Scope;
  categoryId: string;
  teamName?: string;
  ownerUserId?: string;
  versions: SkillVersion[];
  /** 当前展示版本（最新 Published；Draft 显示 Draft） */
  currentVersionId: string;
  /** Snapshot Copy 来源（P7/P9：记录来源，不实时继承） */
  sourceSkillVersionId?: string;
  /** UserSkillEnablement（我的启用状态） */
  enabledByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Agents ----------

export interface AgentVersionManifest {
  engine: { type: "pi" };
  modelPolicyId: string;
  /** name 仅展示，skillVersionId 才是绑定依据（exact SkillVersion） */
  skills: { name: string; skillVersionId: string }[];
  /** name 仅展示，toolVersionId 才是绑定依据（exact ToolVersion） */
  tools: { name: string; toolVersionId: string }[];
}

export interface AgentVersion {
  id: string;
  version: string;
  status: VersionStatus;
  manifest: AgentVersionManifest;
  createdAt: string;
  publishedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatarEmoji: string;
  avatarColor: string;
  kind: AgentKind;
  scope: Scope;
  teamName?: string;
  ownerUserId?: string;
  status: AgentStatus;
  /** Template Clone 来源（P7/P8：记录来源，不实时继承） */
  sourceTemplateVersionId?: string;
  versions: AgentVersion[];
  publishedVersionId: string | null;
  draftVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Conversation（不绑 Agent、不产生 Run，必经 Model Gateway） ----------

export interface ConversationMessageMeta {
  modelPolicyId?: string;
  provider?: string;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** Stage 01 only：流式输出中 */
  streaming?: boolean;
  meta?: ConversationMessageMeta;
}

export interface Conversation {
  id: string;
  title: string;
  defaultModelPolicyId: string;
  /** ConversationSkillBinding：exact SkillVersion（导入后平台 Skill 更新不影响会话） */
  skillVersionIds: string[];
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  /** Stage 01 only：首次发送消息后才进入 History */
  persisted: boolean;
}

// ---------- Task / Run（Task 固定 agentId + exact agentVersionId，P12/P17） ----------

export type TaskMessageKind = "text" | "tool-progress" | "run-status";

export interface TaskMessage {
  id: string;
  role: "user" | "assistant" | "system";
  kind: TaskMessageKind;
  content: string;
  createdAt: string;
  runId?: string;
}

export type RunEventType =
  | "state"
  | "model_call"
  | "tool_call"
  | "message"
  | "approval"
  | "file"
  | "error";

export interface RunEvent {
  id: string;
  runId: string;
  type: RunEventType;
  title: string;
  detail?: string;
  toolName?: string;
  decision?: PolicyDecision;
  at: string;
}

export type ToolCallStatus =
  | "PENDING"
  | "AWAITING_APPROVAL"
  | "SUCCEEDED"
  | "FAILED"
  | "REJECTED";

export interface ToolCall {
  id: string;
  runId: string;
  toolName: string;
  toolVersionId: string;
  provider: ToolProvider;
  /** 审批展示“本次精确请求”的参数摘要（G6） */
  argsDigest: string;
  resource?: string;
  decision: PolicyDecision;
  status: ToolCallStatus;
  resultDigest?: string;
  approvalId?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface Run {
  id: string;
  taskId: string;
  /** 人类可读序号：Run #1 / Run #2 */
  index: number;
  /** 固定 exact Published AgentVersion（G5） */
  agentVersionId: string;
  status: RunStatus;
  events: RunEvent[];
  toolCalls: ToolCall[];
  files: { path: string; change: "created" | "modified"; diffSummary: string }[];
  usage: RunUsage;
  approvalId?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  /** 创建时固定，之后不可变（P17） */
  agentId: string;
  agentVersionId: string;
  status: TaskStatus;
  messages: TaskMessage[];
  runs: Run[];
  createdAt: string;
  updatedAt: string;
  /** Stage 01 only：首条指令发送后持久化 */
  persisted: boolean;
}

// ---------- Approval（批准的是本次精确请求，G6） ----------

export interface ApprovalRequest {
  id: string;
  taskId: string;
  runId: string;
  agentId: string;
  /** 展示用 */
  agentName: string;
  taskTitle: string;
  toolName: string;
  action: string;
  resource: string;
  argsDigest: string;
  policyName: string;
  riskLevel: ToolRiskLevel;
  status: ApprovalStatus;
  requestedAt: string;
  expiresAt: string;
  decidedAt?: string;
  decidedBy?: string;
  comment?: string;
}

// ---------- Administration skeleton data ----------

export interface McpServer {
  id: string;
  name: string;
  transport: string;
  status: "CONNECTED" | "DISABLED";
  toolCount: number;
  lastSyncAt: string;
  credentialStatus: "CONFIGURED" | "NOT_CONFIGURED";
}

export interface PolicyRule {
  id: string;
  name: string;
  subject: string;
  action: string;
  tool: string;
  effect: PolicyDecision;
  enabled: boolean;
}

export interface TeamInfo {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  teamAdmin: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  operation: string;
  resource: string;
  result: "OK" | "DENIED";
  correlationId: string;
}

// ---------- Workspace tabs（Stage 01 only，前端本地状态） ----------

export type TabKind = "conversation" | "task" | "composer";

export interface WorkspaceTab {
  /** 稳定 tab 身份：`conv:{id}` / `task:{id}` / `composer` */
  key: string;
  kind: TabKind;
  refId: string;
  title: string;
}

/** 每 Tab 草稿与滚动状态（切 Tab 不丢上下文） */
export interface TabUiState {
  draft: string;
  scrollTop: number;
}
