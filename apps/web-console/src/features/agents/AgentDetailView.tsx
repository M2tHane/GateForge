"use client";

/**
 * Agent Detail（DESIGN.md §12）：概览 / 版本 / Skills / Tools / 历史任务 / 设置。
 *
 * - Skills / Tools 展示当前 Published Version 冻结绑定的 exact SkillVersion /
 *   ToolVersion（发布后不可变）。
 * - [创建新版本]：store.createDraftFromPublished —— 在同一 Agent 上以当前
 *   published manifest 快照创建新 DRAFT，然后进入编辑器（§12 版本时间线）。
 * - 历史任务 = tasks 中 agentId 匹配的 Task；点击经 nav.openTask 打开 Task Tab。
 */
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useWorkspaceNav } from "@/components/shell/nav";
import { Tabs } from "@/components/ui/overlay";
import { Avatar, Badge, Button, EmptyState } from "@/components/ui/primitives";
import { agentStatusLabel, formatDate, versionStatusLabel } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import {
  modelLabel,
  providerLabel,
  publishedVersionOf,
  riskLabel,
  riskTone,
  skillByVersionId,
  templateNameFor,
  toolByVersionId,
  versionStatusTone,
} from "@/features/agents/helpers";
import type { Task } from "@/lib/types";

type DetailTab = "overview" | "versions" | "skills" | "tools" | "tasks" | "settings";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "概览" },
  { id: "versions", label: "版本" },
  { id: "skills", label: "技能" },
  { id: "tools", label: "工具" },
  { id: "tasks", label: "历史任务" },
  { id: "settings", label: "设置" },
];

function taskStatusLabel(status: Task["status"]): string {
  return status === "ACTIVE" ? "进行中" : "已归档";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5">
      <span className="w-28 shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-foreground">{children}</span>
    </div>
  );
}

export function AgentDetailView() {
  const router = useRouter();
  const nav = useWorkspaceNav();
  const params = useParams<{ id: string }>();
  const agentId = params.id;
  const store = useWorkspaceStore();
  const agent = store.agents[agentId];
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  if (!agent) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Agent 详情" />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            title="Agent 不存在"
            description="该 Agent 可能已被放弃或不存在。"
            action={<Button onClick={() => router.push("/agents")}>返回 Agents</Button>}
          />
        </div>
      </div>
    );
  }

  const published = publishedVersionOf(agent);
  const hasDraft = agent.draftVersionId !== null;
  const launchable = agent.status === "ENABLED" && Boolean(published);

  /** 在同一 Agent 上以 published manifest 快照创建新 DRAFT（§12 版本时间线）。 */
  function createNewVersion() {
    if (!published) return;
    const draftId = useWorkspaceStore.getState().createDraftFromPublished(agent.id);
    if (!draftId) return;
    router.push(`/agents/${agent.id}/edit`);
  }

  const agentTasks = Object.values(store.tasks)
    .filter((t) => t.agentId === agent.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const sourceTemplateName = agent.sourceTemplateVersionId
    ? templateNameFor(store.agents, agent.sourceTemplateVersionId)
    : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Header：Avatar + 名称 + 版本 / 状态徽章 + 主操作 */}
      <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-7 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold text-foreground">{agent.name}</h1>
              {published ? <Badge tone="info">{published.version}</Badge> : null}
              {hasDraft ? <Badge tone="warning">草稿</Badge> : null}
              <Badge tone={agent.status === "ENABLED" ? "success" : "neutral"}>
                {agentStatusLabel(agent.status)}
              </Badge>
            </div>
            {agent.description ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{agent.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="primary"
            disabled={!launchable}
            title={launchable ? undefined : "Agent 需为可用状态且有已发布版本才能启动任务"}
            onClick={() => nav.newTask(agent.id)}
          >
            启动任务
          </Button>
          {hasDraft ? (
            <Button onClick={() => router.push(`/agents/${agent.id}/edit`)}>继续编辑草稿</Button>
          ) : (
            <Button onClick={createNewVersion} disabled={!published}>
              创建新版本
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-1">
          <Tabs tabs={DETAIL_TABS} active={activeTab} onChange={(id) => setActiveTab(id as DetailTab)} />

          {activeTab === "overview" ? (
            <div className="surface mt-5 divide-y divide-border px-4">
              <Row label="状态">
                <Badge tone={agent.status === "ENABLED" ? "success" : "neutral"}>
                  {agentStatusLabel(agent.status)}
                </Badge>
              </Row>
              <Row label="Engine">pi（平台提供）</Row>
              <Row label="Model">
                {published ? (
                  modelLabel(store.modelCandidates, published.manifest.modelPolicyId)
                ) : (
                  <span className="text-muted-foreground">尚未发布版本</span>
                )}
              </Row>
              <Row label="已发布版本">
                {published ? <Badge tone="info">{published.version}</Badge> : "—"}
                {hasDraft ? <Badge tone="warning" className="ml-2">有草稿待发布</Badge> : null}
              </Row>
              <Row label="Skills">
                {published && published.manifest.skills.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {published.manifest.skills.map((entry) => {
                      const resolved = skillByVersionId(store.skills, entry.skillVersionId);
                      return (
                        <span
                          key={entry.skillVersionId}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                        >
                          {entry.name}
                          <Badge tone="neutral">{resolved?.version.version ?? "—"}</Badge>
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{published ? "未绑定" : "—"}</span>
                )}
              </Row>
              <Row label="Tools">
                {published && published.manifest.tools.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {published.manifest.tools.map((entry) => {
                      const resolved = toolByVersionId(store.tools, entry.toolVersionId);
                      return (
                        <span
                          key={entry.toolVersionId}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                        >
                          {entry.name}
                          <Badge tone={riskTone(resolved?.tool.riskLevel ?? "LOW")}>
                            {riskLabel(resolved?.tool.riskLevel ?? "LOW")}
                          </Badge>
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{published ? "未绑定" : "—"}</span>
                )}
              </Row>
              {sourceTemplateName ? (
                <Row label="来源模板">
                  来自模板：{sourceTemplateName}（快照克隆；模板后续更新不影响该 Agent）
                </Row>
              ) : (
                <Row label="来源">自定义创建</Row>
              )}
            </div>
          ) : null}

          {activeTab === "versions" ? (
            <div className="mt-5 flex flex-col gap-3">
              {[...agent.versions].reverse().map((version) => (
                <div key={version.id} className="surface flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{version.version}</span>
                      <Badge tone={versionStatusTone(version.status)}>
                        {versionStatusLabel(version.status)}
                      </Badge>
                      {version.status === "PUBLISHED" ? <Badge tone="neutral">只读</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      创建于 {formatDate(version.createdAt)}
                      {version.publishedAt ? ` · 发布于 ${formatDate(version.publishedAt)}` : ""}
                    </div>
                  </div>
                  {version.id === agent.publishedVersionId ? (
                    <Badge tone="info">当前发布版本</Badge>
                  ) : null}
                </div>
              ))}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Published Version 只读；修改走 发布版本 → Clone Draft → 编辑 → Publish 新版本。
              </p>
            </div>
          ) : null}

          {activeTab === "skills" ? (
            <div className="mt-5">
              {!published ? (
                <EmptyState title="尚未发布版本" description="发布后此处展示冻结绑定的 exact SkillVersion。" />
              ) : published.manifest.skills.length === 0 ? (
                <EmptyState title="未绑定 Skill" description="该版本未绑定任何 Skill。" />
              ) : (
                <div className="flex flex-col gap-2">
                  {published.manifest.skills.map((entry) => {
                    const resolved = skillByVersionId(store.skills, entry.skillVersionId);
                    return (
                      <div key={entry.skillVersionId} className="surface flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{entry.name}</div>
                          {resolved?.skill.description ? (
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {resolved.skill.description}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone="neutral">{resolved?.version.version ?? "—"}</Badge>
                          <Badge tone="neutral">不可变</Badge>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    以上为当前 Published Version 冻结绑定的 exact SkillVersion；发布后不可变。
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "tools" ? (
            <div className="mt-5">
              {!published ? (
                <EmptyState title="尚未发布版本" description="发布后此处展示冻结绑定的 exact ToolVersion。" />
              ) : published.manifest.tools.length === 0 ? (
                <EmptyState title="未绑定 Tool" description="该版本未绑定任何 Tool。" />
              ) : (
                <div className="flex flex-col gap-2">
                  {published.manifest.tools.map((entry) => {
                    const resolved = toolByVersionId(store.tools, entry.toolVersionId);
                    const provider = resolved?.tool.provider;
                    const risk = resolved?.tool.riskLevel ?? "LOW";
                    return (
                      <div key={entry.toolVersionId} className="surface flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{entry.name}</div>
                          {resolved?.tool.description ? (
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {resolved.tool.description}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone="neutral">{resolved?.version.version ?? "—"}</Badge>
                          {provider ? <Badge tone="info">{providerLabel(provider)}</Badge> : null}
                          <Badge tone={riskTone(risk)}>风险 {riskLabel(risk)}</Badge>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    以上为当前 Published Version 冻结绑定的 exact ToolVersion；发布后不可变。
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "tasks" ? (
            <div className="mt-5">
              {agentTasks.length === 0 ? (
                <EmptyState
                  title="该 Agent 还没有历史任务"
                  description={launchable ? "点击右上角「启动任务」开始第一个任务。" : undefined}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {agentTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => nav.openTask(task.id)}
                      className="focus-ring surface flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">
                        {task.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={task.status === "ACTIVE" ? "success" : "neutral"}>
                          {taskStatusLabel(task.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(task.updatedAt)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div className="mt-5 flex flex-col gap-4">
              <div className="surface divide-y divide-border px-4">
                <Row label="Name">{agent.name}</Row>
                <Row label="Description">
                  {agent.description || <span className="text-muted-foreground">（未填写）</span>}
                </Row>
                <Row label="Avatar">
                  <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} size="md" />
                </Row>
                <Row label="状态">
                  <Badge tone={agent.status === "ENABLED" ? "success" : "neutral"}>
                    {agentStatusLabel(agent.status)}
                  </Badge>
                </Row>
                <Row label="启停">
                  {agent.status === "ENABLED" ? (
                    <Button
                      size="sm"
                      onClick={() => useWorkspaceStore.getState().setAgentStatus(agent.id, "DISABLED")}
                    >
                      停用
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => useWorkspaceStore.getState().setAgentStatus(agent.id, "ENABLED")}
                    >
                      启动
                    </Button>
                  )}
                </Row>
                <Row label="来源模板">
                  {sourceTemplateName ? (
                    <span>
                      来自模板：{sourceTemplateName}（快照克隆，记录 sourceTemplateVersionId）
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        Clone 是快照复制：模板后续更新不会影响该 Personal Agent。
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">自定义创建（无模板来源）</span>
                  )}
                </Row>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                状态只有 可用 / 已停用（ENABLED / DISABLED）；执行状态属于 Run，与 Agent 无关。
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
