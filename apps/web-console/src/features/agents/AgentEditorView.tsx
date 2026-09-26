"use client";

/**
 * Agent Editor（DESIGN.md §11）：编辑 DRAFT version，Publish 生成新版本。
 *
 * - 仅编辑草稿（draftVersionId）；已发布 / 不存在 → 提示 + 返回。
 * - 分区 Tabs：基本信息 / Engine / Model / Skills / Tools / Review。
 * - Engine 只读（pi，平台提供，员工不可选）；Model 候选 = modelCandidates
 *   （§14：来自「我当前允许使用哪些模型」，员工看不到 Provider 配置）。
 * - Skills 走统一 SkillPickerDrawer，绑定 exact SkillVersion；Tools 分
 *   内置 / MCP 两组复选框，绑定 exact ToolVersion。
 * - Publish 是高风险操作（§17）：Modal 最终确认后 publishAgentDraft。
 */
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { SkillPickerDrawer } from "@/components/skill-picker/SkillPickerDrawer";
import { Modal, SelectMenu, Tabs } from "@/components/ui/overlay";
import { Badge, Button, EmptyState, FieldLabel, Input, Textarea } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import {
  draftVersionOf,
  modelLabel,
  nextVersionLabel,
  skillByVersionId,
  toolByVersionId,
} from "@/features/agents/helpers";
import type { AgentVersionManifest, Tool } from "@/lib/types";

type EditorTab = "basic" | "engine" | "model" | "skills" | "tools" | "review";

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: "basic", label: "基本信息" },
  { id: "engine", label: "引擎" },
  { id: "model", label: "模型" },
  { id: "skills", label: "技能" },
  { id: "tools", label: "工具" },
  { id: "review", label: "发布确认" },
];

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-relaxed text-muted-foreground/80">
      <Info size={12} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

export function AgentEditorView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const agentId = params.id;
  const store = useWorkspaceStore();
  const agent = store.agents[agentId];
  const draft = agent ? draftVersionOf(agent) : undefined;

  const [activeTab, setActiveTab] = useState<EditorTab>("basic");
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!agent || !draft) {
    const published = agent ? agent.versions.find((v) => v.id === agent.publishedVersionId) : undefined;
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="编辑 Agent" />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            title={agent ? "当前没有可编辑的草稿" : "Agent 不存在"}
            description={
              agent
                ? `该 Agent 已发布${published ? ` ${published.version}` : ""}，发布后的版本只读；可从详情页创建新版本。`
                : "该 Agent 可能已被放弃或不存在。"
            }
            action={
              <Button onClick={() => (agent ? router.push(`/agents/${agent.id}`) : router.push("/agents"))}>
                返回
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const manifest = draft.manifest;
  const nextVersion = nextVersionLabel(agent);
  const canPublish = agent.name.trim().length > 0;

  function patchManifest(partial: Partial<AgentVersionManifest>) {
    useWorkspaceStore.getState().updateDraftAgent(agentId, { manifest: partial });
  }

  function toggleTool(tool: Tool, on: boolean) {
    const versionIds = tool.versions.map((v) => v.id);
    const current = manifest.tools;
    const next = on
      ? [
          ...current.filter((mt) => !versionIds.includes(mt.toolVersionId)),
          ...(tool.versions[0]
            ? [{ name: tool.name, toolVersionId: tool.versions[0].id }]
            : []),
        ]
      : current.filter((mt) => !versionIds.includes(mt.toolVersionId));
    patchManifest({ tools: next });
  }

  function onPublishConfirm() {
    const publishedId = useWorkspaceStore.getState().publishAgentDraft(agentId);
    setPublishOpen(false);
    if (publishedId) router.push(`/agents/${agentId}`);
  }

  function onDiscardConfirm() {
    useWorkspaceStore.getState().discardDraftAgent(agentId);
    setDiscardOpen(false);
    router.push("/agents");
  }

  const builtinTools = store.tools.filter((t) => t.provider === "BUILTIN");
  const mcpTools = store.tools.filter((t) => t.provider === "MCP");

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={`编辑 Agent：${agent.name}`}
        description={`草稿 · 发布后生成 ${nextVersion}，该版本将变为只读`}
        actions={
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDiscardOpen(true)}
          >
            放弃草稿
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 pb-16">
          <Tabs
            className="mt-1"
            tabs={EDITOR_TABS}
            active={activeTab}
            onChange={(id) => setActiveTab(id as EditorTab)}
          />

          {activeTab === "basic" ? (
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <FieldLabel hint="必填">名称</FieldLabel>
                <Input
                  value={agent.name}
                  onChange={(e) =>
                    useWorkspaceStore.getState().updateDraftAgent(agentId, { name: e.target.value })
                  }
                  placeholder="例如：Coding Agent"
                />
              </div>
              <div>
                <FieldLabel hint="展示用，可选">描述</FieldLabel>
                <Textarea
                  rows={3}
                  value={agent.description}
                  onChange={(e) =>
                    useWorkspaceStore
                      .getState()
                      .updateDraftAgent(agentId, { description: e.target.value })
                  }
                  placeholder="描述这个 Agent 的用途与边界"
                />
              </div>
              <div>
                <FieldLabel hint="emoji + 颜色">头像</FieldLabel>
                <div className="flex items-center gap-3">
                  <Input
                    className="w-24 text-center"
                    value={agent.avatarEmoji}
                    onChange={(e) =>
                      useWorkspaceStore
                        .getState()
                        .updateDraftAgent(agentId, { avatarEmoji: e.target.value })
                    }
                    placeholder="🤖"
                  />
                  <input
                    type="color"
                    value={agent.avatarColor}
                    onChange={(e) =>
                      useWorkspaceStore
                        .getState()
                        .updateDraftAgent(agentId, { avatarColor: e.target.value })
                    }
                    className="focus-ring h-9 w-14 cursor-pointer rounded-lg border border-input bg-card p-1"
                    aria-label="头像颜色"
                  />
                  <span className="text-xs text-muted-foreground">
                    头像仅作展示；发布后随版本一起冻结
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "engine" ? (
            <div className="mt-5 flex flex-col gap-2">
              <FieldLabel>引擎</FieldLabel>
              <div className="surface flex items-center justify-between px-3.5 py-3">
                <span className="text-sm font-medium text-foreground">pi</span>
                <Badge tone="neutral">平台提供</Badge>
              </div>
              <Hint>引擎由平台提供（当前为 pi），员工不可选择或更换。</Hint>
            </div>
          ) : null}

          {activeTab === "model" ? (
            <div className="mt-5 flex flex-col gap-2">
              <FieldLabel>模型</FieldLabel>
              <SelectMenu
                value={manifest.modelPolicyId}
                options={store.modelCandidates.map((candidate) => ({
                  value: candidate.id,
                  label: candidate.label,
                }))}
                onChange={(modelPolicyId) => patchManifest({ modelPolicyId })}
              />
              <Hint>
                候选来自「我当前允许使用哪些模型」（Model Policy 候选集）；Provider
                与凭证由管理员统一管理，员工不可见、不可编辑。
              </Hint>
            </div>
          ) : null}

          {activeTab === "skills" ? (
            <div className="mt-5 flex flex-col gap-3">
              <FieldLabel hint={manifest.skills.length > 0 ? `已选 ${manifest.skills.length} 个` : undefined}>
                技能
              </FieldLabel>
              {manifest.skills.length === 0 ? (
                <div className="surface px-3.5 py-4 text-xs text-muted-foreground">
                  尚未绑定技能。可从统一技能选择器中选择平台 / 团队 / 我的技能。
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {manifest.skills.map((entry) => {
                    const resolved = skillByVersionId(store.skills, entry.skillVersionId);
                    return (
                      <span
                        key={entry.skillVersionId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                      >
                        {entry.name}
                        <Badge tone="neutral">{resolved?.version.version ?? "—"}</Badge>
                        <button
                          onClick={() =>
                            patchManifest({
                              skills: manifest.skills.filter(
                                (s) => s.skillVersionId !== entry.skillVersionId,
                              ),
                            })
                          }
                          className="text-accent-foreground/60 hover:text-foreground"
                          aria-label={`移除 ${entry.name}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div>
                <Button size="sm" onClick={() => setPickerOpen(true)}>
                  添加 / 调整技能
                </Button>
                <Hint>
                  绑定 exact SkillVersion（当前已发布版本）；源 Skill 后续更新不会改变本次绑定。
                  候选来自 Effective Capability（平台 / 团队 / 我的）。
                </Hint>
              </div>

              {pickerOpen ? (
                <SkillPickerDrawer
                  open
                  onClose={() => setPickerOpen(false)}
                  selectedVersionIds={manifest.skills.map((s) => s.skillVersionId)}
                  onConfirm={(versionIds) => {
                    patchManifest({
                      skills: versionIds.map((versionId) => ({
                        name: skillByVersionId(store.skills, versionId)?.skill.name ?? versionId,
                        skillVersionId: versionId,
                      })),
                    });
                    setPickerOpen(false);
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {activeTab === "tools" ? (
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <FieldLabel>允许的内置工具</FieldLabel>
                <div className="flex flex-col gap-2">
                  {builtinTools.map((tool) => {
                    const checked = manifest.tools.some((mt) =>
                      tool.versions.some((v) => v.id === mt.toolVersionId),
                    );
                    return (
                      <ToolCheckbox
                        key={tool.id}
                        tool={tool}
                        checked={checked}
                        onToggle={(on) => toggleTool(tool, on)}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <FieldLabel>允许的 MCP 工具</FieldLabel>
                <div className="flex flex-col gap-2">
                  {mcpTools.map((tool) => {
                    const checked = manifest.tools.some((mt) =>
                      tool.versions.some((v) => v.id === mt.toolVersionId),
                    );
                    return (
                      <ToolCheckbox
                        key={tool.id}
                        tool={tool}
                        checked={checked}
                        onToggle={(on) => toggleTool(tool, on)}
                      />
                    );
                  })}
                </div>
                <Hint>
                  只能选择管理员已接入并授权的 MCP Tool；员工不能自行连接 MCP Server。
                  绑定 exact ToolVersion。
                </Hint>
              </div>
            </div>
          ) : null}

          {activeTab === "review" ? (
            <div className="mt-5 flex flex-col gap-4">
              <div className="surface divide-y divide-border px-4">
                <ReviewRow label="名称">{agent.name}</ReviewRow>
                <ReviewRow label="引擎">pi</ReviewRow>
                <ReviewRow label="模型">{modelLabel(store.modelCandidates, manifest.modelPolicyId)}</ReviewRow>
                <ReviewRow label="技能">{manifest.skills.length} 个</ReviewRow>
                <ReviewRow label="工具">
                  {manifest.tools.length} 个（内置{" "}
                  {manifest.tools.filter((t) => {
                    const tool = toolByVersionId(store.tools, t.toolVersionId);
                    return tool?.tool.provider === "BUILTIN";
                  }).length}
                  {" / "}MCP{" "}
                  {manifest.tools.filter((t) => {
                    const tool = toolByVersionId(store.tools, t.toolVersionId);
                    return tool?.tool.provider === "MCP";
                  }).length}
                  ）
                </ReviewRow>
              </div>
              <div>
                <Button variant="primary" disabled={!canPublish} onClick={() => setPublishOpen(true)}>
                  发布
                </Button>
                <Hint>
                  发布将生成 {nextVersion}；发布后该版本只读，如需修改需基于它创建新版本。
                  {canPublish ? "" : " 请先填写 Agent 名称。"}
                </Hint>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Publish 最终确认（§17：Publish 属高风险确认） */}
      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="发布 Agent 版本"
        footer={
          <>
            <Button onClick={() => setPublishOpen(false)}>取消</Button>
            <Button variant="primary" onClick={onPublishConfirm}>
              确认发布
            </Button>
          </>
        }
      >
        <p>
          即将发布 <span className="font-medium">{agent.name}</span> 的{" "}
          <span className="font-medium">{nextVersion}</span>。
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          发布后该版本内容只读；修改配置需创建新版本（Clone Draft → 编辑 → Publish）。
          已创建的任务不受影响，仍绑定其创建时固定的版本。
        </p>
      </Modal>

      {/* 放弃草稿确认（不可逆） */}
      <Modal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="放弃草稿"
        footer={
          <>
            <Button onClick={() => setDiscardOpen(false)}>取消</Button>
            <Button variant="danger" onClick={onDiscardConfirm}>
              放弃草稿
            </Button>
          </>
        }
      >
        <p>
          将删除 <span className="font-medium">{agent.name}</span> 的草稿及全部未发布修改，不可恢复。
        </p>
      </Modal>
    </div>
  );
}

function ToolCheckbox({
  tool,
  checked,
  onToggle,
}: {
  tool: Tool;
  checked: boolean;
  onToggle: (on: boolean) => void;
}) {
  const current = tool.versions[0];
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors hover:bg-accent/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
          {tool.name}
          {current ? <Badge tone="neutral">{current.version}</Badge> : null}
          {tool.mcpServerName ? <Badge tone="info">{tool.mcpServerName}</Badge> : null}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{tool.description}</span>
      </span>
    </label>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-foreground">{children}</span>
    </div>
  );
}
