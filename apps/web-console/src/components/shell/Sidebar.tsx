"use client";

import { useMemo } from "react";
import {
  Bot,
  FolderKanban,
  LayoutGrid,
  MessageSquarePlus,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  SquareCheckBig,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useWorkspaceNav } from "@/components/shell/nav";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { dayGroupOf, type DayGroup } from "@/lib/format";

interface HistoryItem {
  key: string;
  kind: "conversation" | "task";
  id: string;
  title: string;
  updatedAt: string;
  agentEmoji?: string;
  agentName?: string;
  sub: string;
}

const ADMIN_NAV = [
  { label: "Models", path: "/admin/models" },
  { label: "Tools / MCP Servers", path: "/admin/tools" },
  { label: "Skill Categories", path: "/admin/skill-categories" },
  { label: "Policies", path: "/admin/policies" },
  { label: "Approvals", path: "/admin/approvals" },
  { label: "Teams", path: "/admin/teams" },
  { label: "Audit", path: "/admin/audit" },
];

export function Sidebar() {
  // 渲染契约：整店订阅（mock 嵌套原地变更，窄 selector 不触发重渲染）
  const store = useWorkspaceStore();
  const conversations = store.conversations;
  const tasks = store.tasks;
  const agents = store.agents;
  const approvals = store.approvals;
  const viewAsAdmin = store.viewAsAdmin;
  const currentUser = store.currentUser;
  const setViewAsAdmin = store.setViewAsAdmin;
  const activeTabKey = store.activeTabKey;
  const nav = useWorkspaceNav();

  const pendingApprovalCount = useMemo(
    () => Object.values(approvals).filter((a) => a.status === "PENDING").length,
    [approvals],
  );

  // 历史记录统一展示 Conversation + Task，按时间分组（今天 / 昨天 / 更早）
  const historyGroups = useMemo(() => {
    const items: HistoryItem[] = [];
    for (const conv of Object.values(conversations)) {
      if (!conv.persisted) continue;
      items.push({
        key: `conv:${conv.id}`, kind: "conversation", id: conv.id,
        title: conv.title, updatedAt: conv.updatedAt,
        sub: "会话",
      });
    }
    for (const task of Object.values(tasks)) {
      if (!task.persisted || task.status === "ARCHIVED") continue;
      const agent = agents[task.agentId];
      items.push({
        key: `task:${task.id}`, kind: "task", id: task.id,
        title: task.title, updatedAt: task.updatedAt,
        agentEmoji: agent?.avatarEmoji, agentName: agent?.name,
        sub: agent ? `${agent.avatarEmoji} ${agent.name}` : "任务",
      });
    }
    items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const groups: Record<DayGroup, HistoryItem[]> = { today: [], yesterday: [], earlier: [] };
    for (const item of items) groups[dayGroupOf(item.updatedAt)].push(item);
    return groups;
  }, [conversations, tasks, agents]);

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

      {/*一级入口 */}
      <nav className="mt-4 flex flex-col gap-0.5 px-3">
        <SidebarLink icon={<LayoutGrid size={15} />} label="Agents" onClick={() => nav.go("/agents")} />
        <SidebarLink icon={<FolderKanban size={15} />} label="Skills" onClick={() => nav.go("/skills")} />
      </nav>

      {/* History */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {(["today", "yesterday", "earlier"] as DayGroup[]).map((group) =>
          historyGroups[group].length > 0 ? (
            <div key={group} className="mb-2">
              <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground/80">
                {group === "today" ? "今天" : group === "yesterday" ? "昨天" : "更早"}
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

      {/* More */}
      <div className="flex flex-col gap-0.5 border-t border-sidebar-border px-3 py-2">
        <SidebarLink
          icon={<ShieldCheck size={15} />}
          label="My Approvals"
          badge={pendingApprovalCount > 0 ? pendingApprovalCount : undefined}
          onClick={() => nav.go("/approvals")}
        />
        <SidebarLink icon={<MoreHorizontal size={15} />} label="More / Settings" onClick={() => nav.go("/settings")} />
      </div>

      {/* Administration（仅管理员视角可见，不挤占员工日常导航） */}
      {viewAsAdmin ? (
        <div className="border-t border-sidebar-border px-3 py-2">
          <div className="px-2 pb-1 pt-1 text-[11px] font-medium text-muted-foreground/80">
            Administration
          </div>
          {ADMIN_NAV.map((item) => (
            <button
              key={item.path}
              onClick={() => nav.go(item.path)}
              className="block w-full truncate rounded-lg px-2 py-1 text-left text-[12px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

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
