"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatScrollArea, MessageList } from "@/components/chat/MessageList";
import { SkillPickerDrawer } from "@/components/skill-picker/SkillPickerDrawer";
import { Dropdown, DropdownItem } from "@/components/ui/overlay";
import { Chip, EmptyState } from "@/components/ui/primitives";
import { convTabKey, useWorkspaceStore } from "@/lib/store/workspace-store";

/**
 * Conversation Workspace（DESIGN.md §6 / §21）：不绑 Agent、不产生 Run 的多轮聊天，
 * 必经 Model Gateway。Footer 左侧为 Model Selector（中途切换只影响后续调用）
 * 与「技能」入口（统一 Skill Picker，§8）；已导入 Skill 以 chips 展示
 * （exact SkillVersion 绑定，可单个移除；日常使用不显示版本号）。
 */
export function ConversationWorkspace() {
  const params = useParams<{ id: string }>();
  const convId = params.id;

  // 整店订阅（store 约定）：mock 的嵌套变更是原地进行的，窄 selector 不触发重渲染
  const store = useWorkspaceStore();
  const conv = store.conversations[convId];

  const tabKey = convTabKey(convId);
  const draft = store.tabUi[tabKey]?.draft ?? "";
  const scrollTop = store.tabUi[tabKey]?.scrollTop ?? 0;

  const [pickerOpen, setPickerOpen] = useState(false);

  // 深链 / 刷新：确保 Tab 存在
  useEffect(() => {
    if (conv) useWorkspaceStore.getState().openConversationTab(convId);
  }, [conv, convId]);

  if (!conv) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="会话不存在" description="该会话可能尚未创建，或链接已失效。" />
      </div>
    );
  }

  const currentModel = store.modelCandidates.find((m) => m.id === conv.defaultModelPolicyId);

  // skillVersionId → Skill + exact Version（绑定的不一定是 currentVersion）
  const boundSkills = conv.skillVersionIds.flatMap((versionId) => {
    for (const skill of Object.values(store.skills)) {
      const version = skill.versions.find((v) => v.id === versionId);
      if (version) return [{ skill, version }];
    }
    return [];
  });

  function onSubmit() {
    const text = draft.trim();
    if (!text) return;
    useWorkspaceStore.getState().setTabDraft(tabKey, "");
    if (text === "/skill") {
      // 内部命令兼容（仅实现层）；UI 入口是「技能」按钮，不再展示 /skill
      setPickerOpen(true);
      return;
    }
    useWorkspaceStore.getState().sendConversationMessage(convId, text);
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ChatScrollArea
        scrollKey={tabKey}
        restoreScroll={scrollTop}
        onScrollChange={(top) => useWorkspaceStore.getState().setTabScroll(tabKey, top)}
        deps={[conv.messages.length]}
        className="bg-background/40"
      >
        <MessageList
          messages={conv.messages.map((m) => ({ ...m, kind: "text" as const }))}
          emptyState={
            <div className="py-20 text-center">
              <div className="text-sm font-medium text-foreground">开始你的新会话</div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                在下方选择默认模型，点击「技能」添加技能，或直接发送第一条消息。
              </div>
            </div>
          }
        />
      </ChatScrollArea>

      <div className="shrink-0 px-6 pb-5">
        {/* 已导入 Skill chips：exact SkillVersion 绑定，可单个移除；日常使用不显示版本号 */}
        {boundSkills.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {boundSkills.map(({ skill, version }) => (
              <Chip
                key={version.id}
                label={skill.name}
                removeLabel={`移除 ${skill.name}`}
                onRemove={() => useWorkspaceStore.getState().removeConversationSkill(convId, version.id)}
              />
            ))}
          </div>
        ) : null}

        <ChatInput
          value={draft}
          onChange={(v) => useWorkspaceStore.getState().setTabDraft(tabKey, v)}
          onSubmit={onSubmit}
          placeholder="输入消息…"
          footer={
            <div className="flex items-center gap-2">
              {/* Model Selector：候选来自「我当前允许使用哪些模型」（Effective Capability） */}
              <Dropdown
                trigger={
                  <button
                    type="button"
                    className="focus-ring inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {currentModel?.label ?? "选择模型"}
                    <ChevronDown size={12} className="text-muted-foreground" />
                  </button>
                }
              >
                {(close) => (
                  <>
                    {store.modelCandidates.map((m) => (
                      <DropdownItem
                        key={m.id}
                        onClick={() => {
                          useWorkspaceStore.getState().setConversationModel(convId, m.id);
                          close();
                        }}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span>{m.label}</span>
                          {m.id === conv.defaultModelPolicyId ? (
                            <Check size={12} className="text-primary" />
                          ) : null}
                        </span>
                      </DropdownItem>
                    ))}
                    <div className="mt-1 border-t border-border px-2.5 pb-0.5 pt-1.5 text-[10px] text-muted-foreground/70">
                      切换只影响后续调用，历史消息保持不变
                    </div>
                  </>
                )}
              </Dropdown>

              {/* 技能：唤起统一 Skill Picker（§8） */}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="focus-ring inline-flex h-7 items-center rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                技能
              </button>
            </div>
          }
        />
      </div>

      {/* 条件挂载：每次打开都以当前会话绑定初始化选择 */}
      {pickerOpen ? (
        <SkillPickerDrawer
          open
          onClose={() => setPickerOpen(false)}
          selectedVersionIds={conv.skillVersionIds}
          onConfirm={(selected) => {
            // 确认回调返回完整选择列表 → 与当前绑定做 diff
            const s = useWorkspaceStore.getState();
            const prev = s.conversations[convId]?.skillVersionIds ?? [];
            const next = new Set(selected);
            for (const versionId of selected) {
              if (!prev.includes(versionId)) s.addConversationSkill(convId, versionId);
            }
            for (const versionId of prev) {
              if (!next.has(versionId)) s.removeConversationSkill(convId, versionId);
            }
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
