"use client";

import { useRouter } from "next/navigation";
import { FileDiff, MessageSquare, Plus, SquareCheckBig, X } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { WorkspaceTab } from "@/lib/types";

/**
 * IDE-style workspace tab bar (§5.2). Tabs represent Conversation / Task
 * instances (never Agents) plus the New Task Composer. Switching tabs does not
 * lose context: messages / drafts / scroll state live in the store.
 */
export function TabBar() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabKey = useWorkspaceStore((s) => s.activeTabKey);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const router = useRouter();

  function routeOf(tab: WorkspaceTab): string {
    if (tab.kind === "conversation") return `/conversation/${tab.refId}`;
    if (tab.kind === "task") return `/task/${tab.refId}`;
    if (tab.kind === "file-diff" && tab.taskId && tab.runId && tab.path) {
      return `/diff?taskId=${encodeURIComponent(tab.taskId)}&runId=${encodeURIComponent(tab.runId)}&path=${encodeURIComponent(tab.path)}`;
    }
    return "/task/new";
  }

  function onTabClick(tab: WorkspaceTab) {
    setActiveTab(tab.key);
    router.push(routeOf(tab));
  }

  function onClose(e: React.MouseEvent, key: string) {
    e.stopPropagation();
    const wasActive = key === activeTabKey;
    const before = useWorkspaceStore.getState().tabs;
    const idx = before.findIndex((t) => t.key === key);
    closeTab(key);
    if (wasActive) {
      const remaining = useWorkspaceStore.getState().tabs;
      const neighbor = remaining[Math.min(idx, remaining.length - 1)];
      if (neighbor) {
        router.push(routeOf(neighbor));
        return;
      }
      const conversationId = useWorkspaceStore.getState().createDraftConversation();
      router.push(`/conversation/${conversationId}`);
    }
  }

  if (tabs.length === 0) return null;

  return (
    <div className="flex h-9 shrink-0 items-end gap-0.5 border-b border-border bg-sidebar-muted px-2">
      <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.key === activeTabKey;
          return (
            <div
              key={tab.key}
              onClick={() => onTabClick(tab)}
              className={cn(
                "group flex h-8 max-w-56 min-w-32 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border border-b-0 px-2.5 text-[12px] transition-all duration-200",
                active
                  ? "border-border bg-card text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              {tab.kind === "conversation" ? (
                <MessageSquare size={12} className="shrink-0 text-muted-foreground" />
              ) : tab.kind === "file-diff" ? (
                <FileDiff size={12} className="shrink-0 text-primary" />
              ) : (
                <SquareCheckBig size={12} className="shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{tab.title}</span>
              <button
                onClick={(e) => onClose(e, tab.key)}
                className="rounded p-0.5 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                aria-label={`关闭 ${tab.title}`}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          const id = useWorkspaceStore.getState().createDraftConversation();
          router.push(`/conversation/${id}`);
        }}
        title="新建会话"
        className="focus-ring mb-1 rounded p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
