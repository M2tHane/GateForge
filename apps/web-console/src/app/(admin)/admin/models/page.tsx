"use client";

/**
 * Models（DESIGN.md §16）：Model Catalog 骨架列表 + Secret Management 提示卡。
 * Stage 01 只读展示，Provider API Key 永不回显。
 */
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/primitives";
import { AdminCell, AdminRow, AdminTable } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export default function AdminModelsPage() {
  const s = useWorkspaceStore();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Models" description="Model Catalog：员工可用的模型候选（Model Policy）" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <AdminTable columns={["展示名", "Provider", "Model", "Model Policy ID"]}>
            {s.modelCandidates.map((m) => (
              <AdminRow key={m.id}>
                <AdminCell className="font-medium text-foreground">{m.label}</AdminCell>
                <AdminCell>{m.provider}</AdminCell>
                <AdminCell mono>{m.model}</AdminCell>
                <AdminCell mono className="text-muted-foreground">
                  {m.id}
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed">
            <KeyRound size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="text-muted-foreground">
              Provider Credentials 由 Secret Management 管理，响应永不回显明文；凭据状态仅展示{" "}
              <Badge>未配置</Badge> / <Badge tone="success">已配置</Badge>。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
