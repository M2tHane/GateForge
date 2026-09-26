"use client";

import { FileDiff, GitCompareArrows } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

type DiffLine = {
  kind: "context" | "add" | "remove";
  text: string;
  oldNo?: number;
  newNo?: number;
};

function buildUnifiedDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      lines.push({ kind: "context", text: a[i], oldNo, newNo });
      i += 1;
      j += 1;
      oldNo += 1;
      newNo += 1;
    } else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      lines.push({ kind: "add", text: b[j], newNo });
      j += 1;
      newNo += 1;
    } else if (i < a.length) {
      lines.push({ kind: "remove", text: a[i], oldNo });
      i += 1;
      oldNo += 1;
    }
  }
  return lines;
}

export default function FileDiffPage() {
  const params = useSearchParams();
  const store = useWorkspaceStore();
  const taskId = params.get("taskId") ?? "";
  const runId = params.get("runId") ?? "";
  const path = params.get("path") ?? "";
  const task = store.tasks[taskId];
  const run = task?.runs.find((item) => item.id === runId);
  const file = run?.files.find((item) => item.path === path);

  if (!file) {
    return <EmptyState icon={<FileDiff size={30} />} title="未找到文件变化" description="该运行中没有对应的 Mock 文件变更记录。" />;
  }

  const lines = buildUnifiedDiff(file.before, file.after);

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      <header className="flex min-h-14 items-center gap-3 border-b border-border bg-card/90 px-5 backdrop-blur">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GitCompareArrows size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px] font-medium text-foreground">{file.path}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">运行 #{run?.index} · 统一 Diff</div>
        </div>
        <Badge tone={file.change === "created" ? "success" : "info"}>{file.change === "created" ? "新建" : "修改"}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{file.diffSummary}</span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="mx-auto min-w-[720px] max-w-6xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-[52px_52px_28px_minmax(0,1fr)] border-b border-border bg-muted/40 px-0 py-2 font-mono text-[11px] text-muted-foreground">
            <span className="text-center">旧</span>
            <span className="text-center">新</span>
            <span />
            <span className="px-3">代码变化</span>
          </div>
          <div className="font-mono text-[12px] leading-6">
            {lines.map((line, index) => (
              <div
                key={`${line.kind}-${index}`}
                className={cn(
                  "grid grid-cols-[52px_52px_28px_minmax(0,1fr)] border-b border-border/45 last:border-b-0",
                  line.kind === "add" && "bg-emerald-500/10",
                  line.kind === "remove" && "bg-red-500/10",
                )}
              >
                <span className="select-none border-r border-border/50 px-2 text-right text-muted-foreground/60">{line.oldNo ?? ""}</span>
                <span className="select-none border-r border-border/50 px-2 text-right text-muted-foreground/60">{line.newNo ?? ""}</span>
                <span className={cn("select-none text-center", line.kind === "add" && "text-emerald-600", line.kind === "remove" && "text-red-500")}>
                  {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : ""}
                </span>
                <pre className="min-w-0 overflow-visible whitespace-pre px-3 text-foreground">{line.text || " "}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
