"use client";

/**
 * Agents 页面（DESIGN.md §9 / §21）：Personal Agent Card Grid。
 *
 * Card 展示 Avatar / Name / Created At / Published Version，右上角 Switch 控制启用状态。
 * DISABLED 时 [启动任务] 保持灰色不可点击；ENABLED 时可直接启动任务。
 *
 * 渲染契约：mock store 的嵌套变更原地发生，这里按 store 约定整店订阅，
 * 不做依赖对象引用的 memo。
 */
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useWorkspaceNav } from "@/components/shell/nav";
import { Avatar, Badge, Button, Card, EmptyState, Switch } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { publishedVersionOf } from "@/features/agents/helpers";

export function AgentsPageView() {
  const router = useRouter();
  const nav = useWorkspaceNav();
  const store = useWorkspaceStore();

  const personalAgents = Object.values(store.agents)
    .filter((a) => a.kind === "PERSONAL")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Agents"
        description="Personal Agents —— 你的 AI 工作助手；点击卡片查看详情"
        actions={
          <Button variant="primary" onClick={() => router.push("/agents/new")}>
            <Plus size={14} />
            创建 Agent
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
        {personalAgents.length === 0 ? (
          <EmptyState
            title="还没有 Personal Agent"
            description="从平台 / 团队模板克隆，或从空白自定义创建一个 Agent。"
            action={
              <Button variant="primary" onClick={() => router.push("/agents/new")}>
                <Plus size={14} />
                创建 Agent
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {personalAgents.map((agent) => {
              const published = publishedVersionOf(agent);
              const enabled = agent.status === "ENABLED";
              return (
                <Card
                  key={agent.id}
                  interactive
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  className="flex min-h-44 flex-col gap-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} size="lg" />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="truncate pr-12 text-[15px] font-semibold text-foreground">
                        {agent.name}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>创建：{formatDate(agent.createdAt)}</span>
                        <span className="text-border">·</span>
                        <span>版本：{published?.version ?? "未发布"}</span>
                      </div>
                      {agent.draftVersionId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/agents/${agent.id}/edit`);
                          }}
                          className="focus-ring mt-2 rounded-full"
                          title="进入编辑器继续该草稿"
                        >
                          <Badge tone="warning">草稿待发布</Badge>
                        </button>
                      ) : null}
                    </div>
                    <Switch
                      checked={enabled}
                      label={enabled ? `停用 ${agent.name}` : `启用 ${agent.name}`}
                      onCheckedChange={(checked) =>
                        useWorkspaceStore
                          .getState()
                          .setAgentStatus(agent.id, checked ? "ENABLED" : "DISABLED")
                      }
                    />
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <span className="text-xs text-muted-foreground">
                      {enabled ? "已启用" : "已停用"}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!enabled}
                      className="disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (enabled) nav.newTask(agent.id);
                      }}
                    >
                      启动任务
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
