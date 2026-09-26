/**
 * Stage 01 mock catalog — seeded reference data.
 *
 * Entity shapes follow docs/DATA_MODEL.md; status vocabularies follow the
 * frozen contracts (Agent = ENABLED/DISABLED, Task = ACTIVE/ARCHIVED,
 * execution states only on Run). IDs are fixed so seed data can cross-reference.
 */
import type {
  Agent,
  AgentVersion,
  AgentVersionManifest,
  ApprovalRequest,
  AuditEntry,
  Conversation,
  McpServer,
  ModelCandidate,
  PolicyRule,
  Skill,
  SkillCategory,
  Task,
  TeamInfo,
  Tool,
  User,
} from "@/lib/types";

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}
function hoursAgo(h: number): string {
  return minutesAgo(h * 60);
}
function daysAgo(d: number, hour = 10, minute = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const CURRENT_USER: User = {
  id: "usr_chenxi",
  name: "陈曦",
  role: "EMPLOYEE",
  teams: ["支付平台团队"],
  avatarColor: "#3b82f6",
};

export const MODEL_CANDIDATES: ModelCandidate[] = [
  { id: "mp_gpt52", label: "GPT-5.2", provider: "openai", model: "gpt-5.2" },
  { id: "mp_claude46", label: "Claude Sonnet 4.6", provider: "anthropic", model: "claude-sonnet-4.6" },
  { id: "mp_glm5", label: "GLM-5", provider: "zhipu", model: "glm-5" },
  { id: "mp_dsv32", label: "DeepSeek V3.2", provider: "deepseek", model: "deepseek-v3.2" },
];

export const SKILL_CATEGORIES: SkillCategory[] = [
  { id: "cat_dev", name: "开发", sortOrder: 1 },
  { id: "cat_design", name: "设计", sortOrder: 2 },
  { id: "cat_test", name: "测试", sortOrder: 3 },
  { id: "cat_data", name: "数据", sortOrder: 4 },
  { id: "cat_ops", name: "运维", sortOrder: 5 },
];

function toolVersion(id: string, version: string, publishedAt: string) {
  return { id, version, status: "ACTIVE" as const, publishedAt };
}

export const TOOLS: Tool[] = [
  {
    id: "tool_read", name: "builtin.read", provider: "BUILTIN", riskLevel: "LOW",
    description: "读取工作区内文件内容",
    versions: [toolVersion("tv_read_v3", "v3.0.0", daysAgo(30))],
  },
  {
    id: "tool_grep", name: "builtin.grep", provider: "BUILTIN", riskLevel: "LOW",
    description: "按正则搜索文件内容",
    versions: [toolVersion("tv_grep_v3", "v3.0.0", daysAgo(30))],
  },
  {
    id: "tool_glob", name: "builtin.glob", provider: "BUILTIN", riskLevel: "LOW",
    description: "按模式匹配文件路径",
    versions: [toolVersion("tv_glob_v2", "v2.1.0", daysAgo(45))],
  },
  {
    id: "tool_edit", name: "builtin.edit", provider: "BUILTIN", riskLevel: "MEDIUM",
    description: "编辑工作区内文件",
    versions: [toolVersion("tv_edit_v3", "v3.1.0", daysAgo(20))],
  },
  {
    id: "tool_write", name: "builtin.write", provider: "BUILTIN", riskLevel: "MEDIUM",
    description: "创建 / 覆写工作区内文件",
    versions: [toolVersion("tv_write_v2", "v2.0.0", daysAgo(45))],
  },
  {
    id: "tool_bash", name: "builtin.bash", provider: "BUILTIN", riskLevel: "HIGH",
    description: "在受控沙箱中执行 shell 命令（受 command policy 约束，不能绕过 Tool Policy）",
    versions: [toolVersion("tv_bash_v2", "v2.3.0", daysAgo(15))],
  },
  {
    id: "tool_gh_push", name: "github.push", provider: "MCP", riskLevel: "HIGH",
    description: "推送分支 / 提交到 GitHub 仓库", mcpServerName: "github",
    versions: [toolVersion("tv_ghpush_v2", "v2.0.0", daysAgo(12))],
  },
  {
    id: "tool_gh_pr", name: "github.pr.create", provider: "MCP", riskLevel: "MEDIUM",
    description: "创建 Pull Request", mcpServerName: "github",
    versions: [toolVersion("tv_ghpr_v1", "v1.4.0", daysAgo(12))],
  },
  {
    id: "tool_jira", name: "jira.query", provider: "MCP", riskLevel: "LOW",
    description: "查询 Jira Issue", mcpServerName: "jira",
    versions: [toolVersion("tv_jira_v1", "v1.0.0", daysAgo(60))],
  },
];

export const TOOL_VERSION_BY_NAME = Object.fromEntries(
  TOOLS.map((t) => [t.name, t.versions[0].id]),
);

function skill(
  id: string, name: string, description: string, scope: Skill["scope"],
  categoryId: string, versions: Skill["versions"], currentVersionId: string,
  extra: Partial<Skill> = {},
): Skill {
  return {
    id, name, description, scope, categoryId,
    versions, currentVersionId,
    enabledByMe: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
    ...extra,
  };
}

export const SKILLS: Skill[] = [
  skill("skill_java_backend", "Java Backend", "Spring Boot 后端开发规范与常见问题处理", "WORKSPACE", "cat_dev", [
    { id: "sv_jb_v110", version: "v1.1.0", status: "DEPRECATED", publishedAt: daysAgo(90) },
    { id: "sv_jb_v120", version: "v1.2.0", status: "PUBLISHED", publishedAt: daysAgo(10), changelog: "补充连接池超时治理规范" },
  ], "sv_jb_v120"),
  skill("skill_code_review", "Code Review", "代码评审检查单与常见缺陷模式", "WORKSPACE", "cat_dev", [
    { id: "sv_cr_v110", version: "v1.1.0", status: "PUBLISHED", publishedAt: daysAgo(25) },
  ], "sv_cr_v110"),
  skill("skill_ui_design", "UI Design", "界面设计规范、组件与可用性检查", "WORKSPACE", "cat_design", [
    { id: "sv_ui_v100", version: "v1.0.0", status: "PUBLISHED", publishedAt: daysAgo(40) },
  ], "sv_ui_v100"),
  skill("skill_sql_tuning", "SQL Tuning", "慢 SQL 分析与索引优化方法", "WORKSPACE", "cat_data", [
    { id: "sv_sql_v103", version: "v1.0.3", status: "PUBLISHED", publishedAt: daysAgo(18) },
  ], "sv_sql_v103"),
  skill("skill_pay_api", "支付域 API 规范", "支付平台团队 API 设计与幂等处理规范", "TEAM", "cat_dev", [
    { id: "sv_pay_v100", version: "v1.0.0", status: "PUBLISHED", publishedAt: daysAgo(20) },
  ], "sv_pay_v100", { teamName: "支付平台团队" }),
  skill("skill_api_test", "API 测试生成", "基于接口契约生成测试用例", "TEAM", "cat_test", [
    { id: "sv_apitest_v121", version: "v1.2.1", status: "PUBLISHED", publishedAt: daysAgo(8) },
  ], "sv_apitest_v121", { teamName: "支付平台团队" }),
  skill("skill_growth_exp", "增长实验设计", "A/B 实验设计与指标口径（增长团队）", "TEAM", "cat_data", [
    { id: "sv_growth_v100", version: "v1.0.0", status: "PUBLISHED", publishedAt: daysAgo(30) },
  ], "sv_growth_v100", { teamName: "增长团队" }),
  skill("skill_fe_perf", "前端性能优化笔记", "个人整理的前端性能优化 checklist", "PERSONAL", "cat_dev", [
    { id: "sv_feperf_v100", version: "v1.0.0", status: "PUBLISHED", publishedAt: daysAgo(6) },
  ], "sv_feperf_v100", { ownerUserId: CURRENT_USER.id }),
  skill("skill_weekly_tpl", "个人周报模板", "我的周报结构与措辞模板", "PERSONAL", "cat_design", [
    { id: "sv_weekly_v100", version: "v1.0.0", status: "PUBLISHED", publishedAt: daysAgo(14) },
  ], "sv_weekly_v100", { ownerUserId: CURRENT_USER.id }),
];

function agentVersion(
  id: string, version: string, status: AgentVersion["status"],
  manifest: AgentVersionManifest, createdAt: string, publishedAt?: string,
): AgentVersion {
  return { id, version, status, manifest, createdAt, publishedAt };
}

function manifest(partial: {
  modelPolicyId: string;
  skillIds: [string, string][]; // [skillId, skillVersionId]
  toolNames: string[];
}): AgentVersionManifest {
  const byId = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
  return {
    engine: { type: "pi" },
    modelPolicyId: partial.modelPolicyId,
    skills: partial.skillIds.map(([skillId, svId]) => ({
      name: byId[skillId].name,
      skillVersionId: svId,
    })),
    tools: partial.toolNames.map((name) => ({
      name,
      toolVersionId: TOOL_VERSION_BY_NAME[name],
    })),
  };
}

export const CODING_MANIFEST_V120 = manifest({
  modelPolicyId: "mp_gpt52",
  skillIds: [["skill_java_backend", "sv_jb_v120"], ["skill_code_review", "sv_cr_v110"]],
  toolNames: ["builtin.read", "builtin.grep", "builtin.glob", "builtin.edit", "builtin.write", "builtin.bash", "github.push", "github.pr.create"],
});

export const AGENTS: Agent[] = [
  {
    id: "tpl_coding", name: "Coding Agent 模板", description: "平台级后端开发模板：编码 / 评审 / 测试 / 推送",
    avatarEmoji: "🛠️", avatarColor: "#2563eb", kind: "TEMPLATE", scope: "WORKSPACE",
    status: "ENABLED", createdAt: daysAgo(80), updatedAt: daysAgo(10),
    versions: [agentVersion("av_tpl_coding_v120", "v1.2.0", "PUBLISHED", CODING_MANIFEST_V120, daysAgo(30), daysAgo(10))],
    publishedVersionId: "av_tpl_coding_v120", draftVersionId: null,
  },
  {
    id: "tpl_docs", name: "Docs Agent 模板", description: "平台级文档模板：整理 / 润色 / 归档",
    avatarEmoji: "📄", avatarColor: "#0ea5e9", kind: "TEMPLATE", scope: "WORKSPACE",
    status: "ENABLED", createdAt: daysAgo(70), updatedAt: daysAgo(20),
    versions: [agentVersion("av_tpl_docs_v100", "v1.0.0", "PUBLISHED",
      manifest({ modelPolicyId: "mp_claude46", skillIds: [["skill_ui_design", "sv_ui_v100"]], toolNames: ["builtin.read", "builtin.grep", "builtin.write"] }),
      daysAgo(40), daysAgo(20))],
    publishedVersionId: "av_tpl_docs_v100", draftVersionId: null,
  },
  {
    id: "tpl_pay_ops", name: "支付 Ops Agent 模板", description: "支付平台团队运维模板：排查 / 处理工单",
    avatarEmoji: "💳", avatarColor: "#7c3aed", kind: "TEMPLATE", scope: "TEAM", teamName: "支付平台团队",
    status: "ENABLED", createdAt: daysAgo(50), updatedAt: daysAgo(15),
    versions: [agentVersion("av_tpl_payops_v103", "v1.0.3", "PUBLISHED",
      manifest({ modelPolicyId: "mp_glm5", skillIds: [["skill_pay_api", "sv_pay_v100"]], toolNames: ["builtin.read", "builtin.grep", "builtin.bash", "jira.query"] }),
      daysAgo(25), daysAgo(15))],
    publishedVersionId: "av_tpl_payops_v103", draftVersionId: null,
  },
  {
    id: "ag_coding", name: "Coding Agent", description: "我的后端开发助手：修复缺陷、补测试、推分支",
    avatarEmoji: "🤖", avatarColor: "#2563eb", kind: "PERSONAL", scope: "PERSONAL",
    ownerUserId: CURRENT_USER.id, status: "ENABLED",
    sourceTemplateVersionId: "av_tpl_coding_v120",
    createdAt: daysAgo(12), updatedAt: daysAgo(2),
    versions: [agentVersion("av_coding_v120", "v1.2.0", "PUBLISHED", CODING_MANIFEST_V120, daysAgo(12), daysAgo(11))],
    publishedVersionId: "av_coding_v120", draftVersionId: null,
  },
  {
    id: "ag_doc", name: "Doc Writer", description: "从 Docs 模板克隆：整理接口文档与周报",
    avatarEmoji: "📝", avatarColor: "#0ea5e9", kind: "PERSONAL", scope: "PERSONAL",
    ownerUserId: CURRENT_USER.id, status: "ENABLED",
    sourceTemplateVersionId: "av_tpl_docs_v100",
    createdAt: daysAgo(9), updatedAt: daysAgo(5),
    versions: [agentVersion("av_doc_v100", "v1.0.0", "PUBLISHED",
      manifest({ modelPolicyId: "mp_claude46", skillIds: [["skill_ui_design", "sv_ui_v100"]], toolNames: ["builtin.read", "builtin.grep", "builtin.write"] }),
      daysAgo(9), daysAgo(9))],
    publishedVersionId: "av_doc_v100", draftVersionId: null,
  },
  {
    id: "ag_data", name: "Data Analyst", description: "自定义创建：数据查询与报表解读",
    avatarEmoji: "📊", avatarColor: "#059669", kind: "PERSONAL", scope: "PERSONAL",
    ownerUserId: CURRENT_USER.id, status: "DISABLED",
    createdAt: daysAgo(30), updatedAt: daysAgo(7),
    versions: [agentVersion("av_data_v100", "v1.0.0", "PUBLISHED",
      manifest({ modelPolicyId: "mp_dsv32", skillIds: [["skill_sql_tuning", "sv_sql_v103"]], toolNames: ["builtin.read", "builtin.grep"] }),
      daysAgo(30), daysAgo(29))],
    publishedVersionId: "av_data_v100", draftVersionId: null,
  },
  {
    id: "ag_review", name: "PR Reviewer", description: "自定义创建：评审 PR 并总结风险",
    avatarEmoji: "🔍", avatarColor: "#d97706", kind: "PERSONAL", scope: "PERSONAL",
    ownerUserId: CURRENT_USER.id, status: "ENABLED",
    createdAt: daysAgo(20), updatedAt: daysAgo(4),
    versions: [agentVersion("av_review_v110", "v1.1.0", "PUBLISHED",
      manifest({ modelPolicyId: "mp_gpt52", skillIds: [["skill_code_review", "sv_cr_v110"]], toolNames: ["builtin.read", "builtin.grep", "github.pr.create"] }),
      daysAgo(20), daysAgo(19))],
    publishedVersionId: "av_review_v110", draftVersionId: null,
  },
];

// ---------- Administration skeleton data ----------

export const MCP_SERVERS: McpServer[] = [
  { id: "mcp_github", name: "github", transport: "HTTP", status: "CONNECTED", toolCount: 2, lastSyncAt: hoursAgo(5), credentialStatus: "CONFIGURED" },
  { id: "mcp_jira", name: "jira", transport: "HTTP", status: "CONNECTED", toolCount: 1, lastSyncAt: hoursAgo(26), credentialStatus: "CONFIGURED" },
  { id: "mcp_confluence", name: "confluence", transport: "STDIO", status: "DISABLED", toolCount: 0, lastSyncAt: daysAgo(9), credentialStatus: "NOT_CONFIGURED" },
];

export const POLICY_RULES: PolicyRule[] = [
  { id: "pol_prod_push", name: "production-write-approval", subject: "Agent: *", action: "tool.invoke", tool: "github.push", effect: "REQUIRE_APPROVAL", enabled: true },
  { id: "pol_deny_env", name: "deny-secret-read", subject: "Agent: *", action: "tool.invoke", tool: "builtin.bash", effect: "DENY", enabled: true },
  { id: "pol_readonly", name: "allow-readonly-builtin", subject: "Agent: *", action: "tool.invoke", tool: "builtin.read", effect: "ALLOW", enabled: true },
];

export const TEAMS: TeamInfo[] = [
  { id: "team_pay", name: "支付平台团队", description: "支付核心链路研发", memberCount: 12, teamAdmin: "李明" },
  { id: "team_growth", name: "增长团队", description: "增长实验与数据分析", memberCount: 8, teamAdmin: "王芳" },
];

export const AUDIT_ENTRIES: AuditEntry[] = [
  { id: "aud_1", at: hoursAgo(1), actor: "Coding Agent", operation: "tool.invoke", resource: "github.push acme/payment-service", result: "DENIED", correlationId: "corr_8f21ab" },
  { id: "aud_2", at: hoursAgo(3), actor: "陈曦", operation: "approval.decide", resource: "approval apr_102", result: "OK", correlationId: "corr_7c19de" },
  { id: "aud_3", at: hoursAgo(5), actor: "李明", operation: "policy.update", resource: "policy production-write-approval", result: "OK", correlationId: "corr_5b02cc" },
  { id: "aud_4", at: hoursAgo(8), actor: "Doc Writer", operation: "model.call", resource: "claude-sonnet-4.6", result: "OK", correlationId: "corr_3a77ba" },
];

// ---------- Seeded history（今天 / 昨天 / 更早） ----------

function seedConversation(
  id: string, title: string, modelPolicyId: string, skillVersionIds: string[],
  userTexts: string[], assistantTexts: string[], updatedAt: string,
): Conversation {
  const messages = userTexts.flatMap((content, i) => {
    const base = i * 2;
    const created1 = new Date(new Date(updatedAt).getTime() - (userTexts.length - i) * 300_000);
    const created2 = new Date(created1.getTime() + 120_000);
    return [
      { id: `${id}_m${base}`, role: "user" as const, content, createdAt: created1.toISOString() },
      {
        id: `${id}_m${base + 1}`, role: "assistant" as const, content: assistantTexts[i] ?? "好的。",
        createdAt: created2.toISOString(),
        meta: {
          modelPolicyId, provider: MODEL_CANDIDATES.find((m) => m.id === modelPolicyId)?.provider,
          model: MODEL_CANDIDATES.find((m) => m.id === modelPolicyId)?.model,
          usage: { inputTokens: 480 + i * 130, outputTokens: 620 + i * 210 },
        },
      },
    ];
  });
  return {
    id, title, defaultModelPolicyId: modelPolicyId, skillVersionIds, messages,
    createdAt: messages[0]?.createdAt ?? updatedAt, updatedAt, persisted: true,
  };
}

export const SEEDED_CONVERSATIONS: Conversation[] = [
  seedConversation(
    "conv_seed_1", "Spring Security 原理", "mp_gpt52", ["sv_jb_v120"],
    ["帮我解释 Spring Security 认证链的基本流程", "那 JWT 无状态方案里 Filter 顺序要注意什么？"],
    [
      "Spring Security 的认证链由一组 Filter 组成：请求进入 SecurityFilterChain 后，依次经过 SecurityContextPersistenceFilter → 认证 Filter（如 UsernamePasswordAuthenticationFilter）→ 授权 Filter……核心是把认证逻辑抽象成 AuthenticationManager + AuthenticationProvider，任何自定义登录方式都是往链上插入一个 Filter 并注册对应 Provider。",
      "JWT 无状态方案要注意三点：① 自定义 JwtAuthenticationFilter 应放在 UsernamePasswordAuthenticationFilter 之前；② 每次请求都要重建 SecurityContext，不要依赖 Session；③ CORS/CSRF 配置要显式关闭或适配，否则预检请求会被 401 拦截。",
    ],
    hoursAgo(3),
  ),
  seedConversation(
    "conv_seed_2", "周报润色", "mp_claude46", ["sv_weekly_v100"],
    ["把这段周报改得更精炼：本周完成了支付对账模块的联调，修复了 3 个缺陷"],
    [
      "精炼版：**本周进展**：完成支付对账模块联调；修复缺陷 3 个（含 1 个资金口径问题）。如需保留风险与下周计划段落，可以按「进展 / 风险 / 计划」三段式输出。",
    ],
    daysAgo(1, 17, 40),
  ),
];

const CODING_PUBLISHED = AGENTS.find((a) => a.id === "ag_coding")!.versions[0];

function seedTask(id: string, title: string, createdAt: string, updatedAt: string): Task {
  const runId = `${id}_run1`;
  return {
    id, title, agentId: "ag_coding", agentVersionId: CODING_PUBLISHED.id, status: "ACTIVE",
    createdAt, updatedAt, persisted: true,
    messages: [
      { id: `${id}_m0`, role: "user", kind: "text", content: "检查仓库里的 N+1 查询并修复", createdAt, runId },
      { id: `${id}_m1`, role: "assistant", kind: "text", content: "已定位 OrderRepository.findUserOrders() 存在 N+1：循环内逐条查询 user。已改为 JOIN FETCH 批量查询并补充回归测试，全部通过。", createdAt: updatedAt, runId },
    ],
    runs: [
      {
        id: runId, taskId: id, index: 1, agentVersionId: CODING_PUBLISHED.id, status: "COMPLETED",
        startedAt: createdAt, finishedAt: updatedAt,
        events: [
          { id: `${runId}_e1`, runId, type: "state", title: "运行开始（CREATED → RUNNING）", at: createdAt },
          { id: `${runId}_e2`, runId, type: "model_call", title: "模型调用 gpt-5.2：生成修复计划", detail: "input 1.2k / output 380 tokens", at: createdAt },
          { id: `${runId}_e3`, runId, type: "tool_call", title: "builtin.grep 搜索 findUserOrders 调用点", toolName: "builtin.grep", decision: "ALLOW", at: createdAt },
          { id: `${runId}_e4`, runId, type: "file", title: "修改 OrderRepository.java", detail: "+12 −4", at: updatedAt },
          { id: `${runId}_e5`, runId, type: "state", title: "运行完成（RUNNING → COMPLETED）", at: updatedAt },
        ],
        toolCalls: [
          { id: `${runId}_t1`, runId, toolName: "builtin.grep", toolVersionId: TOOL_VERSION_BY_NAME["builtin.grep"], provider: "BUILTIN", argsDigest: 'pattern="findUserOrders" path="src/"', decision: "ALLOW", status: "SUCCEEDED", resultDigest: "5 matches in 4 files", startedAt: createdAt, finishedAt: updatedAt },
          { id: `${runId}_t2`, runId, toolName: "builtin.edit", toolVersionId: TOOL_VERSION_BY_NAME["builtin.edit"], provider: "BUILTIN", argsDigest: 'file="src/repo/OrderRepository.java"', decision: "ALLOW", status: "SUCCEEDED", resultDigest: "applied 1 hunk", startedAt: createdAt, finishedAt: updatedAt },
        ],
        files: [{
          path: "src/main/java/com/acme/repo/OrderRepository.java",
          change: "modified",
          diffSummary: "+12 −4",
          before: `public List<Order> findUserOrders(List<Long> ids) {
    return ids.stream()
        .map(id -> orderDao.findById(id))
        .peek(order -> order.setUser(userDao.findById(order.getUserId())))
        .toList();
}`,
          after: `public List<Order> findUserOrders(List<Long> ids) {
    if (ids.isEmpty()) {
        return List.of();
    }

    return entityManager.createQuery("""
        select distinct o
        from Order o
        join fetch o.user
        where o.id in :ids
        order by o.createdAt desc
        """, Order.class)
        .setParameter("ids", ids)
        .getResultList();
}`,
        }],
        usage: { inputTokens: 4200, outputTokens: 1650, costUsd: 0.084 },
      },
    ],
  };
}

export const SEEDED_TASKS: Task[] = [
  seedTask("task_seed_1", "修复订单列表 N+1 查询", hoursAgo(4), hoursAgo(3)),
  seedTask("task_seed_2", "整理支付 API 文档", daysAgo(1, 14, 10), daysAgo(1, 14, 35)),
];

export const SEEDED_APPROVALS: ApprovalRequest[] = [];
