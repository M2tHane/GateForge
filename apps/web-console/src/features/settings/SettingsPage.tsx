"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

/** Settings（More 入口）：演示用会话设置 + 管理员视角切换说明。 */
export function SettingsPage() {
  const viewAsAdmin = useWorkspaceStore((s) => s.viewAsAdmin);
  const setViewAsAdmin = useWorkspaceStore((s) => s.setViewAsAdmin);
  const currentUser = useWorkspaceStore((s) => s.currentUser);
  const tabs = useWorkspaceStore((s) => s.tabs);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="More / Settings" description="演示设置（Stage 01 Mock）" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <Card>
            <div className="text-sm font-medium text-foreground">当前会话</div>
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <div>
                用户：{currentUser.name} · 角色 Badge：<Badge tone="info">EMPLOYEE</Badge>
              </div>
              <div>打开的工作区 Tab：{tabs.length} 个（Tab 状态保存在本地，刷新后恢复）</div>
              <div>数据：本地 Mock（无真实后端 / 无真实模型调用）</div>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-medium text-foreground">管理员视角</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Workspace Admin 登录时，左侧导航底部会额外出现 Administration 分组
              （Models / Tools / Skill Categories / Policies / Approvals / Teams / Audit）。
              普通员工不可见——治理入口不挤占员工日常导航。
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={viewAsAdmin}
                onChange={(e) => setViewAsAdmin(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              以 Workspace Admin 视角查看（演示 Administration 骨架）
            </label>
          </Card>

          <Card>
            <div className="text-sm font-medium text-foreground">关于这个原型</div>
            <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <div>· Conversation 不绑定 Agent、不产生 Run；/skill 绑定 exact SkillVersion。</div>
              <div>· Task 创建后固定 agentId + exact agentVersionId，不可切换；每条新指令 → 新 Run；批准恢复 → 同一 Run。</div>
              <div>· Agent / Skill Clone 均为快照复制（Snapshot Copy），源更新不影响克隆。</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
