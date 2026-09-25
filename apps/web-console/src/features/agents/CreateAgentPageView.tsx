"use client";

/**
 * Create Agent（DESIGN.md §10）：两张选择卡 —— 从模板创建 / 自定义 Agent。
 * 自定义走 createBlankAgentDraft() 后直接进入 Agent Editor。
 */
import { Blocks, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function CreateAgentPageView() {
  const router = useRouter();

  function createBlank() {
    const { agentId } = useWorkspaceStore.getState().createBlankAgentDraft();
    router.push(`/agents/${agentId}/edit`);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="创建 Agent" description="从平台 / 团队模板开始，或从空白自定义" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-2xl gap-4 px-6 py-10 sm:grid-cols-2">
          <Card
            interactive
            onClick={() => router.push("/agents/new/templates")}
            className="flex flex-col gap-2 p-6"
          >
            <Blocks size={20} className="text-primary" />
            <div className="text-sm font-semibold text-foreground">从模板创建</div>
            <div className="text-xs leading-relaxed text-muted-foreground">
              平台 / 团队模板。Clone 为快照复制并进入编辑器，可再调整配置后发布。
            </div>
          </Card>
          <Card interactive onClick={createBlank} className="flex flex-col gap-2 p-6">
            <SquarePen size={20} className="text-primary" />
            <div className="text-sm font-semibold text-foreground">自定义 Agent</div>
            <div className="text-xs leading-relaxed text-muted-foreground">
              从空白开始，自行配置 Engine / Model / Skills / Tools。
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
