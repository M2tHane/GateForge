"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button, FieldLabel, Input } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { AdminCell, AdminRow, AdminTable } from "@/features/admin/shared";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export default function AdminSkillCategoriesPage() {
  const s = useWorkspaceStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const categories = [...s.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const skillCountOf = (categoryId: string) =>
    Object.values(s.skills).filter((skill) => skill.categoryId === categoryId).length;

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const category = s.categories.find((item) => item.id === id);
    if (!category) return;
    setEditingId(id);
    setName(category.name);
    setModalOpen(true);
  };

  const save = () => {
    const nextName = name.trim();
    if (!nextName) return;
    if (editingId) s.updateSkillCategory(editingId, { name: nextName });
    else s.addSkillCategory(nextName);
    setModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="技能分类"
        description="维护分类名称与展示顺序；Stage 01 修改仅保存在本地 Mock"
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            新增分类
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <AdminTable columns={["分类", "排序", "关联技能数量", "操作"]}>
            {categories.map((cat, index) => (
              <AdminRow key={cat.id}>
                <AdminCell className="font-medium text-foreground">{cat.name}</AdminCell>
                <AdminCell>{cat.sortOrder}</AdminCell>
                <AdminCell>{skillCountOf(cat.id)}</AdminCell>
                <AdminCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      aria-label={`上移 ${cat.name}`}
                      onClick={() => s.moveSkillCategory(cat.id, "up")}
                    >
                      <ChevronUp size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === categories.length - 1}
                      aria-label={`下移 ${cat.name}`}
                      onClick={() => s.moveSkillCategory(cat.id, "down")}
                    >
                      <ChevronDown size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cat.id)}>
                      编辑
                    </Button>
                  </div>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "编辑技能分类" : "新增技能分类"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" disabled={!name.trim()} onClick={save}>
              保存
            </Button>
          </>
        }
      >
        <div>
          <FieldLabel>分类名称</FieldLabel>
          <Input value={name} placeholder="例如 数据分析" onChange={(e) => setName(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
