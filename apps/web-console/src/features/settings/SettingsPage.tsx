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
      <PageHeader title="更多 / 设置" description="演示设置（Stage 01 Mock）" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <Card>
            <div className="text-sm font-medium text-foreground">当前会话</div>
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <div>
                用户：{currentUser.name} · 角色：<Badge tone="info">员工</Badge>
              </div>
              <div>打开的工作区 Tab：{tabs.length} 个（Tab 状态保存在本地，刷新后恢复）</div>
              <div>数据：本地 Mock（无真实后端 / 无真实模型调用）</div>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-medium text-foreground">管理员视角</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              具备管理能力时，左侧导航会出现「管理员」入口，点击进入独立的
              Administration Shell（模型 / 工具与 MCP 服务 / 技能分类 / 策略 / 审批 / 团队 / 审计）。
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
              <div>· 会话不绑定 Agent、不产生运行；「技能」按钮绑定 exact SkillVersion。</div>
              <div>· 任务创建后固定 agentId + exact agentVersionId，不可切换；每条新指令开始一次新运行；批准后恢复同一运行。</div>
              <div>· Agent / Skill 克隆均为快照复制（Snapshot Copy），源更新不影响克隆。</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
