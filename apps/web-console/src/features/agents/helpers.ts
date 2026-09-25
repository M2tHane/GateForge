/**
 * Agents feature helpers（§9–§12）。纯函数，数据由调用方从 workspace store 取。
 *
 * 绑定语义提醒：Agent manifest 绑定的是 exact SkillVersion / ToolVersion id，
 * name 字段仅用于展示；解析时一律以 versionId 为准（P7 / P17）。
 */
import type { BadgeTone } from "@/components/ui/primitives";
import type { Agent, ModelCandidate, Skill, Tool, ToolRiskLevel, VersionStatus } from "@/lib/types";

/** 按 exact SkillVersion id 反查 Skill 与对应版本（跨所有 Skill）。 */
export function skillByVersionId(
  skills: Record<string, Skill>,
  versionId: string,
): { skill: Skill; version: Skill["versions"][number] } | undefined {
  for (const skill of Object.values(skills)) {
    const version = skill.versions.find((v) => v.id === versionId);
    if (version) return { skill, version };
  }
  return undefined;
}

/** 按 exact ToolVersion id 反查 Tool 与对应版本。 */
export function toolByVersionId(
  tools: Tool[],
  versionId: string,
): { tool: Tool; version: Tool["versions"][number] } | undefined {
  for (const tool of tools) {
    const version = tool.versions.find((v) => v.id === versionId);
    if (version) return { tool, version };
  }
  return undefined;
}

/** Model 候选（GET /api/me/model-candidates 的 mock）的展示名。 */
export function modelLabel(candidates: ModelCandidate[], modelPolicyId: string): string {
  const found = candidates.find((c) => c.id === modelPolicyId);
  return found ? found.label : modelPolicyId;
}

/** Tool 风险等级中文文案（§18：使用明确状态）。 */
export function riskLabel(level: ToolRiskLevel): string {
  switch (level) {
    case "LOW":
      return "低";
    case "MEDIUM":
      return "中";
    case "HIGH":
      return "高";
  }
}

export function riskTone(level: ToolRiskLevel): BadgeTone {
  switch (level) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "warning";
    case "HIGH":
      return "danger";
  }
}

export function providerLabel(provider: Tool["provider"]): string {
  switch (provider) {
    case "BUILTIN":
      return "内置";
    case "MCP":
      return "MCP";
    case "HTTP":
      return "HTTP";
  }
}

export function versionStatusTone(status: VersionStatus): BadgeTone {
  switch (status) {
    case "DRAFT":
      return "warning";
    case "PUBLISHED":
      return "success";
    case "DEPRECATED":
      return "neutral";
  }
}

/**
 * 下一个发布版本号（与 store publishAgentDraft 的计算保持一致，仅用于展示；
 * 真正的版本号由 store 在 Publish 时生成）。
 */
export function nextVersionLabel(agent: Agent): string {
  const publishedCount = agent.versions.filter((v) => v.status !== "DRAFT").length;
  return `v${publishedCount + 1}.0.0`;
}

/** 由 sourceTemplateVersionId 反查来源模板名（P7/P8：快照克隆来源）。 */
export function templateNameFor(
  agents: Record<string, Agent>,
  sourceTemplateVersionId: string,
): string | undefined {
  for (const agent of Object.values(agents)) {
    if (agent.versions.some((v) => v.id === sourceTemplateVersionId)) return agent.name;
  }
  return undefined;
}

/** 已发布版本（可能不存在）。 */
export function publishedVersionOf(agent: Agent): Agent["versions"][number] | undefined {
  return agent.versions.find((v) => v.id === agent.publishedVersionId);
}

/** 草稿版本（可能不存在）。 */
export function draftVersionOf(agent: Agent): Agent["versions"][number] | undefined {
  return agent.versions.find((v) => v.id === agent.draftVersionId && v.status === "DRAFT");
}
