"use client";

/**
 * Skills 页面（DESIGN.md §13）：Scope Tabs（平台 / 团队 / 我的）+ Category
 * 过滤 + Skill Cards。员工可 Enable / Disable 可见 Skill；Personal Skill 的导入
 * 统一放在创建流程中，按 Snapshot Copy 记录 sourceSkillVersionId（P7/P9）。
 *
 * 渲染契约：mock 嵌套状态原地可变（setSkillEnabled / cloneSkill 不更换
 * skills record 引用），按 store 约定使用整状态订阅，派生列表不做引用 memo。
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, Card, EmptyState, Switch, type BadgeTone } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/overlay";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { scopeLabel } from "@/lib/format";
import { clearHandoffScope, peekHandoffScope } from "@/features/skills/tab-handoff";
import type { Scope, Skill } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_ALL = "all";

export function SkillsPageView() {
  const { skills, categories, currentUser, viewAsAdmin, setSkillEnabled } = useWorkspaceStore();
  const router = useRouter();

  const [scope, setScope] = useState<Scope>(() => peekHandoffScope() ?? "WORKSPACE");
  const [categoryId, setCategoryId] = useState<string>(CATEGORY_ALL);

  useEffect(() => {
    clearHandoffScope();
  }, []);

  // Effective Capability mock：TEAM Skill 仅当前用户所属 Team 可见，
  // 不可见团队（如增长团队）直接过滤，不提示。
  const scoped = Object.values(skills).filter((skill) => {
    if (skill.scope !== scope) return false;
    if (skill.scope === "TEAM" && !currentUser.teams.includes(skill.teamName ?? "")) return false;
    return true;
  });
  const filtered =
    categoryId === CATEGORY_ALL ? scoped : scoped.filter((skill) => skill.categoryId === categoryId);

  function categoryNameOf(skill: Skill): string {
    return categories.find((c) => c.id === skill.categoryId)?.name ?? "—";
  }

  function sourceNameOf(skill: Skill): string | undefined {
    if (!skill.sourceSkillVersionId) return undefined;
    for (const s of Object.values(skills)) {
      if (s.versions.some((v) => v.id === skill.sourceSkillVersionId)) return s.name;
    }
    return undefined;
  }

  const emptyCopy: Record<Scope, { title: string; description?: string }> = {
    WORKSPACE: { title: "暂无平台 Skill" },
    TEAM: { title: "暂无团队 Skill", description: "团队 Skill 仅对你所属的团队可见" },
    PERSONAL: {
      title: "暂无我的 Skill",
      description: "通过右上角「创建 Skill」从空白创建，或导入平台 / 团队 / 自己的已有 Skill",
    },
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Skills"
        description="平台 / 团队 / 我的 Skill，可独立启用或停用"
        actions={
          <Button variant="primary" onClick={() => router.push("/skills/new")}>
            <Plus size={14} />
            创建 Skill
          </Button>
        }
      />

      <Tabs
        className="px-7"
        tabs={(["WORKSPACE", "TEAM", "PERSONAL"] as Scope[]).map((sc) => ({
          id: sc,
          label: scopeLabel(sc),
        }))}
        active={scope}
        onChange={(id) => setScope(id as Scope)}
      />

      {viewAsAdmin && scope === "WORKSPACE" ? (
        <div className="flex items-center gap-2 border-b border-border px-7 py-2">
          <Badge tone="info">Workspace Admin：可创建 / 发布 / 停用平台 Skill</Badge>
          <span className="text-xs text-muted-foreground">
            Stage 01 骨架，完整管理入口见 Administration
          </span>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Category 导航 */}
        <aside className="w-36 shrink-0 overflow-y-auto border-r border-border py-3">
          {[{ id: CATEGORY_ALL, name: "全部" }, ...categories].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                "block w-full px-4 py-1.5 text-left text-[13px] transition-colors",
                categoryId === cat.id
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {cat.name}
            </button>
          ))}
        </aside>

        {/* Skill Cards */}
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <EmptyState title={emptyCopy[scope].title} description={emptyCopy[scope].description} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  categoryName={categoryNameOf(skill)}
                  sourceName={sourceNameOf(skill)}
                  onToggleEnabled={(checked) => setSkillEnabled(skill.id, checked)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  categoryName,
  sourceName,
  onToggleEnabled,
}: {
  skill: Skill;
  categoryName: string;
  sourceName?: string;
  onToggleEnabled: (checked: boolean) => void;
}) {
  const currentVersion = skill.versions.find((v) => v.id === skill.currentVersionId);
  const categoryTone: Record<string, BadgeTone> = {
    cat_dev: "info",
    cat_design: "accent",
    cat_test: "warning",
    cat_data: "success",
    cat_ops: "danger",
  };

  return (
    <Card className="flex min-h-40 h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{skill.name}</span>
            <Badge tone={categoryTone[skill.categoryId] ?? "neutral"}>{categoryName}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {scopeLabel(skill.scope)}
            {skill.teamName ? ` · ${skill.teamName}` : ""}
            {` · ${currentVersion?.version ?? "—"}`}
          </div>
        </div>
        <Switch
          checked={skill.enabledByMe}
          label={skill.enabledByMe ? `停用 ${skill.name}` : `启用 ${skill.name}`}
          onCheckedChange={onToggleEnabled}
        />
      </div>

      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{skill.description}</p>

      {sourceName ? (
        <div className="text-[11px] text-muted-foreground">
          导入自 {sourceName} · 快照副本，源 Skill 更新不影响
        </div>
      ) : null}

      <div className="mt-auto border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
        {skill.enabledByMe ? "已启用，可被选择使用" : "已停用，不会出现在可用 Skill 中"}
      </div>
    </Card>
  );
}
