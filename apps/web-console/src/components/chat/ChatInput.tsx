"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Chat input used by Conversation Workspace, New Task Composer and Existing
 * Task Workspace. The footer slot carries the model selector / agent identity
 * / skill button; submit fires on Enter (Shift+Enter = newline).
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  footer,
  disabled,
  disabledHint,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  footer: ReactNode;
  disabled?: boolean;
  disabledHint?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  return (
    <div className={cn("surface-elevated px-4 pb-3 pt-3", className)}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={disabled ? disabledHint : placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!disabled) onSubmit();
          }
        }}
        className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">{footer}</div>
        <button
          onClick={onSubmit}
          disabled={disabled || value.trim().length === 0}
          className="focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  );
}
