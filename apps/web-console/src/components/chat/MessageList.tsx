"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { ConversationMessage, TaskMessage } from "@/lib/types";

export type ChatMessage = Omit<ConversationMessage, "role" | "content" | "createdAt"> &
  Omit<TaskMessage, "role" | "content" | "createdAt"> & {
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
  };

/**
 * Shared chat stream for Conversation / Task. Task-only semantics:
 * - kind="tool-progress": compact, human-readable tool progress (§7.4 — full
 *   Tool Request / Result / Trace lives in the Inspector, not the chat flow)
 * - kind="run-status": lightweight Run lifecycle line
 */
export function MessageList({
  messages,
  emptyState,
  className,
}: {
  messages: ChatMessage[];
  emptyState?: React.ReactNode;
  className?: string;
}) {
  const hasMessages = messages.length > 0;
  return (
    <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6", className)}>
      {!hasMessages ? emptyState : null}
      {messages.map((m) => {
        if (m.role === "system" || m.kind === "tool-progress" || m.kind === "run-status") {
          const isRunStatus = m.kind === "run-status";
          return (
            <div
              key={m.id}
              className={cn(
                "text-xs",
                isRunStatus
                  ? "my-1 flex items-center gap-2 text-muted-foreground"
                  : "text-muted-foreground",
              )}
            >
              {isRunStatus ? <span className="h-px flex-1 bg-border" /> : null}
              <span className={cn(isRunStatus && "shrink-0 font-medium")}>{m.content}</span>
              {isRunStatus ? <span className="h-px flex-1 bg-border" /> : null}
            </div>
          );
        }
        const isUser = m.role === "user";
        return (
          <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
              <div
                className={cn(
                  "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-card text-foreground",
                )}
              >
                {m.content}
                {m.streaming ? (
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground/60 align-middle" />
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-muted-foreground/80">
                <span>{m.createdAt ? formatTime(m.createdAt) : ""}</span>
                {!isUser && m.meta?.model ? (
                  <span>
                    · {m.meta.model}
                    {m.meta.usage
                      ? ` · ${m.meta.usage.inputTokens}→${m.meta.usage.outputTokens} tokens`
                      : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Scroll container with per-tab restoration + follow-new-messages behavior.
 * scrollTop persists in the workspace store so switching tabs never loses
 * reading position (§5.2).
 */
export function ChatScrollArea({
  scrollKey,
  restoreScroll,
  onScrollChange,
  deps,
  children,
  className,
}: {
  scrollKey: string;
  restoreScroll: number;
  onScrollChange: (top: number) => void;
  /** re-run autoscroll when these values change */
  deps: unknown[];
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const lastDeps = useRef<unknown[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!restored.current) {
      el.scrollTop = restoreScroll;
      restored.current = true;
      return;
    }
    const prev = lastDeps.current;
    lastDeps.current = deps;
    // auto-follow only when content grew and user is near the bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    if (JSON.stringify(prev) !== JSON.stringify(deps) && nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div
      ref={ref}
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      data-scroll-key={scrollKey}
      onScroll={(e) => onScrollChange((e.target as HTMLDivElement).scrollTop)}
    >
      {children}
    </div>
  );
}
