"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Drawer } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { scopeLabel } from "@/lib/format";
import type { Scope, Skill } from "@/lib/types";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

/**
 * 统一技能选择器（DESIGN.md §8 / §21）—— Conversation「技能」按钮与 Agent Editor
 * 复用同一组件。Scope Tab（平台/团队/我的）+ Category 过滤 + 多选；候选来自
 * Effective Capability（Mock：平台 + 我所属 Team + 我的 Skill）。
 * 日常使用界面不显示版本号；确认时绑定 exact SkillVersion。
 */
export function SkillPickerDrawer({
  open,
  onClose,
  selectedVersionIds,
  onConfirm,
  title = "选择技能",
}: {
  open: boolean;
  onClose: () => void;
  selectedVersionIds: string[];
  onConfirm: (selectedVersionIds: string[]) => void;
  title?: string;
}) {
  const skills = useWorkspaceStore((s) => s.skills);
  const categories = useWorkspaceStore((s) => s.categories);
  const teams = useWorkspaceStore((s) => s.currentUser.teams);

  const [scope, setScope] = useState<Scope>("WORKSPACE");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(selectedVersionIds);

  // Effective Capability mock：Team Skill 只显示当前用户所属 Team
  const visibleSkills = useMemo(() => {
    return Object.values(skills).filter((skill) => {
      if (skill.scope === "WORKSPACE") return true;
      if (skill.scope === "PERSONAL") return true;
      return teams.includes(skill.teamName ?? "");
    });
  }, [skills, teams]);

  const filtered = visibleSkills.filter((skill) => {
    if (skill.scope !== scope) return false;
    if (categoryId !== "all" && skill.categoryId !== categoryId) return false;
    if (query && !skill.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const selectedSkills = selected
    .map((versionId) => Object.values(skills).find((s) => s.currentVersionId === versionId))
    .filter((s): s is Skill => Boolean(s));

  function toggle(skill: Skill) {
    const versionId = skill.currentVersionId;
    setSelected((prev) =>
      prev.includes(versionId) ? prev.filter((id) => id !== versionId) : [...prev, versionId],
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle="绑定 exact SkillVersion；源 Skill 后续更新不会改变本次选择"
      width={640}
    >
      <div className="flex h-full flex-col">
        {/* Scope tabs + search */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(["WORKSPACE", "TEAM", "PERSONAL"] as Scope[]).map((sc) => (
              <button
                key={sc}
                onClick={() => setScope(sc)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  scope === sc ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {scopeLabel(sc)}
              </button>
            ))}
          </div>
          <div className="relative w-56">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索技能"
              className="focus-ring h-8 w-full rounded-lg border border-input bg-card pl-8 pr-3 text-xs"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Category rail */}
          <div className="w-36 shrink-0 overflow-y-auto border-r border-border py-2">
            {[{ id: "all", name: "全部" }, ...categories].map((cat) => (
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
          </div>

          {/* Skill list */}
          <div className="min-w-0 flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                该范围内暂无可选技能
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filtered.map((skill) => {
                  const checked = selected.includes(skill.currentVersionId);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => toggle(skill)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                        checked ? "border-primary/50 bg-accent/40" : "border-border hover:bg-accent/30",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {checked ? <Check size={12} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{skill.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {skill.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer: selected chips + confirm */}
        <div className="border-t border-border px-5 py-3">
          {selectedSkills.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {selectedSkills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                >
                  {skill.name}
                  <button
                    onClick={() => toggle(skill)}
                    className="text-accent-foreground/60 hover:text-foreground"
                    aria-label={`移除 ${skill.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">已选 {selected.length} 个技能</span>
            <button
              onClick={() => onConfirm(selected)}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={13} />
              完成 {selected.length}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
