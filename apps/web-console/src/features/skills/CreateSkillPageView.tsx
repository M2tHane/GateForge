"use client";

/**
 * 创建 Skill：可从平台 / 团队 / 自己的已有 Skill 导入为快照副本，自动填充
 * 可编辑字段；也可从空白开始。普通员工创建后的 Scope 固定 PERSONAL。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, FieldLabel, Input, Textarea } from "@/components/ui/primitives";
import { SelectMenu, Tabs } from "@/components/ui/overlay";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { scopeLabel } from "@/lib/format";
import { handoffScope } from "@/features/skills/tab-handoff";
import type { Scope, Skill } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CreateSkillPageView() {
  const { skills, categories, currentUser, createPersonalSkill } = useWorkspaceStore();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "cat_dev");
  const [importScope, setImportScope] = useState<Scope>("WORKSPACE");
  const [sourceSkillVersionId, setSourceSkillVersionId] = useState<string | undefined>();

  const importCandidates = Object.values(skills).filter((skill) => {
    if (skill.scope !== importScope) return false;
    if (skill.scope === "TEAM" && !currentUser.teams.includes(skill.teamName ?? "")) return false;
    return true;
  });

  const selectedSource = sourceSkillVersionId
    ? Object.values(skills).find((skill) => skill.currentVersionId === sourceSkillVersionId)
    : undefined;

  function backToSkills() {
    handoffScope("PERSONAL");
    router.push("/skills");
  }

  function importFrom(skill: Skill) {
    setSourceSkillVersionId(skill.currentVersionId);
    setName(skill.name);
    setDescription(skill.description);
    setCategoryId(skill.categoryId);
  }

  function startBlank() {
    setSourceSkillVersionId(undefined);
    setName("");
    setDescription("");
    setCategoryId(categories[0]?.id ?? "cat_dev");
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createPersonalSkill({
      name: trimmed,
      description: description.trim(),
      categoryId,
      sourceSkillVersionId,
    });
    backToSkills();
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="创建 Skill"
        description="导入已有 Skill 自动填充后再编辑，或直接从空白创建"
        actions={
          <Button variant="ghost" onClick={() => router.push("/skills")}>
            返回 Skills
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
          <section className="surface overflow-hidden rounded-xl">
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">导入已有 Skill</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  从平台、团队或自己的 Skill 复制当前发布版本，随后可自由修改；源 Skill 更新不会影响这里。
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={startBlank}>
                从空白开始
              </Button>
            </div>

            <Tabs
              className="mt-3 px-5"
              tabs={(["WORKSPACE", "TEAM", "PERSONAL"] as Scope[]).map((scope) => ({
                id: scope,
                label: scopeLabel(scope),
              }))}
              active={importScope}
              onChange={(id) => setImportScope(id as Scope)}
            />

            <div className="grid gap-2 p-5 pt-4 md:grid-cols-2">
              {importCandidates.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                  当前范围暂无可导入的 Skill
                </div>
              ) : (
                importCandidates.map((skill) => {
                  const version = skill.versions.find((item) => item.id === skill.currentVersionId);
                  const selected = sourceSkillVersionId === skill.currentVersionId;
                  const categoryName =
                    categories.find((category) => category.id === skill.categoryId)?.name ?? "—";
                  return (
                    <button
                      type="button"
                      key={skill.id}
                      onClick={() => importFrom(skill)}
                      className={cn(
                        "focus-ring rounded-xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/35",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] font-medium text-foreground">
                          {skill.name}
                        </span>
                        <Badge tone={selected ? "info" : "neutral"}>
                          {selected ? "已导入" : version?.version ?? "—"}
                        </Badge>
                      </div>
                      <div className="mt-1.5 text-[11px] text-muted-foreground">
                        {categoryName} · {scopeLabel(skill.scope)}
                        {skill.teamName ? ` · ${skill.teamName}` : ""}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="surface flex flex-col rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">编辑并发布</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  创建后会成为「我的 Skill」，初始版本为 v1.0.0。
                </p>
              </div>
              {selectedSource ? (
                <Badge tone="info">来源：{selectedSource.name}</Badge>
              ) : (
                <Badge tone="neutral">从空白创建</Badge>
              )}
            </div>
            <div className="mt-5 flex flex-1 flex-col gap-4">
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
                <FieldLabel>分类</FieldLabel>
                <SelectMenu
                  value={categoryId}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  onChange={setCategoryId}
                />
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-[11px] text-muted-foreground">
                  发布后可在 Skills 页随时启用或停用
                </span>
                <Button variant="primary" disabled={!name.trim()} onClick={handleCreate}>
                  创建并发布
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
