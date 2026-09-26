"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { User } from "@/lib/types";

/** Admin 默认落地页（不新增 Admin Dashboard，直接进 Models）。 */
export const ADMIN_HOME_PATH = "/admin/models";

/**
 * MVP 管理能力判定：真实角色为 WORKSPACE_ADMIN，或 mock 的 Admin 视角开关
 * （Stage 01 以 viewAsAdmin 模拟管理员用户，见 DESIGN.md §5.4）。
 */
export function hasAdminCapability(user: User, viewAsAdmin: boolean): boolean {
  return viewAsAdmin || user.role === "WORKSPACE_ADMIN";
}

/**
 * Navigation glue: every open/switch goes through the store (so tabs stay in
 * sync) and then router.push (so URL reflects the active tab). Switching tabs
 * never remounts state — messages / drafts / scroll live in the store (§5.2).
 */
export function useWorkspaceNav() {
  const router = useRouter();

  return {
    newConversation() {
      const id = useWorkspaceStore.getState().createDraftConversation();
      router.push(`/conversation/${id}`);
    },
    newTask(agentId?: string) {
      useWorkspaceStore.getState().openComposerTab(agentId);
      router.push("/task/new");
    },
    openConversation(convId: string) {
      useWorkspaceStore.getState().openConversationTab(convId);
      router.push(`/conversation/${convId}`);
    },
    openTask(taskId: string) {
      useWorkspaceStore.getState().openTaskTab(taskId);
      router.push(`/task/${taskId}`);
    },
    go(path: string) {
      router.push(path);
    },
    admin() {
      router.push(ADMIN_HOME_PATH);
    },
  };
}
