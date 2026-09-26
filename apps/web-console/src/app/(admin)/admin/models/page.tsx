"use client";

import { useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge, Button, FieldLabel, Input } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { AdminCell, AdminRow, AdminTable } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

interface ModelFormState {
  label: string;
  provider: string;
  model: string;
}

const emptyForm: ModelFormState = { label: "", provider: "", model: "" };

export default function AdminModelsPage() {
  const s = useWorkspaceStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ModelFormState>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const model = s.modelCandidates.find((item) => item.id === id);
    if (!model) return;
    setEditingId(id);
    setForm({ label: model.label, provider: model.provider, model: model.model });
    setModalOpen(true);
  };

  const save = () => {
    const next = {
      label: form.label.trim(),
      provider: form.provider.trim(),
      model: form.model.trim(),
    };
    if (!next.label || !next.provider || !next.model) return;
    if (editingId) s.updateModelCandidate(editingId, next);
    else s.addModelCandidate(next);
    setModalOpen(false);
  };

  const invalid = !form.label.trim() || !form.provider.trim() || !form.model.trim();

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="模型"
        description="模型目录与员工可用候选；Stage 01 修改仅保存在本地 Mock"
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            新增模型
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <AdminTable columns={["展示名", "服务商", "模型", "Model Policy ID", "操作"]}>
            {s.modelCandidates.map((m) => (
              <AdminRow key={m.id}>
                <AdminCell className="font-medium text-foreground">{m.label}</AdminCell>
                <AdminCell>{m.provider}</AdminCell>
                <AdminCell mono>{m.model}</AdminCell>
                <AdminCell mono className="text-muted-foreground">
                  {m.id}
                </AdminCell>
                <AdminCell>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m.id)}>
                    编辑
                  </Button>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed">
            <KeyRound size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="text-muted-foreground">
              Provider Credentials 由 Secret Management 管理，响应永不回显明文；凭据状态仅展示{" "}
              <Badge>未配置</Badge> / <Badge tone="success">已配置</Badge>。
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "编辑模型候选" : "新增模型候选"}
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
            <FieldLabel>展示名</FieldLabel>
            <Input
              value={form.label}
              placeholder="例如 GPT-5.6 Sol"
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>服务商</FieldLabel>
            <Input
              value={form.provider}
              placeholder="例如 OpenAI"
              onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>模型标识</FieldLabel>
            <Input
              value={form.model}
              placeholder="例如 gpt-5.6-sol"
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
