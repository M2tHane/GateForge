import { AdminShell } from "@/components/shell/AdminShell";

/** Administration Shell：独立的治理侧边栏（DESIGN.md §5.4），无 Tab Bar / History。 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
