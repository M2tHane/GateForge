"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-accent",
        variant === "outline" && "border border-border bg-card text-foreground hover:bg-accent",
        variant === "ghost" && "text-muted-foreground hover:bg-accent hover:text-foreground",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className,
      )}
      {...props}
    />
  );
}

// ---------- Badge ----------

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success/12 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "info" && "bg-primary/10 text-primary",
        tone === "accent" && "bg-accent text-accent-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone }: { tone: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <span
      className={cn(
        "status-dot inline-block",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-destructive",
        tone === "neutral" && "text-muted-foreground",
      )}
    />
  );
}

// ---------- Card ----------

export function Card({
  className,
  children,
  onClick,
  interactive,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  interactive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "surface p-4",
        interactive && "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/20 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------- Avatar ----------

export function Avatar({
  emoji,
  color,
  size = "md",
  className,
}: {
  emoji: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-black/5",
        size === "xs" && "h-[18px] w-[18px] text-[10px]",
        size === "sm" && "h-5 w-5 text-[11px]",
        size === "md" && "h-7 w-7 text-sm",
        size === "lg" && "h-12 w-12 text-2xl",
        className,
      )}
      style={{ backgroundColor: `${color}22` }}
    >
      {emoji}
    </span>
  );
}

// ---------- Chip（Agent / Skill 统一 chip 语言；可移除 × 仅限尚未固化的选择） ----------

export function Chip({
  icon,
  label,
  onRemove,
  removeLabel,
  title,
  className,
}: {
  /** 可选前缀图标（如 Agent Avatar） */
  icon?: ReactNode;
  label: string;
  /** 传入则渲染尾部 ×；Task 已固化的 Agent 不传（不可取消 / 切换） */
  onRemove?: () => void;
  removeLabel?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-2.5 pr-2 text-xs text-foreground",
        className,
      )}
    >
      {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `移除 ${label}`}
          title={removeLabel ?? `移除 ${label}`}
          className="ml-0.5 shrink-0 rounded-full text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

// ---------- Empty state ----------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon ? <div className="text-muted-foreground/60">{icon}</div> : null}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description ? <div className="max-w-sm text-xs text-muted-foreground">{description}</div> : null}
      {action}
    </div>
  );
}

// ---------- Form controls ----------

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70",
        className,
      )}
      {...props}
    />
  );
}

// 注：本项目不提供原生 <select> 包装（DESIGN.md §21）——所有用户可见选择框
// 一律使用 overlay.tsx 的 SelectMenu / Dropdown 自绘组件。

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label className="text-xs font-medium text-foreground">{children}</label>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
