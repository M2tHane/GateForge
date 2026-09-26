"use client";

import { MessageSquarePlus, SquareCheckBig } from "lucide-react";
import { useWorkspaceNav } from "@/components/shell/nav";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { Avatar } from "@/components/ui/primitives";

/** Employee Workspace 首屏：第一眼是「新建会话 / 新建任务」（设计原则 §2.1）。 */
export default function HomePage() {
  const nav = useWorkspaceNav();
  // 渲染契约：整店订阅（mock 嵌套原地变更，窄 selector 不触发重渲染）
  const store = useWorkspaceStore();
  const tasks = store.tasks;
  const agents = store.agents;
  const conversations = store.conversations;

  const recentTasks = Object.values(tasks)
    .filter((t) => t.persisted)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 3);
  const recentConvs = Object.values(conversations)
    .filter((c) => c.persisted)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 3);

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-container mx-auto flex max-w-3xl flex-col items-center pt-20">
        <h1 className="text-xl font-semibold text-foreground">你好，陈曦</h1>
        <p className="mt-1 text-sm text-muted-foreground">你的日常 AI 工作空间</p>

        <div className="mt-8 grid w-full grid-cols-2 gap-4">
          <button
            onClick={() => nav.newConversation()}
            className="surface focus-ring flex flex-col items-start gap-2 p-5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <MessageSquarePlus size={20} className="text-primary" />
            <span className="text-sm font-medium text-foreground">新建会话</span>
            <span className="text-xs text-muted-foreground">选模型、添加技能，随问随答</span>
          </button>
          <button
            onClick={() => nav.newTask()}
            className="surface focus-ring flex flex-col items-start gap-2 p-5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <SquareCheckBig size={20} className="text-primary" />
            <span className="text-sm font-medium text-foreground">新建任务</span>
            <span className="text-xs text-muted-foreground">选择一个 Agent，交给它持续完成</span>
          </button>
        </div>

        {(recentTasks.length > 0 || recentConvs.length > 0) && (
          <div className="mt-10 w-full">
            <div className="mb-3 text-xs font-medium text-muted-foreground">最近打开</div>
            <div className="flex flex-col gap-1.5">
              {recentTasks.map((task) => {
                const agent = agents[task.agentId];
                return (
                  <button
                    key={task.id}
                    onClick={() => nav.openTask(task.id)}
                    className="surface focus-ring flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/30"
                  >
                    {agent ? <Avatar emoji={agent.avatarEmoji} color={agent.avatarColor} /> : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-foreground">{task.title}</span>
                      <span className="text-[11px] text-muted-foreground">任务 · {agent?.name}</span>
                    </span>
                  </button>
                );
              })}
              {recentConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => nav.openConversation(conv.id)}
                  className="surface focus-ring flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/30"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs">
                    💬
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{conv.title}</span>
                    <span className="text-[11px] text-muted-foreground">会话</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
