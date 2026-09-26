"use client";

/**
 * Agents 页面（DESIGN.md §9 / §21）：Personal Agent Card Grid。
 *
 * Card 至少展示 Avatar / Name / Created At / 状态（可用 · 已停用）/ 主操作。
 * 左侧固定为 Agent 生命周期动作：DISABLED → [启动]，ENABLED → [停用]；
 * 右侧 [启动任务] 仅在 ENABLED 时出现（预选该 Agent 的 New Task Composer）。
 * 不再使用三点菜单承载主要操作。
 *
 * 渲染契约：mock store 的嵌套变更原地发生，这里按 store 约定整店订阅，
 * 不做依赖对象引用的 memo。
 */
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useWorkspaceNav } from "@/components/shell/nav";
import { Avatar, Badge, Button, Card, EmptyState, StatusDot } from "@/components/ui/primitives";
import { agentStatusLabel, formatDate } from "@/lib/format";
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
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} size="lg" />
                    <div className="flex flex-col items-end gap-1">
                      {published ? <Badge tone="info">{published.version}</Badge> : null}
                      {agent.draftVersionId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/agents/${agent.id}/edit`);
                          }}
                          className="focus-ring rounded-full"
                          title="进入编辑器继续该草稿"
                        >
                          <Badge tone="warning">草稿待发布</Badge>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{agent.name}</div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      创建：{formatDate(agent.createdAt)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <StatusDot tone={enabled ? "success" : "neutral"} />
                      {agentStatusLabel(agent.status)}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    {/* 左侧永远是生命周期动作：DISABLED → 启动，ENABLED → 停用 */}
                    {enabled ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          useWorkspaceStore.getState().setAgentStatus(agent.id, "DISABLED");
                        }}
                      >
                        停用
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          useWorkspaceStore.getState().setAgentStatus(agent.id, "ENABLED");
                        }}
                      >
                        启动
                      </Button>
                    )}
                    {/* 右侧：仅 ENABLED 时出现「启动任务」（进入 New Task Composer 并预选） */}
                    {enabled ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          nav.newTask(agent.id);
                        }}
                      >
                        启动任务
                      </Button>
                    ) : null}
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
