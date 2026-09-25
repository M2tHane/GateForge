"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, X } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, EmptyState } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/overlay";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { approvalStatusLabel, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApprovalRequest } from "@/lib/types";

/** My Approvals（§15）：聚合与当前用户 Task 相关的待审批。 */
export function MyApprovalsPage() {
  const approvals = useWorkspaceStore((s) => s.approvals);
  const decide = useWorkspaceStore((s) => s.decideApproval);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "ALL">("PENDING");

  const list = useMemo(() => {
    const all = Object.values(approvals).sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
    return statusFilter === "PENDING" ? all.filter((a) => a.status === "PENDING") : all;
  }, [approvals, statusFilter]);

  const selected: ApprovalRequest | undefined = selectedId ? approvals[selectedId] : undefined;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="My Approvals"
        description="与我的 Task 相关的审批请求。批准的永远是本次精确请求，不是给 Agent 永久放行。"
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(["PENDING", "ALL"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  statusFilter === f ? "bg-card text-foreground shadow-xs" : "text-muted-foreground",
                )}
              >
                {f === "PENDING" ? "待审批" : "全部"}
              </button>
            ))}
          </div>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
          {list.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={32} />}
              title="没有待处理的审批"
              description="当 Agent 的高风险动作（如生产分支写入）被 Policy 拦截时，会出现在这里。"
            />
          ) : (
            list.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setSelectedId(a.id);
                  setComment("");
                }}
                className="surface focus-ring flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/25"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-[13px] font-semibold text-foreground">{a.toolName}</span>
                    <Badge tone={a.riskLevel === "HIGH" ? "danger" : a.riskLevel === "MEDIUM" ? "warning" : "neutral"}>
                      {a.riskLevel}
                    </Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {a.agentName} · {a.taskTitle} · {a.resource}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={a.status === "PENDING" ? "warning" : a.status === "APPROVED" ? "success" : "danger"}>
                    {approvalStatusLabel(a.status)}
                  </Badge>
                  <div className="mt-1 text-[11px] text-muted-foreground">{formatTime(a.requestedAt)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={
          <span className="font-mono">{selected?.toolName}</span>
        }
        subtitle={`${selected?.agentName ?? ""} · ${selected?.taskTitle ?? ""}`}
      >
        {selected ? (
          <div className="flex h-full flex-col overflow-y-auto px-5 py-4">
            <div className="space-y-2 rounded-xl border border-border p-3.5 text-xs">
              <Row label="Requested by">{`${selected.agentName} · Run #${selected.runId.slice(-4)}`}</Row>
              <Row label="Action">{selected.action}</Row>
              <Row label="Resource">{selected.resource}</Row>
              <Row label="Arguments digest">
                <span className="font-mono">{selected.argsDigest}</span>
              </Row>
              <Row label="Policy">{selected.policyName}</Row>
              <Row label="Risk">{selected.riskLevel}</Row>
            </div>

            <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
              <ShieldCheck size={13} className="mt-0.5 shrink-0" />
              批准的是本次精确请求（action / resource / arguments）；若任一要素变化，需要重新审批。
            </div>

            {selected.status === "PENDING" ? (
              <div className="mt-4">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="备注（可选）…"
                  className="focus-ring mb-2.5 h-9 w-full rounded-lg border border-input bg-card px-3 text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      decide(selected.id, "APPROVED", comment || undefined);
                      setComment("");
                    }}
                  >
                    <Check size={14} />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      decide(selected.id, "REJECTED", comment || undefined);
                      setComment("");
                    }}
                  >
                    <X size={14} />
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-border px-3.5 py-3 text-xs text-muted-foreground">
                {approvalStatusLabel(selected.status)} · {selected.decidedBy} · {formatTime(selected.decidedAt ?? "")}
                {selected.comment ? ` · 备注：${selected.comment}` : ""}
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-foreground">{children}</span>
    </div>
  );
}
