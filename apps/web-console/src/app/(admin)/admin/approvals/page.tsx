"use client";

/**
 * Approvals（DESIGN.md §16）：治理视角的审批列表骨架（区别于 §15 My Approvals）。
 * PENDING 行可打开 Drawer 并 Reject / Approve（decideApproval）。
 * 必须明确：批准的是本次精确请求，不是给 Agent 永久放行（G6）。
 */
import { useState } from "react";
import { Check, Eye, ShieldCheck, X } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, EmptyState } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/overlay";
import { AdminCell, AdminRow, AdminTable, DetailRow, riskTone } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { approvalStatusLabel, riskLevelLabel, formatDate, formatTime } from "@/lib/format";

export default function AdminApprovalsPage() {
  const s = useWorkspaceStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const approvals = Object.values(s.approvals).sort((a, b) =>
    a.requestedAt < b.requestedAt ? 1 : -1,
  );
  const selected = selectedId ? s.approvals[selectedId] : undefined;

  function runLabelOf(taskId: string, runId: string): string {
    const run = s.tasks[taskId]?.runs.find((r) => r.id === runId);
    return run ? `运行 #${run.index}` : runId;
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="审批"
        description="全部审批请求（治理视角）。批准的永远是本次精确请求，不是给 Agent 永久放行。"
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-5xl">
          {approvals.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={32} />}
              title="暂无审批请求"
              description="当 Agent 的动作被策略判定为需要审批时，会出现在这里。"
            />
          ) : (
            <AdminTable
              columns={["Agent", "任务", "工具", "风险等级", "状态", "请求时间", ""]}
            >
              {approvals.map((apr) => (
                <AdminRow
                  key={apr.id}
                  onClick={apr.status === "PENDING" ? () => setSelectedId(apr.id) : undefined}
                >
                  <AdminCell className="font-medium text-foreground">{apr.agentName}</AdminCell>
                  <AdminCell className="max-w-40 truncate text-muted-foreground">
                    {apr.taskTitle}
                  </AdminCell>
                  <AdminCell mono>{apr.toolName}</AdminCell>
                  <AdminCell>
                    <Badge tone={riskTone(apr.riskLevel)}>{riskLevelLabel(apr.riskLevel)}</Badge>
                  </AdminCell>
                  <AdminCell>
                    <Badge
                      tone={
                        apr.status === "PENDING"
                          ? "warning"
                          : apr.status === "APPROVED"
                            ? "success"
                            : "danger"
                      }
                    >
                      {approvalStatusLabel(apr.status)}
                    </Badge>
                  </AdminCell>
                  <AdminCell className="text-muted-foreground">
                    {formatDate(apr.requestedAt)} {formatTime(apr.requestedAt)}
                  </AdminCell>
                  <AdminCell>
                    {apr.status === "PENDING" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(apr.id);
                        }}
                      >
                        <Eye size={13} />
                        查看
                      </Button>
                    ) : null}
                  </AdminCell>
                </AdminRow>
              ))}
            </AdminTable>
          )}
        </div>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={<span className="font-mono">{selected?.toolName}</span>}
        subtitle={selected ? `${selected.agentName} · ${selected.taskTitle}` : undefined}
      >
        {selected ? (
          <div className="flex h-full flex-col overflow-y-auto px-5 py-4">
            <div className="space-y-2.5 rounded-xl border border-border p-3.5">
              <DetailRow label="请求方">
                {`${selected.agentName} · ${selected.taskTitle} · ${runLabelOf(selected.taskId, selected.runId)}`}
              </DetailRow>
              <DetailRow label="动作">
                <span className="font-mono">{selected.toolName}</span>
                <span className="ml-2 text-muted-foreground">{selected.action}</span>
              </DetailRow>
              <DetailRow label="资源">
                <span className="font-mono">{selected.resource}</span>
              </DetailRow>
              <DetailRow label="参数摘要">
                <span className="font-mono">{selected.argsDigest}</span>
              </DetailRow>
              <DetailRow label="策略">{selected.policyName}</DetailRow>
              <DetailRow label="风险等级">
                <Badge tone={riskTone(selected.riskLevel)}>{riskLevelLabel(selected.riskLevel)}</Badge>
              </DetailRow>
              <DetailRow label="过期时间">
                {`${formatDate(selected.expiresAt)} ${formatTime(selected.expiresAt)}`}
              </DetailRow>
            </div>

            <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
              <ShieldCheck size={13} className="mt-0.5 shrink-0" />
              批准的是本次精确请求，不是给 Agent 永久放行。
            </div>

            {selected.status === "PENDING" ? (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    s.decideApproval(selected.id, "REJECTED");
                    setSelectedId(null);
                  }}
                >
                  <X size={14} />
                  拒绝
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    s.decideApproval(selected.id, "APPROVED");
                    setSelectedId(null);
                  }}
                >
                  <Check size={14} />
                  批准
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-border px-3.5 py-3 text-xs text-muted-foreground">
                {approvalStatusLabel(selected.status)}
                {selected.decidedBy ? ` · ${selected.decidedBy}` : ""}
                {selected.decidedAt
                  ? ` · ${formatDate(selected.decidedAt)} ${formatTime(selected.decidedAt)}`
                  : ""}
                {selected.comment ? ` · 备注：${selected.comment}` : ""}
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
