"use client";

/**
 * Employee Workspace Sidebar（DESIGN.md §5.1）：
 * 核心入口（Agents / Skills）+ 辅助入口（我的审批 / 管理员 / 设置）
 * + History（全部 / 任务 / 会话 过滤；紧凑单行列表，updatedAt DESC，无日期分组）。
 * Administration 不在此展开 —— 「管理员」进入独立 Admin Shell（§5.4）。
 */
import { useMemo, useState } from "react";
import { Bot, Building2, FolderKanban, LayoutGrid, MessageSquare, MessageSquarePlus, Settings, ShieldCheck, Sparkles, SquareCheckBig } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useWorkspaceNav, hasAdminCapability } from "@/components/shell/nav";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { buildHistoryItems, HISTORY_FILTERS, type HistoryFilter } from "@/lib/history";

export function Sidebar() {
  // 渲染契约：整店订阅（mock 嵌套原地变更，窄 selector 不触发重渲染）
  const store = useWorkspaceStore();
  const { conversations, tasks, agents, approvals, viewAsAdmin, currentUser, setViewAsAdmin, activeTabKey } = store;
  const nav = useWorkspaceNav();
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  const canAdmin = hasAdminCapability(currentUser, viewAsAdmin);

  const pendingApprovalCount = useMemo(
    () => Object.values(approvals).filter((a) => a.status === "PENDING").length,
    [approvals],
  );

  // 历史混排 + 视图过滤（View State，不动业务数据）
  const historyItems = useMemo(
    () => buildHistoryItems(conversations, tasks, agents, historyFilter),
    [conversations, tasks, agents, historyFilter],
  );

  const activeRef = activeTabKey; // highlight opened tabs

  function isActive(kind: "conversation" | "task", id: string) {
    return activeRef === `${kind === "conversation" ? "conv" : "task"}:${id}`;
  }

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles size={15} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">GateForge</span>
      </div>

      {/* Primary actions */}
      <div className="flex flex-col gap-1.5 px-3">
        <button
          onClick={() => nav.newConversation()}
          className="focus-ring flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <MessageSquarePlus size={15} />
          新建会话
        </button>
        <button
          onClick={() => nav.newTask()}
          className="focus-ring flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-accent"
        >
          <SquareCheckBig size={15} />
          新建任务
        </button>
      </div>

      {/* 工作区入口：统一垂直节奏 */}
      <nav className="mt-4 flex flex-col gap-1 px-3">
        <SidebarLink icon={<LayoutGrid size={15} />} label="Agents" onClick={() => nav.go("/agents")} />
        <SidebarLink icon={<FolderKanban size={15} />} label="Skills" onClick={() => nav.go("/skills")} />
        <SidebarLink
          icon={<ShieldCheck size={15} />}
          label="我的审批"
          badge={pendingApprovalCount > 0 ? pendingApprovalCount : undefined}
          onClick={() => nav.go("/approvals")}
        />
        {canAdmin ? (
          <SidebarLink icon={<Building2 size={15} />} label="管理员" onClick={() => nav.admin()} />
        ) : null}
        <SidebarLink icon={<Settings size={15} />} label="设置" onClick={() => nav.go("/settings")} />
      </nav>

      {/* History：全部 / 任务 / 会话 过滤（默认全部） */}
      <div className="mt-3 px-3">
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
          {HISTORY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setHistoryFilter(f.id)}
              className={cn(
                "focus-ring h-6 flex-1 rounded-md text-[11px] font-medium transition-colors",
                historyFilter === f.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 紧凑单行列表（updatedAt DESC，无日期分组）：标题截断，类型图标固定在行尾 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-2">
        {historyItems.length === 0 ? (
          <div className="px-2 py-3 text-[11px] text-muted-foreground/70">暂无记录</div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {historyItems.map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  item.kind === "conversation" ? nav.openConversation(item.id) : nav.openTask(item.id)
                }
                title={item.kind === "conversation" ? "会话" : item.agentName ?? "任务"}
                className={cn(
                  "group flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-sidebar-accent",
                  isActive(item.kind, item.id) && "bg-sidebar-accent",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] text-sidebar-foreground">
                  {item.title}
                </span>
                {item.kind === "task" && item.agentEmoji ? (
                  <Avatar
                    emoji={item.agentEmoji}
                    color="#64748b"
                    size="xs"
                    className="border-transparent"
                  />
                ) : item.kind === "task" ? (
                  <Bot size={12} className="shrink-0 text-muted-foreground" />
                ) : (
                  <MessageSquare size={12} className="shrink-0 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: current user + admin view toggle */}
      <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.name.slice(0, 1)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {currentUser.name} · 员工
          </span>
        </div>
        <button
          onClick={() => setViewAsAdmin(!viewAsAdmin)}
          title={viewAsAdmin ? "切回员工视角" : "以管理员视角查看"}
          className={cn(
            "focus-ring rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors",
            viewAsAdmin
              ? "border-primary/40 bg-accent text-accent-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {viewAsAdmin ? "Admin" : "Admin 视角"}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="focus-ring flex h-9 items-center gap-2 rounded-lg px-2 text-[13px] text-sidebar-foreground transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined ? (
        <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
