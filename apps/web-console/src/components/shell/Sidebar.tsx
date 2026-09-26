"use client";

/**
 * Employee Workspace Sidebar（DESIGN.md §5.1）：
 * 核心入口（Agents / Skills）+ 辅助入口（我的审批 / 管理员 / More）
 * + History（全部 / 任务 / 会话 过滤 + 今天 / 昨天 / 更早 分组）。
 * Administration 不在此展开 —— 「管理员」进入独立 Admin Shell（§5.4）。
 */
import { useMemo, useState } from "react";
import { Bot, Building2, FolderKanban, LayoutGrid, MessageSquarePlus, MoreHorizontal, ShieldCheck, Sparkles, SquareCheckBig } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useWorkspaceNav, hasAdminCapability } from "@/components/shell/nav";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { buildHistoryGroups, HISTORY_FILTERS, type HistoryFilter } from "@/lib/history";
import type { DayGroup } from "@/lib/format";

const DAY_GROUP_LABEL: Record<DayGroup, string> = { today: "今天", yesterday: "昨天", earlier: "更早" };

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
  const historyGroups = useMemo(
    () => buildHistoryGroups(conversations, tasks, agents, historyFilter),
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

      {/* 核心资源入口 */}
      <nav className="mt-4 flex flex-col gap-0.5 px-3">
        <SidebarLink icon={<LayoutGrid size={15} />} label="Agents" onClick={() => nav.go("/agents")} />
        <SidebarLink icon={<FolderKanban size={15} />} label="Skills" onClick={() => nav.go("/skills")} />
      </nav>

      {/* 辅助入口（Administration 只留一个「管理员」入口，不再展开子模块） */}
      <nav className="mt-3 flex flex-col gap-0.5 px-3">
        <SidebarLink
          icon={<ShieldCheck size={15} />}
          label="我的审批"
          badge={pendingApprovalCount > 0 ? pendingApprovalCount : undefined}
          onClick={() => nav.go("/approvals")}
        />
        {canAdmin ? (
          <SidebarLink icon={<Building2 size={15} />} label="管理员" onClick={() => nav.admin()} />
        ) : null}
        <SidebarLink icon={<MoreHorizontal size={15} />} label="More / Settings" onClick={() => nav.go("/settings")} />
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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-2">
        {(["today", "yesterday", "earlier"] as DayGroup[]).map((group) =>
          historyGroups[group].length > 0 ? (
            <div key={group} className="mb-2">
              <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground/80">
                {DAY_GROUP_LABEL[group]}
              </div>
              <div className="flex flex-col gap-0.5">
                {historyGroups[group].map((item) => (
                  <button
                    key={item.key}
                    onClick={() =>
                      item.kind === "conversation" ? nav.openConversation(item.id) : nav.openTask(item.id)
                    }
                    className={cn(
                      "group rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent",
                      isActive(item.kind, item.id) && "bg-sidebar-accent",
                    )}
                  >
                    <div className="truncate text-[13px] text-sidebar-foreground">{item.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {item.kind === "task" && item.agentEmoji ? (
                        <Avatar emoji={item.agentEmoji} color="#64748b" size="sm" />
                      ) : (
                        <Bot size={11} className="text-muted-foreground" />
                      )}
                      <span className="truncate">{item.kind === "conversation" ? "会话" : item.agentName ?? "任务"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null,
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
      className="focus-ring flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
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
