"use client";

/**
 * 工具（DESIGN.md §16 / §21）：二级 Tabs（工具注册表 / MCP 服务）骨架。
 * Tool 行点击开 Drawer 展示描述与 exact toolVersionId；
 * MCP Server 凭据只展示已配置 / 未配置，永不回显明文。
 */
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/primitives";
import { Drawer, Tabs } from "@/components/ui/overlay";
import {
  AdminCell,
  AdminRow,
  AdminTable,
  DetailRow,
  providerTone,
  riskTone,
} from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { providerNameLabel, riskLevelLabel, formatDate, formatTime } from "@/lib/format";
import type { Tool } from "@/lib/types";

type AdminToolsTab = "registry" | "mcp";

export default function AdminToolsPage() {
  const s = useWorkspaceStore();
  const [tab, setTab] = useState<AdminToolsTab>("registry");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const selected: Tool | undefined = selectedName
    ? s.tools.find((t) => t.name === selectedName)
    : undefined;
  const selectedVersion = selected?.versions.at(-1);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="工具" description="工具注册表与 MCP 服务管理" />
      <Tabs
        className="px-7"
        tabs={[
          { id: "registry", label: "工具注册表" },
          { id: "mcp", label: "MCP 服务" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as AdminToolsTab)}
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-5xl">
          {tab === "registry" ? (
            <AdminTable columns={["名称", "服务商", "风险等级", "版本", "状态"]}>
              {s.tools.map((tool) => {
                const version = tool.versions.at(-1);
                return (
                  <AdminRow key={tool.id} onClick={() => setSelectedName(tool.name)}>
                    <AdminCell mono className="font-medium text-foreground">
                      {tool.name}
                    </AdminCell>
                    <AdminCell>
                      <Badge tone={providerTone(tool.provider)}>{providerNameLabel(tool.provider)}</Badge>
                    </AdminCell>
                    <AdminCell>
                      <Badge tone={riskTone(tool.riskLevel)}>{riskLevelLabel(tool.riskLevel)}</Badge>
                    </AdminCell>
                    <AdminCell mono>{version?.version ?? "—"}</AdminCell>
                    <AdminCell>
                      {version?.status === "ACTIVE" ? (
                        <Badge tone="success">已启用</Badge>
                      ) : (
                        <Badge>已停用</Badge>
                      )}
                    </AdminCell>
                  </AdminRow>
                );
              })}
            </AdminTable>
          ) : (
            <AdminTable
              columns={[
                "名称",
                "传输",
                "状态",
                "工具数量",
                "最近同步",
                "凭据状态",
              ]}
            >
              {s.mcpServers.map((server) => (
                <AdminRow key={server.id}>
                  <AdminCell mono className="font-medium text-foreground">
                    {server.name}
                  </AdminCell>
                  <AdminCell>{server.transport}</AdminCell>
                  <AdminCell>
                    {server.status === "CONNECTED" ? (
                      <Badge tone="success">已连接</Badge>
                    ) : (
                      <Badge>已停用</Badge>
                    )}
                  </AdminCell>
                  <AdminCell>{server.toolCount}</AdminCell>
                  <AdminCell className="text-muted-foreground">
                    {formatDate(server.lastSyncAt)} {formatTime(server.lastSyncAt)}
                  </AdminCell>
                  <AdminCell>
                    {server.credentialStatus === "CONFIGURED" ? (
                      <Badge tone="success">已配置</Badge>
                    ) : (
                      <Badge tone="warning">未配置</Badge>
                    )}
                  </AdminCell>
                </AdminRow>
              ))}
            </AdminTable>
          )}
        </div>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedName(null)}
        title={<span className="font-mono">{selected?.name}</span>}
        subtitle={selected ? `${providerNameLabel(selected.provider)} · 风险等级 ${riskLevelLabel(selected.riskLevel)}` : undefined}
      >
        {selected ? (
          <div className="h-full overflow-y-auto px-5 py-4">
            <div className="space-y-2.5 rounded-xl border border-border p-3.5">
              <DetailRow label="描述">{selected.description}</DetailRow>
              <DetailRow label="服务商">
                <Badge tone={providerTone(selected.provider)}>{providerNameLabel(selected.provider)}</Badge>
                {selected.mcpServerName ? (
                  <span className="ml-2 text-muted-foreground">MCP 服务：{selected.mcpServerName}</span>
                ) : null}
              </DetailRow>
              <DetailRow label="风险等级">
                <Badge tone={riskTone(selected.riskLevel)}>{riskLevelLabel(selected.riskLevel)}</Badge>
              </DetailRow>
              <DetailRow label="版本">
                {selectedVersion ? `${selectedVersion.version} · ${selectedVersion.status}` : "—"}
              </DetailRow>
              <DetailRow label="Tool Version ID">
                <span className="font-mono">{selectedVersion?.id ?? "—"}</span>
                <span className="ml-1.5 text-muted-foreground">（exact，Agent 绑定依据）</span>
              </DetailRow>
              <DetailRow label="发布时间">
                {selectedVersion
                  ? `${formatDate(selectedVersion.publishedAt)} ${formatTime(selectedVersion.publishedAt)}`
                  : "—"}
              </DetailRow>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
