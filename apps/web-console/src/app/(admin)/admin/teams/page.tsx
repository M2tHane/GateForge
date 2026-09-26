"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button, FieldLabel, Input, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { AdminCell, AdminRow, AdminTable } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { TeamInfo } from "@/lib/types";

type TeamFormState = Omit<TeamInfo, "id">;

const emptyForm: TeamFormState = {
  name: "",
  description: "",
  memberCount: 0,
  teamAdmin: "",
};

export default function AdminTeamsPage() {
  const s = useWorkspaceStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TeamFormState>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (team: TeamInfo) => {
    const { id, ...rest } = team;
    setEditingId(id);
    setForm(rest);
    setModalOpen(true);
  };

  const save = () => {
    const next = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      teamAdmin: form.teamAdmin.trim(),
      memberCount: Math.max(0, Math.floor(form.memberCount || 0)),
    };
    if (!next.name || !next.teamAdmin) return;
    if (editingId) s.updateTeam(editingId, next);
    else s.addTeam(next);
    setModalOpen(false);
  };

  const invalid = !form.name.trim() || !form.teamAdmin.trim();

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="团队"
        description="团队基础信息 Mock；Stage 01 修改仅保存在本地"
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            新增团队
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <AdminTable columns={["名称", "描述", "成员数", "团队管理员", "操作"]}>
            {s.teams.map((team) => (
              <AdminRow key={team.id}>
                <AdminCell className="font-medium text-foreground">{team.name}</AdminCell>
                <AdminCell className="text-muted-foreground">{team.description}</AdminCell>
                <AdminCell>{team.memberCount}</AdminCell>
                <AdminCell>{team.teamAdmin}</AdminCell>
                <AdminCell>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(team)}>
                    编辑
                  </Button>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "编辑团队" : "新增团队"}
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
            <FieldLabel>团队名称</FieldLabel>
            <Input
              value={form.name}
              placeholder="例如 支付平台"
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>描述</FieldLabel>
            <Textarea
              rows={3}
              value={form.description}
              placeholder="团队职责或业务范围"
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>成员数</FieldLabel>
              <Input
                type="number"
                min={0}
                value={form.memberCount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, memberCount: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <FieldLabel>团队管理员</FieldLabel>
              <Input
                value={form.teamAdmin}
                placeholder="例如 陈晨"
                onChange={(e) => setForm((prev) => ({ ...prev, teamAdmin: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
