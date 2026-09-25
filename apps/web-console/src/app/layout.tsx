import type { Metadata } from "next";
import "./globals.css";

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
      <body className="app-shell antialiased">{children}</body>
    </html>
  );
}
