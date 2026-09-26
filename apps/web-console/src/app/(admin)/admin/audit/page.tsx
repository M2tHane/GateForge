"use client";

/**
 * Audit（DESIGN.md §16）：审计日志骨架表格，点击行打开 metadata Drawer。
 */
import { useState } from "react";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/overlay";
import { AdminCell, AdminRow, AdminTable, DetailRow } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { formatDate, formatTime } from "@/lib/format";

export default function AdminAuditPage() {
  const s = useWorkspaceStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? s.auditEntries.find((e) => e.id === selectedId) : undefined;

  const entries = [...s.auditEntries].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Audit" description="平台审计日志（只读）" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-5xl">
          {entries.length === 0 ? (
            <EmptyState icon={<ScrollText size={32} />} title="暂无审计记录" />
          ) : (
            <AdminTable
              columns={["Time", "Actor", "Operation", "Resource", "Result", "Correlation ID"]}
            >
              {entries.map((entry) => (
                <AdminRow key={entry.id} onClick={() => setSelectedId(entry.id)}>
                  <AdminCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(entry.at)} {formatTime(entry.at)}
                  </AdminCell>
                  <AdminCell className="font-medium text-foreground">{entry.actor}</AdminCell>
                  <AdminCell mono>{entry.operation}</AdminCell>
                  <AdminCell className="max-w-56 truncate">{entry.resource}</AdminCell>
                  <AdminCell>
                    {entry.result === "OK" ? (
                      <Badge tone="success">OK</Badge>
                    ) : (
                      <Badge tone="danger">DENIED</Badge>
                    )}
                  </AdminCell>
                  <AdminCell mono className="text-muted-foreground">
                    {entry.correlationId}
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
        title={<span className="font-mono">{selected?.operation}</span>}
        subtitle={selected ? `${selected.actor} · ${formatDate(selected.at)} ${formatTime(selected.at)}` : undefined}
      >
        {selected ? (
          <div className="h-full overflow-y-auto px-5 py-4">
            <div className="space-y-2.5 rounded-xl border border-border p-3.5">
              <DetailRow label="Time">
                {`${formatDate(selected.at)} ${formatTime(selected.at)}`}
              </DetailRow>
              <DetailRow label="Actor">{selected.actor}</DetailRow>
              <DetailRow label="Operation">
                <span className="font-mono">{selected.operation}</span>
              </DetailRow>
              <DetailRow label="Resource">
                <span className="font-mono">{selected.resource}</span>
              </DetailRow>
              <DetailRow label="Result">
                {selected.result === "OK" ? (
                  <Badge tone="success">OK</Badge>
                ) : (
                  <Badge tone="danger">DENIED</Badge>
                )}
              </DetailRow>
              <DetailRow label="Correlation ID">
                <span className="font-mono">{selected.correlationId}</span>
              </DetailRow>
              <DetailRow label="Entry ID">
                <span className="font-mono">{selected.id}</span>
              </DetailRow>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
