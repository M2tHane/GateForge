"use client";

import { Fragment, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, FieldLabel, Input } from "@/components/ui/primitives";
import { Modal, SelectMenu } from "@/components/ui/overlay";
import { AdminCell, AdminRow, AdminTable, effectTone } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { toolDecisionLabel } from "@/lib/format";
import type { PolicyDecision, PolicyRule } from "@/lib/types";

type PolicyFormState = Omit<PolicyRule, "id">;

const emptyForm: PolicyFormState = {
  name: "",
  subject: "employee",
  action: "execute",
  tool: "*",
  effect: "REQUIRE_APPROVAL",
  enabled: true,
};

export default function AdminPoliciesPage() {
  const s = useWorkspaceStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PolicyFormState>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (rule: PolicyRule) => {
    const { id, ...rest } = rule;
    setEditingId(id);
    setForm(rest);
    setModalOpen(true);
  };

  const save = () => {
    const next = {
      ...form,
      name: form.name.trim(),
      subject: form.subject.trim(),
      action: form.action.trim(),
      tool: form.tool.trim(),
    };
    if (!next.name || !next.subject || !next.action || !next.tool) return;
    if (editingId) s.updatePolicy(editingId, next);
    else s.addPolicy(next);
    setModalOpen(false);
  };

  const invalid = !form.name.trim() || !form.subject.trim() || !form.action.trim() || !form.tool.trim();

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="策略"
        description="结构化工具策略 Mock；Stage 01 提供基础字段编辑"
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            新增策略
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <AdminTable columns={["名称", "主体", "动作", "工具", "效果", "操作"]}>
            {s.policies.map((rule) => (
              <Fragment key={rule.id}>
                <AdminRow>
                  <AdminCell className="font-medium text-foreground">
                    <span className="flex items-center gap-2">
                      {rule.name}
                      <Badge tone={rule.enabled ? "success" : "neutral"}>
                        {rule.enabled ? "已启用" : "已停用"}
                      </Badge>
                    </span>
                  </AdminCell>
                  <AdminCell mono>{rule.subject}</AdminCell>
                  <AdminCell mono>{rule.action}</AdminCell>
                  <AdminCell mono>{rule.tool}</AdminCell>
                  <AdminCell>
                    <Badge tone={effectTone(rule.effect)}>{toolDecisionLabel(rule.effect)}</Badge>
                  </AdminCell>
                  <AdminCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                      编辑
                    </Button>
                  </AdminCell>
                </AdminRow>
                <AdminRow>
                  <td colSpan={6} className="bg-muted/20 px-4 py-3">
                    <pre className="font-mono text-[11px] leading-5 text-muted-foreground">
                      {`WHEN Subject = ${rule.subject}
AND  Action = ${rule.action}
AND  Tool = ${rule.tool}
THEN ${rule.effect}`}
                    </pre>
                  </td>
                </AdminRow>
              </Fragment>
            ))}
          </AdminTable>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "编辑策略" : "新增策略"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" disabled={invalid} onClick={save}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>名称</FieldLabel>
            <Input
              value={form.name}
              placeholder="例如 高风险工具需审批"
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>主体</FieldLabel>
              <Input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>动作</FieldLabel>
              <Input
                value={form.action}
                onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <FieldLabel>工具</FieldLabel>
            <Input
              value={form.tool}
              placeholder="例如 github.push 或 *"
              onChange={(e) => setForm((prev) => ({ ...prev, tool: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>效果</FieldLabel>
              <SelectMenu
                value={form.effect}
                options={[
                  { value: "ALLOW", label: "允许" },
                  { value: "REQUIRE_APPROVAL", label: "需要审批" },
                  { value: "DENY", label: "拒绝" },
                ]}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, effect: value as PolicyDecision }))
                }
              />
            </div>
            <div>
              <FieldLabel>状态</FieldLabel>
              <SelectMenu
                value={form.enabled ? "ENABLED" : "DISABLED"}
                options={[
                  { value: "ENABLED", label: "已启用" },
                  { value: "DISABLED", label: "已停用" },
                ]}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, enabled: value === "ENABLED" }))
                }
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
