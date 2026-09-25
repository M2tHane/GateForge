"use client";

/** Stage 01 各页面的公共骨架：页面头 + 内容区。 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-7 py-4">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PagePlaceholder({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={title} />
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-xs text-muted-foreground">
          {hint ?? "页面建设中（Stage 01）"}
        </div>
      </div>
    </div>
  );
}
