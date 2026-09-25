import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="surface flex w-full max-w-xl flex-col items-center gap-4 p-10 text-center">
        <div className="text-2xl font-semibold text-foreground">GateForge</div>
        <p className="text-sm text-muted-foreground">
          工程基础已就绪（Stage 00）。Employee Workspace 原型将在 Stage 01 实现：
          新建会话、新建任务、Agents、Skills。
        </p>
        <Link
          href="/agents"
          className="focus-ring inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          查看 Agents（占位）
        </Link>
      </div>
    </main>
  );
}
