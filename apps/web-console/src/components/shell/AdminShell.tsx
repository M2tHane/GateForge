"use client";

/**
 * Administration Shell (DESIGN.md §5.4)：独立于 Employee Workspace 的治理入口。
 * 员工 Sidebar 中只有一个「管理员」入口指向 /admin/models；进入后由本 Shell
 * 承载 7 个治理模块导航。刻意不含员工 History / Agents / Skills / Tab Bar。
 */
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  FileClock,
  FolderTree,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useStoreHydrated } from "@/components/shell/useStoreHydrated";
import { hasAdminCapability } from "@/components/shell/nav";
import { EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { label: "Models", path: "/admin/models", icon: <Cpu size={15} /> },
  { label: "Tools / MCP Servers", path: "/admin/tools", icon: <Wrench size={15} /> },
  { label: "Skill Categories", path: "/admin/skill-categories", icon: <FolderTree size={15} /> },
  { label: "Policies", path: "/admin/policies", icon: <ScrollText size={15} /> },
  { label: "Approvals", path: "/admin/approvals", icon: <ShieldCheck size={15} /> },
  { label: "Teams", path: "/admin/teams", icon: <Users size={15} /> },
  { label: "Audit", path: "/admin/audit", icon: <FileClock size={15} /> },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStoreHydrated();
  const store = useWorkspaceStore();
  const pathname = usePathname();
  const canAdmin = hasAdminCapability(store.currentUser, store.viewAsAdmin);

  if (!hydrated) {
    return (
      <div className="app-shell flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">GateForge Admin…</div>
      </div>
    );
  }

  // 无管理能力：不暴露治理导航，直接给出回退入口
  if (!canAdmin) {
    return (
      <div className="app-shell flex h-screen items-center justify-center">
        <EmptyState
          title="需要管理员权限"
          description="Administration 仅对 Workspace Admin / 授权角色开放。"
          action={
            <Link
              href="/"
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent"
            >
              <ArrowLeft size={14} />
              返回工作区
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles size={15} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            GateForge <span className="text-muted-foreground">Admin</span>
          </span>
        </div>

        {/* 治理模块导航 */}
        <nav className="mt-2 flex flex-col gap-0.5 px-3">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "focus-ring flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] transition-colors",
                pathname === item.path
                  ? "bg-sidebar-accent font-medium text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <span className="text-muted-foreground">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer：当前用户 + 返回工作区 */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
              style={{ backgroundColor: store.currentUser.avatarColor }}
            >
              {store.currentUser.name.slice(0, 1)}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {store.currentUser.name} · 管理员
            </span>
          </div>
          <Link
            href="/"
            title="返回 Employee Workspace"
            className="focus-ring flex h-7 items-center gap-1 rounded-md border border-border px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={11} />
            工作区
          </Link>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
