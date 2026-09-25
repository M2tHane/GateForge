import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";

export const metadata: Metadata = {
  title: "GateForge — Employee Workspace",
  description:
    "GateForge Employee Workspace：日常 AI 工作空间（Conversation / Task / Agents / Skills）",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="app-shell antialiased">
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}
