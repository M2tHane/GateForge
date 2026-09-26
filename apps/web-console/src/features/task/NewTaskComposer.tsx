"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Info } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { Avatar, Chip } from "@/components/ui/primitives";
import { Dropdown, DropdownItem } from "@/components/ui/overlay";
import { COMPOSER_TAB_KEY, useWorkspaceStore } from "@/lib/store/workspace-store";

/**
 * New Task Composer（§7.1 / §21，尚未持久化）。
 * Agent 选择以 Chip 呈现在输入框上方：未选择时为 [选择 Agent] 入口，选中后为
 * [Avatar 名称 ×]（× 仅在 Task 创建前可取消选择）。候选 = Personal Agent +
 * ENABLED + 有 Published Version；不显示版本号（exact 绑定在创建时固定）。
 * 第一次发送消息时才创建 Task 并固定 agentId + exact agentVersionId。
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

  function onSubmit() {
    if (!selected) {
      setError("请先在输入框上方选择一个 Agent");
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
        {/* Agent Chip 行：创建前可选择 / 取消；创建后 Task 固定 Agent（不可 × / 切换） */}
        <div className="mb-2 flex min-h-7 flex-wrap items-center gap-1.5">
          {selected ? (
            <Chip
              icon={<Avatar emoji={selected.avatarEmoji} color={selected.avatarColor} size="xs" />}
              label={selected.name}
              title="已选择的 Agent；发送第一条指令后将与任务绑定，不可更换"
              removeLabel="取消选择该 Agent"
              onRemove={() => useWorkspaceStore.getState().openComposerTab(null)}
            />
          ) : (
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Bot size={13} />
                  选择 Agent
                </button>
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
                    candidates.map((agent) => (
                      <DropdownItem
                        key={agent.id}
                        onClick={() => {
                          useWorkspaceStore.getState().openComposerTab(agent.id);
                          setError(null);
                          close();
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} size="sm" />
                          <span className="font-medium">{agent.name}</span>
                        </span>
                      </DropdownItem>
                    ))
                  )}
                </div>
              )}
            </Dropdown>
          )}
        </div>
        <ChatInput
          value={draft}
          onChange={(v) => {
            setError(null);
            useWorkspaceStore.getState().setTabDraft(COMPOSER_TAB_KEY, v);
          }}
          onSubmit={onSubmit}
          placeholder="输入任务指令，例如：修复仓库登录超时 Bug…"
          disabled={!selected}
          disabledHint="请先选择一个 Agent"
          footer={<span />}
        />
        <div className="mt-1.5 px-1 text-[11px] text-muted-foreground/70">
          发送后将创建任务，并固定该 Agent 当前的已发布版本（P12 / P17）
        </div>
      </div>
    </div>
  );
}
