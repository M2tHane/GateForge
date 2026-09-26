import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GateForge — Employee Workspace",
  description:
    "GateForge Employee Workspace：日常 AI 工作空间（Conversation / Task / Agents / Skills）",
};

/** 根布局只负责 html/body；Employee Workspace 与 Administration 各自的 Shell 在 route group layout 中挂载。 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="app-shell antialiased">{children}</body>
    </html>
  );
}
