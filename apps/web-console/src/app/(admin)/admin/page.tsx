import { redirect } from "next/navigation";

/** /admin 没有独立首页：管理员入口直接落在默认管理页 Models。 */
export default function AdminIndexPage() {
  redirect("/admin/models");
}
