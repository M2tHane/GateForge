"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Info } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { Avatar, Badge } from "@/components/ui/primitives";
import { Dropdown, DropdownItem } from "@/components/ui/overlay";
import { COMPOSER_TAB_KEY, useWorkspaceStore } from "@/lib/store/workspace-store";

/**
 * New Task Composer（§7.1，尚未持久化）。
 * Agent Selector 只存在于这里：候选 = Personal Agent + ENABLED + 有 Published
 * Version。第一次发送消息时才创建 Task 并固定 agentId + exact agentVersionId。
 */
export function NewTaskComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 渲染契约：整店订阅（mock 嵌套原地变更，窄 selector 不触发重渲染）
  const store = useWorkspaceStore();
  const agents = store.agents;
  const composerAgentId = store.composerAgentId;
  const tabUi = store.tabUi;

  const [error, setError] = useState<string | null>(null);
  const draft = tabUi[COMPOSER_TAB_KEY]?.draft ?? "";

  // 深链 /agents 卡片「启动任务」带 ?agent=；否则仅确保 Tab 存在（不覆盖已选 Agent）
  useEffect(() => {
    const agentParam = searchParams.get("agent") ?? undefined;
    // 无 ?agent 参数时传 undefined：仅确保 Tab 存在，不清空已选 Agent
    useWorkspaceStore.getState().openComposerTab(agentParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const candidates = useMemo(
    () =>
      Object.values(agents).filter(
        (a) => a.kind === "PERSONAL" && a.status === "ENABLED" && a.publishedVersionId !== null,
      ),
    [agents],
  );
  const selected = composerAgentId ? agents[composerAgentId] : undefined;
  const selectedVersion = selected?.versions.find((v) => v.id === selected.publishedVersionId);

  function onSubmit() {
    if (!selected) {
      setError("请先在下方选择一个 Agent");
      return;
    }
    const taskId = useWorkspaceStore.getState().createTaskFromComposer(selected.id, draft.trim());
    if (!taskId) {
      setError("该 Agent 当前不可用（需要可用状态且有已发布版本）");
      return;
    }
    useWorkspaceStore.getState().setTabDraft(COMPOSER_TAB_KEY, "");
    useWorkspaceStore.getState().resetComposer();
    useWorkspaceStore.getState().openTaskTab(taskId);
    router.push(`/task/${taskId}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-8">
        <div className="surface flex w-full flex-col items-center gap-3 p-8 text-center">
          <div className="text-lg font-semibold text-foreground">新建任务</div>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            任务是一个固定 Agent 的持续工作上下文。选择 Agent 并发送第一条指令后，
            Task 才会创建，并固定该 Agent 的当前已发布版本——之后不再随 Agent 升级变化。
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <Info size={12} />
            MVP 一个任务只绑定一个 Agent
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 pb-5">
        {error ? (
          <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
        ) : null}
        <ChatInput
          value={draft}
          onChange={(v) => {
            setError(null);
            useWorkspaceStore.getState().setTabDraft(COMPOSER_TAB_KEY, v);
          }}
          onSubmit={onSubmit}
          placeholder="输入任务指令，例如：修复仓库登录超时 Bug…"
          footer={
            <Dropdown
              trigger={
                selected ? (
                  <button className="focus-ring flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs hover:bg-accent">
                    <Avatar emoji={selected.avatarEmoji} color={selected.avatarColor} size="sm" />
                    <span className="font-medium text-foreground">{selected.name}</span>
                    <Badge tone="info">{selectedVersion?.version ?? "—"}</Badge>
                    <span className="text-muted-foreground">▾</span>
                  </button>
                ) : (
                  <button className="focus-ring flex items-center gap-2 rounded-lg border border-dashed border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent">
                    <Bot size={14} />
                    选择 Agent
                    <span>▾</span>
                  </button>
                )
              }
            >
              {(close) => (
                <div className="max-w-64">
                  <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    我的可用 Agent（可用 · 已发布版本）
                  </div>
                  {candidates.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-muted-foreground">暂无可用 Agent</div>
                  ) : (
                    candidates.map((agent) => {
                      const version = agent.versions.find((v) => v.id === agent.publishedVersionId);
                      return (
                        <DropdownItem
                          key={agent.id}
                          onClick={() => {
                            useWorkspaceStore.getState().openComposerTab(agent.id);
                            close();
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} size="sm" />
                            <span className="font-medium">{agent.name}</span>
                            <Badge tone="neutral">{version?.version}</Badge>
                          </span>
                        </DropdownItem>
                      );
                    })
                  )}
                </div>
              )}
            </Dropdown>
          }
        />
        <div className="mt-1.5 px-1 text-[11px] text-muted-foreground/70">
          发送后将创建 Task 并固定该 Agent 的 Published Version（P12 / P17）
        </div>
      </div>
    </div>
  );
}
