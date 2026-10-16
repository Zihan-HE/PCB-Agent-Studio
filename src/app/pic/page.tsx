import type { Metadata } from "next";
import { PicWorkbench } from "@/components/demo/pic-workbench";
import "./pic.css";

export const metadata: Metadata = {
  title: "CircuitMind · PIC 光子设计工作台",
  description: "从一句设计需求走到光子版图：真实 GDS 案例、分层预览与可下载设计产物。",
};

export default function PicPage() {
  return <PicWorkbench />;
}
