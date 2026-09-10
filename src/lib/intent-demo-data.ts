export type IntentPrediction = {
  taskCode: string;
  taskLabel: string;
  intent: string;
  component: string;
  pins: string[];
  nets: string[];
  constraintCodes: string[];
  constraints: string[];
  priorityCodes: string[];
  priorities: string[];
  reason: string;
  latencySeconds: number | null;
  attempts: number;
  schemaValid: boolean;
  corePassed: boolean;
  coreMetric: string;
};

export type IntentDemoSample = {
  id: string;
  shortLabel: string;
  title: string;
  question: string;
  questionType: string;
  source: string;
  difficulty: "简单" | "中等" | "困难";
  board: {
    id: string;
    component: string;
    package: string;
    pinCount: number | null;
    layerCount: number | null;
    signalLayers: number | null;
    traceWidth: string | null;
    clearance: string | null;
    evidence: string;
    variant: "repair" | "differential" | "conflict";
  };
  prediction: IntentPrediction;
};

export const BENCHMARK_METRICS = [
  { label: "核心准确率", value: "98%", detail: "98 / 100" },
  { label: "结构有效率", value: "100%", detail: "合法 JSON" },
  { label: "平均响应", value: "5.404s", detail: "P95 6.447s" },
  { label: "单题达标", value: "100%", detail: "全部 < 60s" },
] as const;

export const CATEGORY_METRICS = [
  { label: "意图判断", value: 96 },
  { label: "目标提取", value: 100 },
  { label: "约束理解", value: 100 },
  { label: "方案取舍", value: 96 },
] as const;

export const INTENT_DEMO_SAMPLES: IntentDemoSample[] = [
  {
    id: "DEMO_INTENT_001",
    shortLabel: "01 / 断点修复",
    title: "BGA 断点识别",
    question:
      "U1 的 H6 这根网现在还没接到 TP104.1。工程师让你先判断这条需求本质上属于哪类布线任务，不用给具体走线路径。请输出结构化 JSON。",
    questionType: "设计意图判断",
    source: "合成板级样本",
    difficulty: "简单",
    board: {
      id: "DEMO_BOARD_01",
      component: "U1",
      package: "109-pin BGA · 12 × 14",
      pinCount: 109,
      layerCount: 6,
      signalLayers: 4,
      traceWidth: "0.127 mm",
      clearance: "0.2032 mm",
      evidence: "U1.H6 → TP104.1 · 内圈 · 周边拥挤",
      variant: "repair",
    },
    prediction: {
      taskCode: "bga_pin_connection_repair",
      taskLabel: "BGA 管脚连接修复",
      intent: "识别某个 BGA pin / net 存在未完成连接，需要恢复目标网络连通的意图。",
      component: "U1",
      pins: ["H6"],
      nets: ["NET_U1_H6"],
      constraintCodes: [
        "same_net_connectivity",
        "connect_related_bga_pad",
        "avoid_unrelated_nets",
        "layer_or_via_strategy",
      ],
      constraints: ["同网连通", "连接目标 BGA 焊盘", "避免误连", "层选择与过孔策略"],
      priorityCodes: ["connectivity_first"],
      priorities: ["连通性优先"],
      reason: "题目明确要求先恢复目标网络连通，属于 BGA pin 连接修复任务。",
      latencySeconds: 4.486,
      attempts: 1,
      schemaValid: true,
      corePassed: true,
      coreMetric: "主要任务类型",
    },
  },
  {
    id: "DEMO_INTENT_039",
    shortLabel: "39 / 高速约束",
    title: "PCIe 约束理解",
    question:
      "如果这组 PCIE_TX0 高速线从 U2.M12 / U2.M13 出来后还要经过 C101 / C102，最该盯住哪些约束？请重点看成对对称、阻抗连续、参考平面、AC 耦合位置，以及别在电容附近留太多 stub。",
    questionType: "布线约束理解",
    source: "公开指南样本",
    difficulty: "中等",
    board: {
      id: "PUBLIC_GUIDE_PCIE_01",
      component: "U2",
      package: "676-pin BGA · PCIe TX0",
      pinCount: 676,
      layerCount: null,
      signalLayers: null,
      traceWidth: null,
      clearance: null,
      evidence: "公开高速设计指南 · C101 / C102 AC 耦合",
      variant: "differential",
    },
    prediction: {
      taskCode: "differential_pair_routing",
      taskLabel: "差分对布线",
      intent: "识别差分对布线意图，并解析经过 AC 耦合器件时必须满足的关键约束。",
      component: "U2",
      pins: ["M12", "M13"],
      nets: ["PCIE_TX0_P", "PCIE_TX0_N"],
      constraintCodes: [
        "pair_routing",
        "impedance_control",
        "length_matching",
        "spacing_or_crosstalk_control",
        "reference_plane_continuity",
        "ac_coupling_cap_placement",
      ],
      constraints: ["成对布线", "阻抗控制", "等长控制", "间距与串扰", "参考平面连续", "AC 耦合位置"],
      priorityCodes: ["signal_integrity_first", "minimize_via_count"],
      priorities: ["信号完整性优先", "减少过孔"],
      reason:
        "题目明确要求关注差分对布线、阻抗控制、等长、间距、参考平面和 AC 耦合位置，同时考虑减少过孔。",
      latencySeconds: 5.092,
      attempts: 1,
      schemaValid: true,
      corePassed: true,
      coreMetric: "约束标签 F1",
    },
  },
  {
    id: "DEMO_INTENT_080",
    shortLabel: "80 / 冲突取舍",
    title: "参考平面冲突判断",
    question:
      "如果最短路径会让 PCIE_RX1 这组线跨过参考平面分割，而绕开分割区又会多一些长度或过孔，工程师同时还希望少打孔，应该先保什么？",
    questionType: "方案取舍判断",
    source: "公开指南样本",
    difficulty: "困难",
    board: {
      id: "PUBLIC_GUIDE_PCIE_CONFLICT_01",
      component: "U5",
      package: "676-pin BGA · PCIe RX1",
      pinCount: 676,
      layerCount: null,
      signalLayers: null,
      traceWidth: null,
      clearance: null,
      evidence: "公开高速设计指南 · Split plane risk",
      variant: "conflict",
    },
    prediction: {
      taskCode: "constraint_conflict_judgment",
      taskLabel: "约束冲突判断",
      intent: "判断跨参考平面分割与更少过孔之间的优先级。",
      component: "U5",
      pins: ["N20", "N21"],
      nets: ["PCIE_RX1_P", "PCIE_RX1_N"],
      constraintCodes: ["reference_plane_continuity", "minimize_via_count"],
      constraints: ["参考平面连续", "减少过孔"],
      priorityCodes: ["signal_integrity_first", "minimize_via_count"],
      priorities: ["信号完整性优先", "减少过孔"],
      reason:
        "参考平面连续性与更少过孔发生冲突时，先保证信号完整性和连续回流路径，再优化过孔数量。",
      latencySeconds: 9.391,
      attempts: 2,
      schemaValid: true,
      corePassed: true,
      coreMetric: "优先级判断",
    },
  },
];

export const TASK_LABELS: Record<string, string> = {
  bga_pin_connection_repair: "BGA 管脚连接修复",
  bga_fanout: "BGA 扇出",
  bga_escape_routing: "BGA 逃线",
  single_net_routing: "单网络布线",
  differential_pair_routing: "差分对布线",
  constraint_conflict_judgment: "约束冲突判断",
};
