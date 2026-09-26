"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatScrollArea, MessageList } from "@/components/chat/MessageList";
import { Avatar, Badge, Chip, EmptyState } from "@/components/ui/primitives";
import { activeRunOf, taskTabKey, useWorkspaceStore } from "@/lib/store/workspace-store";
import { runStatusLabel } from "@/lib/format";
import { Inspector, WaitingApprovalBanner } from "@/features/task/Inspector";

/**
 * Existing Task Workspace（§7.2 / §21）：Task 创建后固定 Agent · exact 版本。
 * 输入框上方为只读 Agent Chip（无 ×、不可切换、不显示版本号）。
 * 聊天流顶部轻量展示当前 Run 状态。
 */
export function TaskWorkspace() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  // 渲染契约：整店订阅（mock 嵌套原地变更，窄 selector 不触发重渲染）
  const store = useWorkspaceStore();
  const task = store.tasks[taskId];
  const agent = task ? store.agents[task.agentId] : undefined;
  const tabUi = store.tabUi;

  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [busyHint, setBusyHint] = useState(false);

  const tabKey = taskTabKey(taskId);
  const draft = tabUi[tabKey]?.draft ?? "";
  const scrollTop = tabUi[tabKey]?.scrollTop ?? 0;

  // 深链 / 刷新：确保 Tab 存在
  useEffect(() => {
    if (task) useWorkspaceStore.getState().openTaskTab(taskId);
  }, [task, taskId]);

  const currentRun = useMemo(() => (task ? activeRunOf(task) ?? task.runs.at(-1) : undefined), [task]);

  if (!task || !agent) {
    return (
      <EmptyState
        title="任务不存在"
        description="该 Task 可能已被归档或尚未创建。"
      />
    );
  }

  function onSubmit() {
    setBusyHint(false);
    const result = useWorkspaceStore.getState().sendTaskMessage(taskId, draft.trim());
    if (result === "busy") {
      setBusyHint(true);
      return;
    }
    if (result === "started") {
      useWorkspaceStore.getState().setTabDraft(tabKey, "");
    }
  }

  const runStatus = currentRun?.status;

  return (
    <div className="flex h-full min-w-0">
      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header strip: task identity + current run status */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-foreground">{task.title}</div>
              <div className="text-[11px] text-muted-foreground">任务 · 固定 Agent 工作上下文</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {runStatus ? (
              <Badge
                tone={
                  runStatus === "COMPLETED"
                    ? "success"
                    : runStatus === "WAITING_APPROVAL"
                      ? "warning"
                      : runStatus === "FAILED"
                        ? "danger"
                        : "info"
                }
              >
                {runStatus === "RUNNING" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : runStatus === "COMPLETED" ? (
                  <CheckCircle2 size={11} />
                ) : null}
                {`运行 #${currentRun?.index} · ${runStatusLabel(runStatus)}`}
              </Badge>
            ) : null}
          </div>
        </div>

        <ChatScrollArea
          scrollKey={tabKey}
          restoreScroll={scrollTop}
          onScrollChange={(top) => useWorkspaceStore.getState().setTabScroll(tabKey, top)}
          deps={[task.messages.length, task.runs.at(-1)?.status]}
          className="bg-background/40"
        >
          <MessageList
            messages={task.messages}
            emptyState={
              <div className="py-20 text-center">
                <div className="text-sm font-medium text-foreground">告诉 Agent 你要完成什么</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  每条新指令会开始一次新运行；执行进度只显示摘要，完整链路在右侧执行详情
                </div>
              </div>
            }
          />
        </ChatScrollArea>

        <div className="px-6 pb-5">
          <WaitingApprovalBanner taskId={taskId} onOpenInspector={() => setInspectorCollapsed(false)} />
          {busyHint ? (
            <div className="mb-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              当前运行 #{currentRun?.index} 尚未结束（{runStatusLabel(currentRun?.status ?? "RUNNING")}）——等它完成后再发送新指令。
            </div>
          ) : null}
          {/* Existing Task：Agent 只读 Chip——悬浮在输入框上方，无 ×、不可切换（P17 / §21） */}
          <div className="mb-2 flex min-h-7 flex-wrap items-center gap-1.5">
            <Chip
              icon={<Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} size="xs" />}
              label={agent.name}
              title="任务创建后固定该 Agent 与其精确版本，不可取消或切换"
            />
          </div>
          <ChatInput
            value={draft}
            onChange={(v) => useWorkspaceStore.getState().setTabDraft(tabKey, v)}
            onSubmit={onSubmit}
            placeholder="继续告诉 Agent…"
            footer={<span />}
          />
          <div className="mt-1.5 px-1 text-[11px] text-muted-foreground/70">
            当前任务固定使用 {agent.name}，Agent 与精确版本已锁定
          </div>
        </div>
      </div>

      {/* Inspector（Task 默认展开，可收起） */}
      <Inspector
        taskId={taskId}
        collapsed={inspectorCollapsed}
        onToggle={() => setInspectorCollapsed((v) => !v)}
      />
    </div>
  );
}
