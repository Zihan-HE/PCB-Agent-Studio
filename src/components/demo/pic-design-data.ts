export const CASES = [
  {
    id: "ring", name: "单总线微环", code: "RING_01", tag: "Passive / Ring",
    prompt: "设计一个单总线微环，弯曲半径 10 μm、耦合间隙 0.2 μm，输出双端口 GDS 版图。",
    parameters: [["弯曲半径", "10 μm"], ["耦合间隙", "0.2 μm"], ["光端口", "2"]],
    notes: "本地圆形微环：中心线半径 10 μm，波导宽度 0.5 μm，耦合间隙 0.2 μm；输出 GDS 与预览几何一致。尚未验证 Q 值与消光比。",
    events: ["读取微环类型、半径与耦合间隙，标出器件范围。", "实例化弯曲波导，建立环形谐振器的主体几何。", "补齐直波导、总线与耦合段，形成完整光路。", "叠加 GDS 辅助层；检查图层与文件几何。", "显示完整微环版图，可查看各层并下载 GDS。"],
  },
  {
    id: "mzm", name: "MZM 调制器", code: "MZM_01", tag: "Active / Interferometer",
    prompt: "展示一个双臂马赫–曾德尔调制器，查看分合束器、移相段、连接波导及工艺图层，导出 GDS。",
    parameters: [["拓扑", "双臂 MZI"], ["移相单元", "straight_pin"], ["光端口", "2"]],
    notes: "作者 notebook 的本地参考回放，使用 generic_tech 的 straight_pin 移相段。这里只展示版图；未验证带宽和调制性能。",
    events: ["从 GDS 层级定位两个 MMI 和两段移相器。", "放置分合束器与双臂移相段，显示器件本体。", "加入欧拉弯与直波导，连接双臂干涉光路。", "叠加硅平板、通孔及金属相关图层。", "显示完整 MZM 版图，保留原始 GDS 交付文件。"],
  },
  {
    id: "qam", name: "8-QAM 光子电路", code: "QAM_08", tag: "Circuit / Multi-device",
    prompt: "展示 8-QAM 光子电路参考设计，依次查看 MZI 模块放置、MMI 分合束、波导互连和完整 GDS。",
    parameters: [["参考设计", "8-QAM"], ["MZI 模块", "3"], ["顶层 MMI", "4"]],
    notes: "作者 notebook 的本地参考回放。版图本身未验证星座、误码率或传输性能。",
    events: ["提取三个 MZI 模块与四个顶层 MMI 的实际位置。", "实例化各模块的光学器件，显示分合束和移相单元。", "逐段加入模块内及模块间的真实波导几何。", "叠加各移相单元的工艺图层。", "显示完整多模块电路，支持分层查看与 GDS 下载。"],
  },
] as const;

export const STAGES = [
  { name: "结构规划", english: "Floorplan", detail: "定位器件范围与层级" },
  { name: "器件放置", english: "Devices", detail: "实例化光学器件" },
  { name: "波导连接", english: "Routing", detail: "构建完整光路" },
  { name: "工艺图层", english: "Process layers", detail: "叠加辅助与工艺层" },
  { name: "版图交付", english: "GDS export", detail: "查看完整设计产物" },
] as const;

export type Geometry = {
  id: string; cell: string; bounds: [[number, number], [number, number]];
  layers: { id: string; polygons: number[][][]; construction: number[] }[];
  parts: { id: string; kind: string; cell: string; bounds: [[number, number], [number, number]] }[];
  unitMeters: number; polygonCount: number; bytes: number; sha256: string; provenance: string;
};

const LAYERS: Record<string, { color: string; name: string }> = {
  "1/0": { color: "#f07486", name: "WG · 硅波导" },
  "1/10": { color: "#8290aa", name: "辅助标记" },
  "3/0": { color: "#6e94da", name: "SLAB90" },
  "40/0": { color: "#d7bc5c", name: "VIAC" },
  "41/0": { color: "#b7cc69", name: "M1" },
  "43/0": { color: "#71b7ce", name: "VIA2" },
  "44/0": { color: "#b892d6", name: "VIA1" },
  "45/0": { color: "#db975d", name: "M2" },
  "49/0": { color: "#c0c5ce", name: "M3" },
};
export function layerStyle(id: string) { return LAYERS[id] ?? { color: "#a9b3c0", name: "Layer" }; }
export const assetPath = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
