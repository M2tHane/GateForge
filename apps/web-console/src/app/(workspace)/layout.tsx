import { WorkspaceShell } from "@/components/shell/WorkspaceShell";

/** Employee Workspace Shell：左侧导航 + Tab Bar（DESIGN.md §5）。 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
