import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/demo/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CircuitMind · PCB 与 PIC 设计工作台",
  description: "PCB 设计意图解析与 PIC 光子设计展示：从自然语言需求到结构化任务和可查看的版图产物。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
