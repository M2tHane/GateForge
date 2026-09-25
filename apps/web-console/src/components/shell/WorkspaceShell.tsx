"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TabBar } from "@/components/shell/TabBar";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

/**
 * App Shell (DESIGN.md §5): 左侧导航 + IDE 式 Tab Bar + 内容区。
 * Shell 在所有页面间保持挂载，Tab 状态由 workspace store 持有。
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  // 等待 persist rehydrate 完成，避免 SSR/CSR 首帧不一致
  const [mounted, setMounted] = useState(false);
  const [hydrationTick, setHydrationTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    // persist 若为异步完成，需要在水合结束时再渲染一次
    const unsub = useWorkspaceStore.persist?.onFinishHydration?.(() => setHydrationTick((t) => t + 1));
    return () => unsub?.();
  }, []);
  const hasHydrated = (useWorkspaceStore.persist?.hasHydrated?.() ?? true) || hydrationTick > 0;

  if (!mounted || !hasHydrated) {
    return (
      <div className="app-shell flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">GateForge…</div>
      </div>
    );
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TabBar />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
