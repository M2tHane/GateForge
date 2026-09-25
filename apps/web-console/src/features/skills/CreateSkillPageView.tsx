"use client";

/**
 * 创建 Skill（DESIGN.md §13 右上 [+ 创建 Skill]）：两张选择卡——从模板创建
 * （克隆可见的平台 / 团队 Skill 为快照副本）与从空白创建（短表单，普通员工
 * Scope 固定 PERSONAL）。短表单页面内呈现（§17：复杂配置不塞 Modal）。
 *
 * 渲染契约：mock 嵌套状态原地可变，按 store 约定使用整状态订阅。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { scopeLabel } from "@/lib/format";
import { handoffScope } from "@/features/skills/tab-handoff";
import type { Skill } from "@/lib/types";

export function CreateSkillPageView() {
  const { skills, categories, currentUser, cloneSkill, createPersonalSkill } = useWorkspaceStore();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "cat_dev");

  // 模板候选：可见的平台 / 团队 Skill（同 Skills 页可见性规则；增长团队不可见）
  const templates = Object.values(skills).filter((skill) => {
    if (skill.scope === "WORKSPACE") return true;
    return skill.scope === "TEAM" && currentUser.teams.includes(skill.teamName ?? "");
  });

  function backToSkills() {
    handoffScope("PERSONAL");
    router.push("/skills");
  }

  function handleClone(skill: Skill) {
    cloneSkill(skill.currentVersionId); // Snapshot Copy：克隆当前 Published Version
    backToSkills();
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createPersonalSkill({ name: trimmed, description: description.trim(), categoryId });
    backToSkills();
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="创建 Skill"
        description="从模板创建或从空白创建 · 普通员工 Scope 固定为「我的」"
        actions={
          <Button variant="ghost" onClick={() => router.push("/skills")}>
            返回 Skills
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-6xl items-start gap-4 p-6 lg:grid-cols-2">
          {/* 从模板创建 */}
          <section className="surface flex flex-col rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground">从模板创建</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              克隆平台 / 团队 Skill 为「我的」Skill——快照副本：记录来源版本，源 Skill 后续更新不影响。
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {templates.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">暂无可见模板</div>
              ) : (
                templates.map((skill) => {
                  const version = skill.versions.find((v) => v.id === skill.currentVersionId);
                  const categoryName =
                    categories.find((c) => c.id === skill.categoryId)?.name ?? "—";
                  return (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {skill.name}
                          </span>
                          <Badge tone="neutral">{version?.version ?? "—"}</Badge>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {categoryName} · {scopeLabel(skill.scope)}
                          {skill.teamName ? ` · ${skill.teamName}` : ""}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleClone(skill)}>
                        克隆
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 从空白创建 */}
          <section className="surface flex flex-col rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground">从空白创建</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              创建「我的 Skill」：Scope 固定为「我的」，普通员工不能创建平台 / 团队 Skill。
            </p>
            <div className="mt-4 flex flex-1 flex-col gap-4">
              <div>
                <FieldLabel>名称</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：接口联调 checklist"
                />
              </div>
              <div>
                <FieldLabel hint="可选">描述</FieldLabel>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="这个 Skill 帮助 Agent 做什么"
                />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-[11px] text-muted-foreground">
                  创建后版本为 v1.0.0，可在 Skills 页启用 / 绑定
                </span>
                <Button variant="primary" disabled={!name.trim()} onClick={handleCreate}>
                  创建 Skill
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
