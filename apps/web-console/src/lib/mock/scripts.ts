/**
 * Stage 01 mock behavior scripts — conversation replies and Task Run plans.
 *
 * The Run plan encodes the frozen execution rules as a clickable demo:
 * - each new user instruction creates a NEW Run
 * - a REQUIRE_APPROVAL decision pauses the SAME Run at WAITING_APPROVAL
 * - approving resumes that SAME Run (never creates a new one)
 */
import type { FileChange, PolicyDecision, ToolProvider, ToolRiskLevel } from "@/lib/types";

// ---------- Conversation replies（Conversation 必经 Model Gateway 的 mock 输出） ----------

const REPLY_VARIANTS = [
  (t: string) =>
    `关于「${t}」，可以从三个层面理解：\n\n1. **核心概念**——先明确问题域里的关键对象与它们的关系；\n2. **常见做法**——业界成熟方案通常如何处理，以及取舍点在哪里；\n3. **落地建议**——结合当前上下文，给出可以直接执行的下一步。\n\n如果你把具体场景（代码片段 / 报错信息 / 目标）贴进来，我可以给出更针对性的分析。`,
  (t: string) =>
    `收到。针对「${t}」我整理了一个可执行的思路：先拆分输入与预期输出，再识别其中的约束条件，最后按优先级排布验证步骤。需要我进一步展开其中某一步吗？`,
  (t: string) =>
    `这个问题在工程实践里很典型。「${t}」的关键在于把大问题切成可独立验证的小块：每完成一块就用最小用例确认假设，避免在错误前提上叠加复杂度。\n\n要我基于某个具体模块帮你走一遍这个过程吗？`,
];

export function conversationReply(instruction: string, round: number): string {
  return REPLY_VARIANTS[round % REPLY_VARIANTS.length](instruction.slice(0, 40));
}

// ---------- Task Run plans ----------

export interface RunStep {
  /** 延迟（ms）后执行该步 */
  delay: number;
  type: "model" | "tool" | "file" | "assistant" | "state";
  title: string;
  detail?: string;
  tool?: {
    name: string;
    versionId: string;
    provider: ToolProvider;
    argsDigest: string;
    resource?: string;
    decision: PolicyDecision;
    riskLevel: ToolRiskLevel;
    resultDigest?: string;
  };
  file?: FileChange;
  assistantText?: string;
  /** 执行完该步后的 Run 状态（缺省保持 RUNNING） */
  endStatus?: "COMPLETED" | "FAILED";
  /** 审批通过后真正执行挂起中的 ToolCall（不新建重复 tool call） */
  completesPendingTool?: boolean;
  /** Run 结束时写入的 usage */
  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
}

function tv(toolName: string): string {
  // 与 catalog 中 TOOL_VERSION_BY_NAME 保持一致的快捷方式（避免循环依赖用简单映射）
  const map: Record<string, string> = {
    "builtin.read": "tv_read_v3",
    "builtin.grep": "tv_grep_v3",
    "builtin.glob": "tv_glob_v2",
    "builtin.edit": "tv_edit_v3",
    "builtin.write": "tv_write_v2",
    "builtin.bash": "tv_bash_v2",
    "github.push": "tv_ghpush_v2",
    "github.pr.create": "tv_ghpr_v1",
    "jira.query": "tv_jira_v1",
  };
  return map[toolName] ?? "tv_unknown_v1";
}

const LOW = "LOW" as const, MED = "MEDIUM" as const, HIGH = "HIGH" as const;

/**
 * 首个 Run 的脚本：完整演示 Tool 执行链 + REQUIRE_APPROVAL 暂停。
 * 最后一步 github.push 决策为 REQUIRE_APPROVAL，Run 停在 WAITING_APPROVAL，
 * 批准后同一 Run 继续执行 push 与总结（同一 Run，不新建）。
 */
export function buildFirstRunPlan(_agentName: string, instruction: string): RunStep[] {
  return [
    {
      delay: 700, type: "model", title: "模型调用 gpt-5.2：分析指令并生成执行计划",
      detail: `goal="${instruction.slice(0, 30)}" · input 1.1k / output 350 tokens`,
    },
    {
      delay: 1000, type: "tool",
      title: "builtin.read 读取登录链路代码",
      tool: { name: "builtin.read", versionId: tv("builtin.read"), provider: "BUILTIN", argsDigest: 'file="src/main/java/com/acme/auth/LoginService.java"', decision: "ALLOW", riskLevel: LOW },
    },
    {
      delay: 1000, type: "tool",
      title: "builtin.grep 定位超时配置",
      tool: { name: "builtin.grep", versionId: tv("builtin.grep"), provider: "BUILTIN", argsDigest: 'pattern="timeout|504" path="src/auth/"', decision: "ALLOW", riskLevel: LOW, resultDigest: "6 matches in 3 files" },
    },
    {
      delay: 1200, type: "tool",
      title: "builtin.edit 修改 LoginService.java 连接池超时",
      detail: "+8 −2",
      tool: { name: "builtin.edit", versionId: tv("builtin.edit"), provider: "BUILTIN", argsDigest: 'file="src/auth/LoginService.java" hunk="pool.timeout 504→30s"', decision: "ALLOW", riskLevel: MED },
      file: {
        path: "src/main/java/com/acme/auth/LoginService.java",
        change: "modified",
        diffSummary: "+8 −2",
        before: `public LoginResult login(LoginRequest request) {
    var session = pool.borrow();
    session.setTimeout(504_000);
    return authenticate(session, request);
}`,
        after: `public LoginResult login(LoginRequest request) {
    var session = pool.borrow();
    session.setTimeout(Duration.ofSeconds(30));
    session.setValidationTimeout(Duration.ofSeconds(3));
    try {
        return authenticate(session, request);
    } finally {
        pool.release(session);
    }
}`,
      },
    },
    {
      delay: 1300, type: "tool",
      title: "builtin.bash 运行回归测试",
      tool: { name: "builtin.bash", versionId: tv("builtin.bash"), provider: "BUILTIN", argsDigest: 'cmd="mvn test -Dtest=LoginServiceTest"', decision: "ALLOW", riskLevel: HIGH, resultDigest: "Tests run: 12, Failures: 0, Errors: 0" },
    },
    {
      delay: 1100, type: "assistant", title: "Agent 输出说明",
      assistantText: "已完成本地修复与回归测试（12 个用例全部通过）。准备将修复推送到远端分支 `feat/login-timeout`——该动作命中 production-write-approval 策略，需要你的批准后才会执行。",
    },
    {
      delay: 900, type: "tool",
      title: "github.push 推送分支（等待审批）",
      tool: {
        name: "github.push", versionId: tv("github.push"), provider: "MCP",
        argsDigest: 'repo="acme/payment-service" branch="feat/login-timeout" commit="9f31c2a 修复登录超时：连接池超时 504→30s"',
        resource: "acme/payment-service · branch feat/login-timeout",
        decision: "REQUIRE_APPROVAL", riskLevel: HIGH,
      },
    },
    // —— 以下步骤仅在批准后继续（同一个 Run）——
    {
      delay: 1200, type: "tool", completesPendingTool: true,
      title: "github.push 推送成功",
      detail: "commit 9f31c2a → origin/feat/login-timeout",
      tool: { name: "github.push", versionId: tv("github.push"), provider: "MCP", argsDigest: 'repo="acme/payment-service" branch="feat/login-timeout" commit="9f31c2a"', decision: "ALLOW", riskLevel: HIGH, resultDigest: "pushed 9f31c2a → origin/feat/login-timeout" },
    },
    {
      delay: 900, type: "assistant", title: "Agent 输出说明",
      assistantText: "✅ 登录超时修复完成：\n- `LoginService.java` 连接池超时 504 → 30s\n- 回归测试 12/12 通过\n- 已推送 `feat/login-timeout`（commit 9f31c2a），可以在 GitHub 上发起 PR。",
      endStatus: "COMPLETED",
      usage: { inputTokens: 5800, outputTokens: 2100, costUsd: 0.116 },
    },
  ];
}

/** 后续 Run：新指令 → 新 Run；不再触发审批，走短链路。 */
export function buildFollowupRunPlan(instruction: string): RunStep[] {
  return [
    {
      delay: 700, type: "model", title: "模型调用 gpt-5.2：分析补充指令",
      detail: `goal="${instruction.slice(0, 30)}" · input 1.4k / output 300 tokens`,
    },
    {
      delay: 1000, type: "tool",
      title: "builtin.read 查看现有测试结构",
      tool: { name: "builtin.read", versionId: tv("builtin.read"), provider: "BUILTIN", argsDigest: 'file="src/test/java/com/acme/auth/LoginServiceTest.java"', decision: "ALLOW", riskLevel: LOW },
    },
    {
      delay: 1200, type: "tool",
      title: "builtin.edit 补充边界用例",
      detail: "+34 −0",
      tool: { name: "builtin.edit", versionId: tv("builtin.edit"), provider: "BUILTIN", argsDigest: 'file="LoginServiceTest.java" hunk="add pool timeout edge cases"', decision: "ALLOW", riskLevel: MED },
      file: {
        path: "src/test/java/com/acme/auth/LoginServiceTest.java",
        change: "modified",
        diffSummary: "+34 −0",
        before: `class LoginServiceTest {
    @Test
    void loginReturnsToken() {
        // existing happy-path coverage
    }
}`,
        after: `class LoginServiceTest {
    @Test
    void loginReturnsToken() {
        // existing happy-path coverage
    }

    @Test
    void recoversAfterPoolTimeout() {
        // verifies timeout recovery
    }

    @Test
    void keepsRetryIdempotent() {
        // verifies retry idempotency
    }

    @Test
    void handlesPoolJitter() {
        // verifies transient pool jitter
    }
}`,
      },
    },
    {
      delay: 1100, type: "tool",
      title: "builtin.bash 运行测试",
      tool: { name: "builtin.bash", versionId: tv("builtin.bash"), provider: "BUILTIN", argsDigest: 'cmd="mvn test -Dtest=LoginServiceTest"', decision: "ALLOW", riskLevel: HIGH, resultDigest: "Tests run: 15, Failures: 0" },
    },
    {
      delay: 800, type: "assistant", title: "Agent 输出说明",
      assistantText: "✅ 已补齐边界用例（连接池抖动、超时恢复、重试幂等三类，共 +3 个用例），15/15 全部通过。本轮改动仅限测试代码，无需推送审批；如需我推送到远端请再说明。",
      endStatus: "COMPLETED",
      usage: { inputTokens: 3200, outputTokens: 1200, costUsd: 0.062 },
    },
  ];
}

/** 通用 Agent（无 HIGH 风险 MCP Tool）的 Run 脚本 */
export function buildGenericRunPlan(agentName: string, instruction: string): RunStep[] {
  return [
    { delay: 700, type: "model", title: `模型调用：${agentName} 生成执行计划`, detail: `goal="${instruction.slice(0, 30)}"` },
    {
      delay: 1000, type: "tool",
      title: "builtin.read 收集上下文",
      tool: { name: "builtin.read", versionId: tv("builtin.read"), provider: "BUILTIN", argsDigest: 'file="README.md"', decision: "ALLOW", riskLevel: LOW, resultDigest: "128 lines" },
    },
    {
      delay: 900, type: "assistant", title: "Agent 输出说明",
      assistantText: `我已按指令整理了执行结果。当前为 Stage 01 Mock 演示：${agentName} 使用固定 Published Version 处理该任务，无高风险动作需要审批。`,
      endStatus: "COMPLETED",
      usage: { inputTokens: 1800, outputTokens: 700, costUsd: 0.03 },
    },
  ];
}

/** 审批被拒绝后的收尾（同一 Run 继续，但动作被拦截） */
export function buildRejectedTail(instruction: string): RunStep[] {
  return [
    {
      delay: 900, type: "assistant", title: "Agent 输出说明",
      assistantText: `⚠️ github.push 已被你拒绝，本次 Run 不会推送任何改动。本地修复（LoginService.java + 测试）仍保留在工作区，你可以稍后在 Inspector 中重新发起推送，或先评审改动内容。\n\n指令「${instruction.slice(0, 24)}」的其余步骤已全部完成。`,
      endStatus: "COMPLETED",
      usage: { inputTokens: 5200, outputTokens: 1800, costUsd: 0.1 },
    },
  ];
}
