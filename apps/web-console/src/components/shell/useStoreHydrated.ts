"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

/**
 * 等 persist rehydrate 完成，避免 SSR/CSR 首帧不一致（依赖 store 的
 * Shell — Employee Workspace / Administration — 都要过这道门再渲染）。
 */
export function useStoreHydrated(): boolean {
  const [mounted, setMounted] = useState(false);
  const [hydrationTick, setHydrationTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    // persist 若为异步完成，需要在水合结束时再渲染一次
    const unsub = useWorkspaceStore.persist?.onFinishHydration?.(() =>
      setHydrationTick((t) => t + 1),
    );
    return () => unsub?.();
  }, []);
  const hasHydrated = useWorkspaceStore.persist?.hasHydrated?.() ?? true;
  return mounted && (hasHydrated || hydrationTick > 0);
}
