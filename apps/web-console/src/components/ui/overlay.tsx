"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Drawer（Skill Picker / 详情 / 审批等大型侧边面板） ----------

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 560,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  width?: number;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />
      <div
        className="absolute inset-y-0 right-0 flex flex-col border-l border-border bg-card shadow-md"
        style={{ width: `min(${width}px, 92vw)` }}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
          <button
            onClick={onClose}
            className="focus-ring rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

// ---------- Modal（删除确认 / Publish 最终确认 / 短表单） ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />
      <div className="surface-elevated relative z-10 w-full max-w-md">
        <div className="border-b border-border px-5 py-4 text-sm font-semibold text-foreground">{title}</div>
        <div className="px-5 py-4 text-sm text-foreground">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

// ---------- Dropdown（··· 菜单 / Selector 下拉） ----------

export function Dropdown({
  trigger,
  children,
  align = "start",
  className,
}: {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open ? (
        <div
          className={cn(
            "surface-elevated absolute z-40 mt-1.5 min-w-44 rounded-lg p-1",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({
  onClick,
  danger,
  disabled,
  children,
}: {
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

// ---------- SelectMenu（统一自绘下拉选择；禁用浏览器原生 <select> 外观） ----------

export interface SelectOption {
  value: string;
  label: ReactNode;
}

export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = "请选择",
  className,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** 挂在面板上的定位 / 尺寸类 */
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Dropdown
      className={className}
      trigger={
        <button
          type="button"
          className="focus-ring flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors hover:bg-accent"
        >
          <span className="min-w-0 truncate">
            {current?.label ?? <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
        </button>
      }
    >
      {(close) => (
        <>
          {options.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-muted-foreground">暂无可选项</div>
          ) : (
            options.map((o) => (
              <DropdownItem
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>{o.label}</span>
                  {o.value === value ? <Check size={12} className="text-primary" /> : null}
                </span>
              </DropdownItem>
            ))
          )}
        </>
      )}
    </Dropdown>
  );
}

// ---------- Tabs（页面级 Tabs；与 Workspace Tab Bar 语义不同，不复用样式） ----------

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "focus-ring -mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
            active === t.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
