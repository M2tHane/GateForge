"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

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
  };
}
