import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/demo/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CircuitMind · PCB 设计意图智能",
  description: "将 PCB 工程指令编译为可审计的任务类型、目标对象、设计约束与决策优先级。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
