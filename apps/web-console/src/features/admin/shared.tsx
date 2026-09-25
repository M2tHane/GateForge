"use client";

/**
 * Administration 骨架页共用小组件（DESIGN.md §16 / §17 Table）：
 * 语义化表头、~44px 行高、状态用 Badge、行 hover 背景。
 */
import type { ReactNode } from "react";
import { type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function AdminTable({
  columns,
  children,
  className,
}: {
  columns: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface overflow-hidden", className)}>
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            {columns.map((col) => (
              <th key={col} scope="col" className="px-4 py-2.5 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminRow({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border/60 transition-colors last:border-b-0",
        onClick ? "cursor-pointer hover:bg-accent/30" : undefined,
      )}
    >
      {children}
    </tr>
  );
}

export function AdminCell({
  mono,
  className,
  children,
}: {
  mono?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <td className={cn("h-11 px-4 align-middle", mono && "font-mono", className)}>{children}</td>
  );
}

/** Drawer 详情行：左 label 右值。 */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-foreground">{children}</span>
    </div>
  );
}

export function riskTone(risk: string): BadgeTone {
  return risk === "HIGH" ? "danger" : risk === "MEDIUM" ? "warning" : "neutral";
}

export function providerTone(provider: string): BadgeTone {
  return provider === "MCP" ? "info" : provider === "HTTP" ? "accent" : "neutral";
}

export function effectTone(effect: string): BadgeTone {
  return effect === "ALLOW" ? "success" : effect === "DENY" ? "danger" : "warning";
}
