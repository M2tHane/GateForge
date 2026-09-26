"use client";

/**
 * Policies（DESIGN.md §16）：结构化规则列表骨架 + 每条规则下方的只读
 * WHEN / THEN 文本预览（等宽字体块）。Stage 01 不做 Rule Builder 编辑器。
 */
import { Fragment } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/primitives";
import { AdminCell, AdminRow, AdminTable, effectTone } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export default function AdminPoliciesPage() {
  const s = useWorkspaceStore();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Policies" description="Tool Policy 规则列表（只读预览，不含编辑器）" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <AdminTable columns={["Name", "Subject", "Action", "Tool", "Effect"]}>
            {s.policies.map((rule) => (
              <Fragment key={rule.id}>
                <AdminRow>
                  <AdminCell className="font-medium text-foreground">
                    <span className="flex items-center gap-2">
                      {rule.name}
                      <Badge tone={rule.enabled ? "success" : "neutral"}>
                        {rule.enabled ? "已启用" : "已停用"}
                      </Badge>
                    </span>
                  </AdminCell>
                  <AdminCell mono>{rule.subject}</AdminCell>
                  <AdminCell mono>{rule.action}</AdminCell>
                  <AdminCell mono>{rule.tool}</AdminCell>
                  <AdminCell>
                    <Badge tone={effectTone(rule.effect)}>{rule.effect}</Badge>
                  </AdminCell>
                </AdminRow>
                <AdminRow>
                  <td colSpan={5} className="bg-muted/20 px-4 py-3">
                    <pre className="font-mono text-[11px] leading-5 text-muted-foreground">
                      {`WHEN Subject = ${rule.subject}
AND  Action = ${rule.action}
AND  Tool = ${rule.tool}
THEN ${rule.effect}`}
                    </pre>
                  </td>
                </AdminRow>
              </Fragment>
            ))}
          </AdminTable>
        </div>
      </div>
    </div>
  );
}
