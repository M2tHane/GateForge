"use client";

/**
 * Skill Categories（DESIGN.md §16）：Category 骨架列表。
 * 关联 Skill 数量从 store 的 skills 实时统计。
 */
import { PageHeader } from "@/components/shell/PageHeader";
import { AdminCell, AdminRow, AdminTable } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export default function AdminSkillCategoriesPage() {
  const s = useWorkspaceStore();
  const categories = [...s.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const skillCountOf = (categoryId: string) =>
    Object.values(s.skills).filter((skill) => skill.categoryId === categoryId).length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Skill Categories" description="Skill 分类管理（普通用户只读）" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <AdminTable columns={["Category", "排序", "关联 Skill 数量"]}>
            {categories.map((cat) => (
              <AdminRow key={cat.id}>
                <AdminCell className="font-medium text-foreground">{cat.name}</AdminCell>
                <AdminCell>{cat.sortOrder}</AdminCell>
                <AdminCell>{skillCountOf(cat.id)}</AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        </div>
      </div>
    </div>
  );
}
