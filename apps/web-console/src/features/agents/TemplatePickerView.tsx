"use client";

/**
 * Template Picker（DESIGN.md §10）：kind === TEMPLATE 的 Agent 模板，
 * Scope Tab（平台 / 团队）。[使用此模板] → cloneAgentTemplate(publishedVersionId)
 * → Personal Agent Draft → Agent Editor。
 *
 * P7/P8：Clone 是快照复制，记录 sourceTemplateVersionId；模板后续更新不影响
 * 已克隆的 Personal Agent。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/overlay";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { publishedVersionOf } from "@/features/agents/helpers";

type TemplateScope = "WORKSPACE" | "TEAM";

export function TemplatePickerView() {
  const router = useRouter();
  const store = useWorkspaceStore();
  const [scope, setScope] = useState<TemplateScope>("WORKSPACE");

  // Effective Capability mock：团队模板只显示当前用户所属 Team 的模板
  const templates = Object.values(store.agents).filter((agent) => {
    if (agent.kind !== "TEMPLATE" || agent.scope !== scope) return false;
    if (scope === "TEAM") return store.currentUser.teams.includes(agent.teamName ?? "");
    return true;
  });

  function cloneTemplate(publishedVersionId: string) {
    const result = useWorkspaceStore.getState().cloneAgentTemplate(publishedVersionId);
    if (result) router.push(`/agents/${result.agentId}/edit`);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="从模板创建 Agent"
        description="选择一个平台 / 团队模板，Clone 后进入编辑器调整并发布"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <Tabs
            tabs={[
              { id: "WORKSPACE", label: "平台" },
              { id: "TEAM", label: "团队" },
            ]}
            active={scope}
            onChange={(id) => setScope(id as TemplateScope)}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Clone 是快照复制：会复制模板当前已发布版本的配置；模板后续更新不会影响已克隆的
            Personal Agent。
          </p>

          {templates.length === 0 ? (
            <EmptyState title="该范围暂无模板" description="可切换 Scope 查看，或从空白自定义创建。" />
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {templates.map((template) => {
                const published = publishedVersionOf(template);
                return (
                  <Card key={template.id} className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar emoji={template.avatarEmoji} color={template.avatarColor} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {template.name}
                          </span>
                          {published ? <Badge tone="info">{published.version}</Badge> : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {published
                          ? `将克隆 ${published.version} 的快照`
                          : "该模板暂无已发布版本"}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!published}
                        onClick={() => published && cloneTemplate(published.id)}
                      >
                        使用此模板
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
