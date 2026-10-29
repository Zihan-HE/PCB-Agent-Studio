import type { Metadata } from "next";
import { PicWorkbench } from "@/components/demo/pic-workbench";
import "./pic.css";
import "./engineering.css";

export const metadata: Metadata = {
  title: "AI辅助PIC设计和验证展示",
  description: "从一句设计需求走到光子版图：真实 GDS 案例、分层预览与可下载设计产物。",
};

export default function PicPage() {
  return <PicWorkbench />;
}
