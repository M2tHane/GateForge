"use client";

import { Sidebar } from "@/components/shell/Sidebar";
import { TabBar } from "@/components/shell/TabBar";
import { useStoreHydrated } from "@/components/shell/useStoreHydrated";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

/**
 * App Shell (DESIGN.md §5): 左侧导航 + IDE 式 Tab Bar + 内容区。
 * Shell 在所有页面间保持挂载，Tab 状态由 workspace store 持有。
 * Administration 路由不经过此 Shell（见 AdminShell / DESIGN.md §5.4）。
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStoreHydrated();
  const theme = useWorkspaceStore((s) => s.theme);

  if (!hydrated) {
    return (
      <div className={cn("app-shell flex h-screen items-center justify-center", theme === "night" && "dark")}>
        <div className="text-sm text-muted-foreground">GateForge…</div>
      </div>
    );
  }

  return (
    <div className={cn("app-shell flex h-screen overflow-hidden", theme === "night" && "dark")}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TabBar />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
