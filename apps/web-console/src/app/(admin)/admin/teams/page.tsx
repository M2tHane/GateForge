"use client";

/**
 * 团队（DESIGN.md §16）：Team 骨架列表（名称、描述、成员数、团队管理员）。
 */
import { PageHeader } from "@/components/shell/PageHeader";
import { AdminCell, AdminRow, AdminTable } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export default function AdminTeamsPage() {
  const s = useWorkspaceStore();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="团队" description="团队列表与成员管理入口（Stage 01 骨架）" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <AdminTable columns={["名称", "描述", "成员数", "团队管理员"]}>
            {s.teams.map((team) => (
              <AdminRow key={team.id}>
                <AdminCell className="font-medium text-foreground">{team.name}</AdminCell>
                <AdminCell className="text-muted-foreground">{team.description}</AdminCell>
                <AdminCell>{team.memberCount}</AdminCell>
                <AdminCell>{team.teamAdmin}</AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        </div>
      </div>
    </div>
  );
}
