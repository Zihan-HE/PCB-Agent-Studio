"use client";

import Link from "next/link";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  ActivityIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleDotIcon,
  ClockIcon,
  CopyIcon,
  CpuIcon,
  DatabaseIcon,
  FileJsonIcon,
  LayersIcon,
  LockIcon,
  PlayIcon,
  RouteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  UploadIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  BENCHMARK_METRICS,
  CATEGORY_METRICS,
  INTENT_DEMO_SAMPLES,
  TASK_LABELS,
  type IntentDemoSample,
  type IntentPrediction,
} from "@/lib/intent-demo-data";
import { cn } from "@/lib/utils";

type AnalysisPhase = "ready" | "running" | "done";

const DEFAULT_SAMPLE = INTENT_DEMO_SAMPLES[0];

const CUSTOM_CONSTRAINTS: Record<string, { code: string; label: string }> = {
  connectivity: { code: "same_net_connectivity", label: "同网连通" },
  avoid: { code: "avoid_unrelated_nets", label: "避免误连" },
  layer: { code: "layer_or_via_strategy", label: "层选择与过孔策略" },
  pair: { code: "pair_routing", label: "成对布线" },
  impedance: { code: "impedance_control", label: "阻抗控制" },
  length: { code: "length_matching", label: "等长控制" },
  plane: { code: "reference_plane_continuity", label: "参考平面连续" },
  via: { code: "minimize_via_count", label: "减少过孔" },
};

function uniqueMatches(text: string, pattern: RegExp): string[] {
  return [...new Set(Array.from(text.matchAll(pattern), (match) => match[1]))];
}

function buildCustomSample(question: string, fallback: IntentDemoSample): IntentDemoSample {
  const isConflict = /冲突|应该先|先保|优先|取舍|不能同时|参考平面分割/.test(question);
  const isDifferential = /差分|PCIE|PCIe|USB|LVDS|P\/N|_P\b|_N\b/i.test(question);
  const isFanout = /扇出|焊盘口|起步段|带出来一点/.test(question);
  const isEscape = /逃线|阵列外|密集区|外侧通道/.test(question);
  const isRepair = /没接|未接|断点|断着|补线|缺口|修复/.test(question);

  const taskCode = isConflict
    ? "constraint_conflict_judgment"
    : isDifferential
      ? "differential_pair_routing"
      : isFanout
        ? "bga_fanout"
        : isEscape
          ? "bga_escape_routing"
          : isRepair
            ? "bga_pin_connection_repair"
            : "single_net_routing";

  const components = uniqueMatches(question, /\b(U\d+)\b/g);
  const component = components[0] ?? fallback.prediction.component;
  const pinPattern = new RegExp(`${component}[.的\\s/]*(?:pin\\s*)?([A-Z]{1,2}\\d+)`, "gi");
  const pins = [
    ...new Set([
      ...uniqueMatches(question, pinPattern),
      ...uniqueMatches(question, /\/([A-Z]{1,2}\d+)\b/g),
    ]),
  ];
  const nets = [
    ...new Set(
      Array.from(
        question.matchAll(/\b((?:NET|PCIE|USB|LVDS|DP|ADC|DCO)_[A-Z0-9_+-]+)\b/gi),
        (match) => match[1].toUpperCase(),
      ),
    ),
  ];

  const constraintKeys = new Set<string>();
  if (isRepair || /连通|连接/.test(question)) constraintKeys.add("connectivity");
  if (/避开|误连|无关网络|间距|拥挤/.test(question)) constraintKeys.add("avoid");
  if (/换层|层切换|过孔/.test(question)) constraintKeys.add("layer");
  if (isDifferential) constraintKeys.add("pair");
  if (/阻抗/.test(question)) constraintKeys.add("impedance");
  if (/等长|长度|时序/.test(question)) constraintKeys.add("length");
  if (/参考平面|回流/.test(question)) constraintKeys.add("plane");
  if (/少打孔|减少过孔|少过孔/.test(question)) constraintKeys.add("via");
  if (constraintKeys.size === 0) {
    constraintKeys.add("connectivity");
    constraintKeys.add("avoid");
  }

  const constraints = [...constraintKeys].map((key) => CUSTOM_CONSTRAINTS[key]);
  const signalIntegrityFirst = isDifferential || /阻抗|参考平面|回流|时序/.test(question);
  const priorityCodes = signalIntegrityFirst
    ? ["signal_integrity_first"]
    : ["connectivity_first"];
  if (/少打孔|减少过孔|少过孔/.test(question)) priorityCodes.push("minimize_via_count");

  const prediction: IntentPrediction = {
    taskCode,
    taskLabel: TASK_LABELS[taskCode],
    intent: isConflict
      ? "识别工程约束之间的冲突，并给出可执行的优先级。"
      : `识别为${TASK_LABELS[taskCode]}任务，并抽取目标对象与工程约束。`,
    component,
    pins: pins.length > 0 ? pins : fallback.prediction.pins,
    nets: nets.length > 0 ? nets : fallback.prediction.nets,
    constraintCodes: constraints.map((item) => item.code),
    constraints: constraints.map((item) => item.label),
    priorityCodes,
    priorities: priorityCodes.map((code) =>
      code === "signal_integrity_first"
        ? "信号完整性优先"
        : code === "minimize_via_count"
          ? "减少过孔"
          : "连通性优先",
    ),
    reason: signalIntegrityFirst
      ? "输入包含高速链路或回流路径线索，应先保证差分成对、阻抗与参考平面连续，再优化路径长度和过孔数量。"
      : "输入的首要目标是恢复或建立正确的网络连接，同时避免与无关网络发生误连。",
    latencySeconds: null,
    attempts: 1,
    schemaValid: true,
    corePassed: true,
    coreMetric: "演示解析",
  };

  return {
    ...fallback,
    id: "LOCAL_DEMO_INPUT",
    shortLabel: "自定义输入",
    title: "本地规则预览",
    question,
    questionType: "自定义指令",
    source: "本地演示解析",
    difficulty: "中等",
    board: {
      ...fallback.board,
      component,
      variant: isConflict ? "conflict" : isDifferential ? "differential" : "repair",
    },
    prediction,
  };
}

function BoardSignalMap({ sample }: Readonly<{ sample: IntentDemoSample }>) {
  const isDifferential = sample.board.variant !== "repair";
  const isConflict = sample.board.variant === "conflict";
  const pads = Array.from({ length: 48 }, (_, index) => ({
    x: 56 + (index % 8) * 18,
    y: 43 + Math.floor(index / 8) * 18,
  }));

  return (
    <div className="signal-map" aria-label="目标对象与风险区域示意图">
      <div className="signal-map__legend">
        <span><i className="legend-dot legend-dot--target" />目标网络</span>
        <span><i className="legend-dot legend-dot--context" />邻近网络</span>
        {isConflict ? <span><i className="legend-dot legend-dot--risk" />平面分割</span> : null}
      </div>
      <svg viewBox="0 0 520 240" role="img" aria-label={`${sample.title} 的板级证据定位`}>
        <defs>
          <pattern id="micro-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="rgba(189,244,85,.09)" strokeWidth="0.7" />
          </pattern>
          <filter id="signal-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="1" y="1" width="518" height="238" rx="15" fill="#07100e" stroke="rgba(189,244,85,.18)" />
        <rect x="1" y="1" width="518" height="238" rx="15" fill="url(#micro-grid)" />
        {isConflict ? (
          <path d="M318 18L369 18L333 222L282 222Z" fill="rgba(255,126,77,.08)" stroke="rgba(255,126,77,.5)" strokeDasharray="5 6" />
        ) : null}
        <rect x="39" y="26" width="164" height="130" rx="13" fill="rgba(10,29,25,.92)" stroke="rgba(189,244,85,.24)" />
        {pads.map((pad, index) => {
          const active = isDifferential ? index === 19 || index === 20 : index === 26;
          return (
            <circle
              key={`${pad.x}-${pad.y}`}
              cx={pad.x}
              cy={pad.y}
              r={active ? 5.6 : 3.2}
              fill={active ? "#bdf455" : "rgba(177,211,193,.24)"}
              stroke={active ? "rgba(189,244,85,.55)" : "transparent"}
              strokeWidth="5"
            />
          );
        })}
        <text x="50" y="177" fill="rgba(224,235,226,.62)" fontSize="10" letterSpacing="1.8">{sample.board.component} · BGA ARRAY</text>
        {isDifferential ? (
          <>
            <path d="M128 79C213 70 229 58 293 77S408 138 485 94" fill="none" stroke="#bdf455" strokeWidth="3" filter="url(#signal-glow)" />
            <path d="M128 97C209 89 229 77 291 95S405 156 486 112" fill="none" stroke="#56dfc2" strokeWidth="3" />
            <circle cx="128" cy="79" r="4" fill="#bdf455" />
            <circle cx="128" cy="97" r="4" fill="#56dfc2" />
            <circle cx="486" cy="94" r="5" fill="#07100e" stroke="#bdf455" strokeWidth="2" />
            <circle cx="486" cy="112" r="5" fill="#07100e" stroke="#56dfc2" strokeWidth="2" />
            <text x="365" y="72" fill="#dfe9df" fontSize="10">{sample.prediction.nets[0]}</text>
            <text x="365" y="137" fill="#9cb3a7" fontSize="10">{sample.prediction.nets[1]}</text>
            {isConflict ? (
              <path d="M128 79C235 123 292 157 480 194" fill="none" stroke="rgba(255,126,77,.9)" strokeWidth="2" strokeDasharray="7 7" />
            ) : null}
          </>
        ) : (
          <>
            <path d="M110 97C210 103 252 180 404 165" fill="none" stroke="#bdf455" strokeWidth="2.6" strokeDasharray="7 6" filter="url(#signal-glow)" />
            <circle cx="110" cy="97" r="6" fill="#bdf455" />
            <circle cx="404" cy="165" r="7" fill="#07100e" stroke="#bdf455" strokeWidth="2" />
            <text x="418" y="169" fill="#dfe9df" fontSize="11">TP104.1</text>
            <path d="M248 32C274 77 309 84 352 66S418 46 482 57" fill="none" stroke="rgba(86,223,194,.35)" strokeWidth="2" />
            <path d="M238 201C278 147 343 128 482 137" fill="none" stroke="rgba(86,223,194,.28)" strokeWidth="2" />
          </>
        )}
        <text x="283" y="218" fill="rgba(224,235,226,.4)" fontSize="9" letterSpacing="1.4">EVIDENCE MAP · NO ROUTE GENERATED</text>
      </svg>
      <div className="signal-map__note">
        <CircleDotIcon />
        <span>仅标注目标、连通关系与风险区域；当前模块不生成实际布线。</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, index }: Readonly<{ label: string; value: string; detail: string; index: number }>) {
  return (
    <div className="metric-card" style={{ animationDelay: `${80 + index * 60}ms` }}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function OutputPill({ children, tone = "default" }: Readonly<{ children: React.ReactNode; tone?: "default" | "priority" }>) {
  return <span className={cn("output-pill", tone === "priority" && "output-pill--priority")}>{children}</span>;
}

export function IntentWorkbench() {
  const [selectedId, setSelectedId] = useState(DEFAULT_SAMPLE.id);
  const [draft, setDraft] = useState(DEFAULT_SAMPLE.question);
  const [result, setResult] = useState<IntentDemoSample>(DEFAULT_SAMPLE);
  const [phase, setPhase] = useState<AnalysisPhase>("done");
  const [dirty, setDirty] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const selectedSample = useMemo(
    () => INTENT_DEMO_SAMPLES.find((sample) => sample.id === selectedId) ?? DEFAULT_SAMPLE,
    [selectedId],
  );

  function selectSample(sample: IntentDemoSample) {
    if (timerRef.current) clearTimeout(timerRef.current);
    startTransition(() => {
      setSelectedId(sample.id);
      setDraft(sample.question);
      setResult(sample);
      setPhase("done");
      setDirty(false);
      setJsonOpen(false);
    });
  }

  function updateDraft(value: string) {
    setDraft(value);
    setDirty(value.trim() !== selectedSample.question.trim());
    setPhase("ready");
  }

  function runAnalysis() {
    if (!draft.trim()) {
      toast.error("请先输入 PCB 工程指令");
      return;
    }
    setPhase("running");
    setJsonOpen(false);
    timerRef.current = setTimeout(() => {
      const exact = INTENT_DEMO_SAMPLES.find((sample) => sample.question.trim() === draft.trim());
      startTransition(() => {
        setResult(exact ?? buildCustomSample(draft.trim(), selectedSample));
        setPhase("done");
        setDirty(false);
      });
      toast.success(exact ? "验证样本回放完成" : "本地演示解析完成");
    }, 920);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    toast.success(`已载入 ${file.name}`, {
      description: "演示版仅展示文件接入状态；板级解析服务可在交付环境连接。",
    });
    event.target.value = "";
  }

  async function copyResult() {
    const payload = {
      primary_task_type: result.prediction.taskCode,
      secondary_task_types: [],
      intent: result.prediction.intent,
      target_component: result.prediction.component,
      target_pins: result.prediction.pins,
      target_nets: result.prediction.nets,
      constraint_tags: result.prediction.constraintCodes,
      priority_tags: result.prediction.priorityCodes,
      reason: result.prediction.reason,
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("结构化结果已复制");
  }

  const jsonPayload = JSON.stringify(
    {
      primary_task_type: result.prediction.taskCode,
      secondary_task_types: [],
      intent: result.prediction.intent,
      target_component: result.prediction.component,
      target_pins: result.prediction.pins,
      target_nets: result.prediction.nets,
      constraint_tags: result.prediction.constraintCodes,
      priority_tags: result.prediction.priorityCodes,
      reason: result.prediction.reason,
    },
    null,
    2,
  );

  return (
    <div className="intent-app">
      <div className="intent-app__glow" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CircuitMind 首页">
          <span className="brand__mark"><RouteIcon /></span>
          <span className="brand__name">CIRCUIT<span>MIND</span></span>
          <span className="brand__edition">PCB AI / 01</span>
        </a>
        <Link className="pic-mobile-entry" href="/pic">PIC 光子设计 ↗</Link>
        <nav className="module-nav" aria-label="产品模块">
          <Link className="module-nav__item" href="/pic"><LayersIcon />PIC 光子设计</Link>
          <button className="module-nav__item module-nav__item--active" type="button">
            <SparklesIcon />
            意图理解
          </button>
          <button
            className="module-nav__item"
            type="button"
            onClick={() => toast.info("Agent Routing 接口已预留", { description: "实际 Trace 生成由后续模块接入。" })}
          >
            <RouteIcon />
            Agent 布线
            <LockIcon className="module-nav__lock" />
          </button>
        </nav>
        <div className="system-state">
          <span className="system-state__pulse" />
          <span><strong>DEMO READY</strong>脱敏验证集回放</span>
        </div>
      </header>

      <main id="top" className="product-shell">
        <section className="hero">
          <div className="hero__copy">
            <div className="eyebrow"><ZapIcon /> PCB INTENT COMPILER · PUBLIC DEMO</div>
            <h1>把工程师的自然语言，<br /><span>编译成可执行设计约束。</span></h1>
            <p>
              从板级上下文中识别任务类型、目标对象与冲突优先级，为后续 PCB Agent 提供可靠、可审计的结构化输入。
            </p>
          </div>
          <div className="hero__flow" aria-label="处理流程">
            {["工程指令", "意图分类", "对象抽取", "约束编译"].map((label, index) => (
              <div className="flow-node" key={label}>
                <span>0{index + 1}</span>
                <strong>{label}</strong>
                {index < 3 ? <ArrowRightIcon /> : <CheckIcon />}
              </div>
            ))}
          </div>
        </section>

        <section className="metrics-grid" aria-label="验证集评测指标">
          {BENCHMARK_METRICS.map((metric, index) => (
            <MetricCard key={metric.label} {...metric} index={index} />
          ))}
        </section>

        <section className="workbench-grid">
          <div className="command-panel panel-frame">
            <div className="panel-heading">
              <div>
                <span className="panel-index">INPUT / 01</span>
                <h2>工程指令</h2>
              </div>
              <span className="dataset-chip"><DatabaseIcon /> 100 题验证集</span>
            </div>

            <div className="sample-switcher" aria-label="演示样本">
              {INTENT_DEMO_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  className={cn("sample-tab", selectedId === sample.id && "sample-tab--active")}
                  type="button"
                  onClick={() => selectSample(sample)}
                >
                  <span>{sample.shortLabel}</span>
                  <strong>{sample.title}</strong>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>

            <div className="prompt-box">
              <div className="prompt-box__meta">
                <span>{selectedSample.questionType}</span>
                <span>{selectedSample.source}</span>
                <span>难度 · {selectedSample.difficulty}</span>
              </div>
              <textarea
                aria-label="PCB 工程指令"
                value={draft}
                onChange={(event) => updateDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    runAnalysis();
                  }
                }}
                spellCheck={false}
              />
              <div className="prompt-box__counter">{draft.length} CHARS</div>
            </div>

            <div className="board-context-row">
              <div><TargetIcon /><span>对象<strong>{selectedSample.board.component}</strong></span></div>
              <div><CpuIcon /><span>封装<strong>{selectedSample.board.package}</strong></span></div>
              <div><LayersIcon /><span>板级证据<strong>{selectedSample.board.id}</strong></span></div>
            </div>

            <div className="command-actions">
              <input ref={uploadRef} type="file" accept=".kicad_pcb,.json,.txt" hidden onChange={handleUpload} />
              <button className="secondary-action" type="button" onClick={() => uploadRef.current?.click()}>
                <UploadIcon /> 导入板文件
              </button>
              <button className="primary-action" type="button" onClick={runAnalysis} disabled={phase === "running"}>
                {phase === "running" ? <ActivityIcon className="spin-slow" /> : <PlayIcon />}
                {phase === "running" ? "正在解析意图" : dirty ? "解析自定义指令" : "运行意图引擎"}
                <span>⌘ ↵</span>
              </button>
            </div>
            <p className="demo-boundary">
              <ShieldCheckIcon /> 验证题可回放脱敏模型结果；自定义文本使用本地规则预览，生产模型接口不包含在公开仓库中。
            </p>
          </div>

          <div className={cn("output-panel panel-frame", phase === "running" && "output-panel--scanning")}>
            <div className="scan-line" aria-hidden="true" />
            <div className="panel-heading">
              <div>
                <span className="panel-index">OUTPUT / 02</span>
                <h2>结构化理解</h2>
              </div>
              <div className="validation-badge"><CheckIcon /> SCHEMA VALID</div>
            </div>

            <div className="intent-result">
              <div className="intent-result__lead">
                <span className="intent-kicker">PRIMARY INTENT</span>
                <h3>{phase === "running" ? "正在读取工程语义…" : result.prediction.taskLabel}</h3>
                <code>{phase === "running" ? "parsing_context" : result.prediction.taskCode}</code>
                <p>{result.prediction.intent}</p>
              </div>
              <div className="run-verdict">
                <span><CheckIcon />核心指标通过</span>
                <strong>{result.prediction.latencySeconds === null ? "LOCAL" : `${result.prediction.latencySeconds.toFixed(3)}s`}</strong>
                <small>{result.prediction.coreMetric}{result.prediction.attempts > 1 ? ` · ${result.prediction.attempts} 次请求` : ""}</small>
              </div>
            </div>

            <div className="target-grid">
              <div className="output-block">
                <span className="output-block__label">TARGET COMPONENT</span>
                <strong className="mono-value">{result.prediction.component}</strong>
              </div>
              <div className="output-block">
                <span className="output-block__label">TARGET PINS</span>
                <div className="pill-row">{result.prediction.pins.map((pin) => <OutputPill key={pin}>{pin}</OutputPill>)}</div>
              </div>
              <div className="output-block output-block--wide">
                <span className="output-block__label">TARGET NETS</span>
                <div className="pill-row">{result.prediction.nets.map((net) => <OutputPill key={net}>{net}</OutputPill>)}</div>
              </div>
            </div>

            <div className="output-section">
              <span className="output-block__label">COMPILED CONSTRAINTS · {result.prediction.constraints.length}</span>
              <div className="constraint-list">
                {result.prediction.constraints.map((constraint, index) => (
                  <div key={constraint}><span>0{index + 1}</span><strong>{constraint}</strong><CheckIcon /></div>
                ))}
              </div>
            </div>

            <div className="priority-section">
              <span className="output-block__label">DECISION PRIORITY</span>
              <div className="pill-row">
                {result.prediction.priorities.map((priority) => <OutputPill key={priority} tone="priority">{priority}</OutputPill>)}
              </div>
              <p>{result.prediction.reason}</p>
            </div>

            <div className="json-actions">
              <button type="button" onClick={() => setJsonOpen((open) => !open)}><FileJsonIcon />{jsonOpen ? "收起 JSON" : "查看 JSON"}</button>
              <button type="button" onClick={copyResult}><CopyIcon />复制结果</button>
            </div>
            {jsonOpen ? <pre className="json-preview">{jsonPayload}</pre> : null}
          </div>
        </section>

        <section className="evidence-grid">
          <div className="evidence-panel panel-frame">
            <div className="panel-heading panel-heading--compact">
              <div><span className="panel-index">EVIDENCE / 03</span><h2>板级证据定位</h2></div>
              <span className="evidence-id">{result.board.id}</span>
            </div>
            <BoardSignalMap sample={result} />
          </div>

          <div className="benchmark-panel panel-frame">
            <div className="panel-heading panel-heading--compact">
              <div><span className="panel-index">VALIDATION / 04</span><h2>四类能力覆盖</h2></div>
              <span className="dataset-chip">V1.1 验收口径</span>
            </div>
            <div className="category-bars">
              {CATEGORY_METRICS.map((metric, index) => (
                <div className="category-row" key={metric.label}>
                  <div><span>0{index + 1}</span><strong>{metric.label}</strong><em>{metric.value}%</em></div>
                  <div className="category-track"><i style={{ width: `${metric.value}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="benchmark-footer">
              <div><ClockIcon /><span>模型<strong>PCB-Intent-v2</strong></span></div>
              <div><DatabaseIcon /><span>输入<strong>100 题 / 脱敏板级材料</strong></span></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>CIRCUITMIND · PCB INTENT INTELLIGENCE</span>
        <span>PUBLIC DEMO DATA · MODEL OUTPUT AUDITABLE</span>
      </footer>
    </div>
  );
}
