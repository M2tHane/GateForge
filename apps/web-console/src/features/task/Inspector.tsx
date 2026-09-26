"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  FileDiff,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/overlay";
import { useWorkspaceStore, currentRunOf } from "@/lib/store/workspace-store";
import {
  approvalStatusLabel,
  formatDuration,
  formatTime,
  riskLevelLabel,
  runStatusLabel,
  toolCallStatusLabel,
  toolDecisionLabel,
} from "@/lib/format";
import { toolCallResultSummary, toolCallSummary, toolDisplayName } from "@/lib/tool-display";
import { cn } from "@/lib/utils";
import type { Run, ToolCall } from "@/lib/types";

/**
 * Task 执行详情 Inspector（§7.4 / §21）：运行 / 文件 / 工具 / 链路 / 审批。
 * 聊天流只显示简洁工具进度；完整 Request / Result / Trace / Raw Event 在这里。
 * 工具调用默认显示人类可读摘要（中文显示名 + 参数 / 结果意译）；
 * 原始 Tool ID / toolVersionId / argsDigest 放「技术详情」折叠区，默认收起。
 */
export function Inspector({
  taskId,
  collapsed,
  onToggle,
}: {
  taskId: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  // 渲染契约：整店订阅（mock 嵌套原地变更，窄 selector 不触发重渲染）
  const store = useWorkspaceStore();
  const task = store.tasks[taskId];
  const approvals = store.approvals;
  const [tab, setTab] = useState("run");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // 注意：runs 在 mock 中原地 push，不能依赖 useMemo 缓存（引用不变）
  const runs = [...(task?.runs ?? [])].reverse();
  const currentRun = task ? currentRunOf(task) : undefined;
  const selectedRun: Run | undefined =
    runs.find((r) => r.id === selectedRunId) ?? currentRun ?? runs[0];

  if (!task) return null;

  const pendingCount = Object.values(approvals).filter(
    (a) => a.taskId === taskId && a.status === "PENDING",
  ).length;

  return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col border-l border-border bg-card transition-[width]",
        collapsed ? "w-11" : "w-[380px]",
      )}
    >
      <div className="flex h-10 items-center justify-between border-b border-border px-2">
        {!collapsed ? (
          <span className="px-1 text-xs font-semibold text-foreground">执行详情</span>
        ) : null}
        <button
          onClick={onToggle}
          className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={collapsed ? "展开执行详情" : "收起执行详情"}
        >
          {collapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
        </button>
      </div>

      {collapsed ? null : (
        <>
          <div className="px-3 pt-2">
            <Tabs
              tabs={[
                { id: "run", label: "运行" },
                { id: "files", label: "文件" },
                { id: "tool", label: "工具" },
                { id: "trace", label: "链路" },
                { id: "approval", label: pendingCount > 0 ? `审批 (${pendingCount})` : "审批" },
              ]}
              active={tab}
              onChange={setTab}
              className="text-xs"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {tab === "run" ? (
              <RunTab runs={runs} selectedRun={selectedRun} onSelect={setSelectedRunId} />
            ) : null}
            {tab === "files" ? <FilesTab run={selectedRun} /> : null}
            {tab === "tool" ? <ToolTab run={selectedRun} /> : null}
            {tab === "trace" ? <TraceTab run={selectedRun} /> : null}
            {tab === "approval" ? <ApprovalTab taskId={taskId} /> : null}
          </div>
        </>
      )}
    </div>
  );
}

function RunStatusBadge({ status }: { status: Run["status"] }) {
  const tone =
    status === "COMPLETED"
      ? "success"
      : status === "WAITING_APPROVAL"
        ? "warning"
        : status === "FAILED" || status === "CANCELLED"
          ? "danger"
          : "info";
  return <Badge tone={tone}>{runStatusLabel(status)}</Badge>;
}

function RunTab({
  runs,
  selectedRun,
  onSelect,
}: {
  runs: Run[];
  selectedRun?: Run;
  onSelect: (id: string) => void;
}) {
  if (runs.length === 0) {
    return <div className="py-10 text-center text-xs text-muted-foreground">尚无运行——发送第一条指令后创建</div>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-1 text-[11px] text-muted-foreground">
        每条新指令开始一次新运行；审批通过后恢复同一运行
      </div>
      {runs.map((run) => (
        <button
          key={run.id}
          onClick={() => onSelect(run.id)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left transition-colors",
            selectedRun?.id === run.id ? "border-primary/50 bg-accent/40" : "border-border hover:bg-accent/25",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">运行 #{run.index}</span>
            <RunStatusBadge status={run.status} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{formatDuration(run.startedAt, run.finishedAt)}</span>
            <span>
              {run.usage.inputTokens + run.usage.outputTokens} tokens
            </span>
            <span>${run.usage.costUsd.toFixed(3)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function FilesTab({ run }: { run?: Run }) {
  if (!run || run.files.length === 0) {
    return <div className="py-10 text-center text-xs text-muted-foreground">该运行未修改文件</div>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {run.files.map((f) => (
        <div key={f.path} className="rounded-xl border border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileDiff size={13} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{f.path}</span>
            <Badge tone={f.change === "created" ? "success" : "info"}>
              {f.change === "created" ? "新建" : "修改"}
            </Badge>
          </div>
          <div className="mt-1 pl-5 font-mono text-[11px] text-muted-foreground">{f.diffSummary}</div>
        </div>
      ))}
    </div>
  );
}

function decisionTone(decision: ToolCall["decision"]) {
  return decision === "ALLOW" ? "success" : decision === "DENY" ? "danger" : "warning";
}

function ToolTab({ run }: { run?: Run }) {
  if (!run || run.toolCalls.length === 0) {
    return <div className="py-10 text-center text-xs text-muted-foreground">该运行没有工具调用</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 text-[11px] text-muted-foreground">
        默认显示人类可读摘要；原始请求 / 结果 / 版本绑定在「技术详情」折叠区
      </div>
      {run.toolCalls.map((c) => {
        const summary = toolCallSummary(c.toolName, c.argsDigest);
        const result = c.resultDigest
          ? toolCallResultSummary(c.toolName, c.resultDigest)
          : undefined;
        return (
          <div key={c.id} className="rounded-xl border border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {toolDisplayName(c.toolName)}
              </span>
              <Badge tone={decisionTone(c.decision)}>{toolDecisionLabel(c.decision)}</Badge>
              <Badge
                tone={
                  c.status === "SUCCEEDED"
                    ? "success"
                    : c.status === "AWAITING_APPROVAL"
                      ? "warning"
                      : c.status === "REJECTED" || c.status === "FAILED"
                        ? "danger"
                        : "neutral"
                }
              >
                {toolCallStatusLabel(c.status)}
              </Badge>
            </div>
            {summary ? <div className="mt-1.5 text-xs text-foreground">{summary}</div> : null}
            {c.resultDigest ? (
              <div className="mt-0.5 text-xs text-success">{result ?? c.resultDigest}</div>
            ) : null}
            <details className="mt-1.5">
              <summary className="cursor-pointer select-none text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground">
                技术详情
              </summary>
              <div className="mt-1 space-y-0.5 break-words font-mono text-[11px] text-muted-foreground">
                <div>tool: {c.toolName}</div>
                <div>version: {c.toolVersionId} · provider: {c.provider}</div>
                <div>args: {c.argsDigest}</div>
                {c.resource ? <div>resource: {c.resource}</div> : null}
                {c.resultDigest ? <div className="text-success">result: {c.resultDigest}</div> : null}
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}

function TraceTab({ run }: { run?: Run }) {
  if (!run) {
    return <div className="py-10 text-center text-xs text-muted-foreground">暂无链路记录</div>;
  }
  return (
    <div className="trace-rail flex flex-col gap-3 pb-2">
      {run.events.map((e) => (
        <div key={e.id} className="flex gap-2.5 pl-1">
          <span
            className={cn(
              "mt-1 h-2 w-2 shrink-0 rounded-full",
              e.type === "state" && "bg-primary",
              e.type === "approval" && "bg-warning",
              e.type === "tool_call" && "bg-success",
              e.type === "model_call" && "bg-accent-foreground",
              (e.type === "message" || e.type === "file") && "bg-muted-foreground/50",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-foreground">{e.title}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground/70">{formatTime(e.at)}</span>
            </div>
            {e.detail ? <div className="mt-0.5 break-words font-mono text-[11px] text-muted-foreground">{e.detail}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprovalTab({ taskId }: { taskId: string }) {
  const store = useWorkspaceStore();
  const approvals = store.approvals;
  const decide = store.decideApproval;
  const task = store.tasks[taskId];
  const [comment, setComment] = useState("");
  const taskApprovals = Object.values(approvals)
    .filter((a) => a.taskId === taskId)
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));

  if (taskApprovals.length === 0) {
    return <div className="py-10 text-center text-xs text-muted-foreground">暂无审批请求</div>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-2 text-[11px] leading-relaxed text-warning">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" />
        批准的是本次精确请求（动作 / 资源 / 参数），不是给 Agent 永久放行。
      </div>
      {taskApprovals.map((a) => (
        <div key={a.id} className="rounded-xl border border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
              {toolDisplayName(a.toolName)}
            </span>
            <Badge tone={a.status === "PENDING" ? "warning" : a.status === "APPROVED" ? "success" : "danger"}>
              {approvalStatusLabel(a.status)}
            </Badge>
          </div>
          <div className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            <div className="truncate">资源：{a.resource}</div>
            <div className="break-words font-mono">参数：{a.argsDigest}</div>
            <div>
              策略：{a.policyName} · 风险等级：{riskLevelLabel(a.riskLevel)}
            </div>
            <div>
              运行 #{task?.runs.find((r) => r.id === a.runId)?.index ?? "—"} 的精确请求 · 请求于{" "}
              {formatTime(a.requestedAt)}
            </div>
            {a.status !== "PENDING" ? (
              <div>
                {approvalStatusLabel(a.status)} · {a.decidedBy} · {formatTime(a.decidedAt ?? "")}
                {a.comment ? ` · 备注：${a.comment}` : ""}
              </div>
            ) : null}
          </div>
          {a.status === "PENDING" ? (
            <div className="mt-2.5 border-t border-border pt-2.5">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="备注（可选）…"
                className="focus-ring mb-2 h-7 w-full rounded-lg border border-input bg-card px-2.5 text-xs"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    decide(a.id, "APPROVED", comment || undefined);
                    setComment("");
                  }}
                >
                  <Check size={12} />
                  批准
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    decide(a.id, "REJECTED", comment || undefined);
                    setComment("");
                  }}
                >
                  <X size={12} />
                  拒绝
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function WaitingApprovalBanner({ taskId, onOpenInspector }: { taskId: string; onOpenInspector: () => void }) {
  const approvals = useWorkspaceStore((s) => s.approvals);
  const pending = Object.values(approvals).find((a) => a.taskId === taskId && a.status === "PENDING");
  if (!pending) return null;
  return (
    <div className="mx-auto mb-2 flex w-full max-w-3xl items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
      <AlertTriangle size={14} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{toolDisplayName(pending.toolName)}</span> 等待审批（{pending.resource}）
      </span>
      <button
        onClick={onOpenInspector}
        className="focus-ring shrink-0 rounded-md border border-warning/50 px-2 py-0.5 font-medium hover:bg-warning/20"
      >
        到执行详情处理
      </button>
    </div>
  );
}
