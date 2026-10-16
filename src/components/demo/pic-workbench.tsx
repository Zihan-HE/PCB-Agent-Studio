"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, Check, ChevronRight, Circle, Code2, Cpu, FileJson, Layers, Maximize2, Minus, Pause, Play, Plus, RotateCcw, Sparkles, Waves } from "lucide-react";

const CASES = [
  { id: "ring", name: "单总线微环", english: "MICRORING RESONATOR", code: "PIC—001", tag: "无源器件", prompt: "设计一个单总线微环，弯曲半径 10 μm、耦合间隙 0.2 μm，输出双端口 GDS 版图。", description: "从参数化需求到微环几何，观察耦合区、闭合光路与输入输出总线。", parameters: [["弯曲半径", "10 μm"], ["耦合间隙", "0.2 μm"], ["外部光端口", "2"]], origin: "本地 YAML 设计案例", notes: "使用 generic_tech 参数化器件。版图可导出；Q、消光比与工艺可制造性尚未独立验证。" },
  { id: "mzm", name: "热光 MZM", english: "MACH–ZEHNDER MODULATOR", code: "PIC—002", tag: "干涉结构", prompt: "展示一个带热光移相段的马赫–曾德尔调制器，查看双臂干涉结构与电极层，并导出 GDS。", description: "把光路与热光移相结构放在同一视图中，逐层查看光学几何与电极。", parameters: [["结构", "双臂干涉"], ["调节方式", "热光移相"], ["外部光端口", "2"]], origin: "参考设计本地回放", notes: "源于作者参考 notebook 的本地布局回放。该案例未验证电光带宽，也不代表 PN 行波调制器。" },
  { id: "qam", name: "8-QAM 光子电路", english: "MULTI-COMPONENT PHOTONICS", code: "PIC—003", tag: "电路集成", prompt: "展示 8-QAM 光子电路参考布局，查看多器件互连、分层几何及可下载的 GDS 产物。", description: "从单器件走向多模块互连，以完整参考布局呈现电路级设计产物。", parameters: [["设计类型", "8-QAM"], ["展示重点", "多模块互连"], ["交付格式", "GDSII"]], origin: "参考设计本地回放", notes: "源于作者参考 notebook 的本地布局回放。布局导出不等于已验证 8-QAM 星座、误码率或传输性能。" },
] as const;

type Geometry = {
  id: string; cell: string; bounds: [[number, number], [number, number]];
  layers: { id: string; polygons: number[][][] }[]; unitMeters: number;
  polygonCount: number; bytes: number; sha256: string; provenance: string;
};
const COLORS = ["#81f4ce", "#48b7f1", "#ffb86c", "#b39bff", "#f786b5", "#d5e77a", "#6de5f5", "#b3c7db", "#efbaff"];
const STAGES = [
  ["需求与参数", "定位器件、拓扑与几何参数"],
  ["结构化设计", "查看参数化描述与参考结构"],
  ["版图实例化", "载入已生成 GDS 的真实几何"],
  ["产物检查", "显示文件尺寸、图层及来源"],
  ["交付设计", "查看版图，下载工程产物"],
];

function LayoutViewer({ geometry, visible, zoom, setZoom }: { geometry: Geometry; visible: string[]; zoom: number; setZoom: (v: number) => void }) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const paths = useMemo(() => geometry.layers.map(layer => ({ id: layer.id, d: layer.polygons.map(points => "M" + points.map(p => `${p[0]},${-p[1]}`).join("L") + "Z").join("") })), [geometry]);
  const [[x0, y0], [x1, y1]] = geometry.bounds;
  const width = x1 - x0, height = y1 - y0;
  const padding = Math.max(width, height) * 0.13;
  return <div className="pic-viewer">
    <div className="pic-canvas-caption"><span><i /> GDS GEOMETRY</span><span>{geometry.cell}</span></div>
    <svg className="pic-geometry" viewBox={`${x0 - padding} ${-y1 - padding} ${width + 2 * padding} ${height + 2 * padding}`} role="img" aria-label="从实际 GDS 提取的分层版图，可拖动平移" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, originX: pan.x, originY: pan.y }; }} onPointerMove={e => { if (!drag.current) return; const box = e.currentTarget.getBoundingClientRect(); const scale = Math.max((width + padding * 2) / box.width, (height + padding * 2) / box.height); setPan({ x: drag.current.originX + (e.clientX - drag.current.x) * scale, y: drag.current.originY + (e.clientY - drag.current.y) * scale }); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <g transform={`translate(${pan.x} ${pan.y}) translate(${(x0 + x1) / 2} ${-(y0 + y1) / 2}) scale(${zoom}) translate(${-(x0 + x1) / 2} ${(y0 + y1) / 2})`}>
        {paths.map((layer, index) => <path key={layer.id} d={layer.d} fill={COLORS[index % COLORS.length]} opacity={visible.includes(layer.id) ? (index === 0 ? 1 : .65) : 0} fillRule="nonzero" />)}
      </g>
    </svg>
    <div className="pic-canvas-bottom"><span>真实版图 · 拖动平移<br /><b>{(width * geometry.unitMeters * 1e6).toFixed(1)} × {(height * geometry.unitMeters * 1e6).toFixed(1)} μm</b></span><div className="pic-zoom"><button aria-label="缩小版图" onClick={() => setZoom(Math.max(.5, zoom - .25))}><Minus size={16} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="放大版图" onClick={() => setZoom(Math.min(5, zoom + .25))}><Plus size={16} /></button><button aria-label="重置视图" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 size={16} /></button></div></div>
  </div>;
}

export function PicWorkbench() {
  const [selected, setSelected] = useState(0);
  const [prompt, setPrompt] = useState<string>(CASES[0].prompt);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState("layout");
  const [draft, setDraft] = useState(false);
  const sample = CASES[selected];
  const custom = prompt.trim() !== sample.prompt;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/pic/${sample.id}.json`, { signal: controller.signal }).then(r => { if (!r.ok) throw Error("版图数据加载失败，请刷新重试。"); return r.json(); }).then((data: Geometry) => { setGeometry(data); setVisible(data.layers.map(l => l.id)); }).catch(e => { if (e.name !== "AbortError") setError(String(e.message)); });
    return () => controller.abort();
  }, [sample.id]);

  useEffect(() => {
    if (!playing || step >= STAGES.length - 1) return;
    const timer = window.setInterval(() => setStep(current => {
      if (current >= STAGES.length - 1) return current;
      return current + 1;
    }), 950);
    return () => window.clearInterval(timer);
  }, [playing, step]);
  const finished = step === STAGES.length - 1;
  const running = playing && !finished;

  function choose(index: number) {
    setSelected(index); setPrompt(CASES[index].prompt); setStep(-1); setPlaying(false);
    if (index !== selected) { setGeometry(null); setVisible([]); setError(""); }
    setZoom(1); setDraft(false);
  }
  function start() {
    if (custom) { setDraft(true); return; }
    setDraft(false); setStep(0); setPlaying(true);
  }
  function exportRequest() {
    const blob = new Blob([JSON.stringify({ request: prompt, status: "pending_backend", createdAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "pic-design-request.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="pic-app">
    <header className="pic-header"><Link href="/" className="pic-brand"><span className="pic-logo"><Waves size={23} /></span>CIRCUIT<span>MIND</span><small>DESIGN STUDIO</small></Link><nav aria-label="设计领域"><Link href="/">PCB 工作台</Link><Link href="/pic" aria-current="page">PIC 光子设计 <span>NEW</span></Link></nav><a href="https://github.com/Zihan-HE/PCB-Agent-Studio" target="_blank" rel="noreferrer" className="pic-repo">项目仓库 ↗</a></header>
    <main className="pic-shell">
      <section className="pic-hero"><div><div className="pic-eyebrow"><span /> PHOTONIC DESIGN · FROM INTENT TO LAYOUT</div><h1>一句设计意图，<br />让<span>光路</span>成形。</h1><p>面向硅光器件与集成电路的 AI 辅助设计工作台。<br />连接自然语言、参数化结构与可交付的 GDS 版图。</p></div><div className="pic-hero-note"><span className="pic-orbit"><Circle /><Waves /></span><strong>看得见过程。<br />拿得到设计。</strong><span>3 个真实版图案例 / 浏览器内交互预览</span><a href="#pic-studio">进入设计工作台 <ArrowRight size={16} /></a></div></section>

      <div className="pic-section-heading" id="pic-studio"><div><span>01 / WORKSPACE</span><h2>光子设计工作台</h2></div><span className="pic-mode"><i /> 案例回放 · 无需 API 密钥</span></div>
      <section className="pic-workspace">
        <aside className="pic-input-panel"><div className="pic-panel-title"><Sparkles size={17} /><h3>描述你的设计</h3><span>01</span></div><label htmlFor="pic-request">DESIGN INTENT</label><textarea id="pic-request" value={prompt} onChange={e => { setPrompt(e.target.value); setPlaying(false); setStep(-1); setDraft(false); }} disabled={running} maxLength={2000} />
          <div className="pic-prompt-meta"><span>{custom ? "自定义需求 · 待接入生成后端" : "已保存案例 · 点击回放流程"}</span><span>{prompt.length}/2000</span></div>
          <button className="pic-primary" disabled={!prompt.trim() || !geometry || running} onClick={start}>{custom ? <FileJson size={17} /> : <Play size={17} />} {custom ? "整理设计需求" : finished ? "重新播放设计过程" : "演示生成流程"}<ArrowRight size={17} /></button>
          {draft && <div className="pic-draft" role="status">需求已整理。当前页面未连接在线模型与版图编译后端，自定义文本不会生成新的 GDS。<button onClick={exportRequest}>下载需求 JSON <ArrowDownToLine size={14} /></button></div>}
          <div className="pic-example-heading">从一个案例开始 <span>SELECT A DESIGN</span></div><div className="pic-examples">{CASES.map((c, i) => <button key={c.id} className={selected === i ? "active" : ""} onClick={() => choose(i)} aria-pressed={selected === i}><span className="pic-example-number">0{i + 1}</span><span><strong>{c.name}</strong><small>{c.tag}</small></span><ChevronRight size={16} /></button>)}</div>
          <div className="pic-input-note"><Layers size={16} /><p>版图直接来自 GDS 文件。<br />图层可切换，产物可下载。</p></div>
        </aside>

        <div className="pic-output-panel"><div className="pic-output-heading"><div><span>{sample.code}</span><h3>{sample.name}</h3></div><div className="pic-tabs" role="tablist" aria-label="产物视图">{[["layout", "版图"], ["details", "设计记录"]].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{id === "layout" ? <Layers size={14} /> : <Code2 size={14} />}{label}</button>)}</div></div>
          {error ? <div className="pic-load-error" role="alert">{error}</div> : !geometry ? <div className="pic-loading">读取真实 GDS 几何…</div> : tab === "layout" ? <LayoutViewer key={sample.id} geometry={geometry} visible={visible} zoom={zoom} setZoom={setZoom} /> : <div className="pic-record"><span>ARTIFACT RECORD</span><h4>{sample.english}</h4><p>{sample.description}</p><dl>{sample.parameters.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}<div><dt>文件来源</dt><dd>{sample.origin}</dd></div><div><dt>GDS 读取</dt><dd>已通过</dd></div><div><dt>完整 DRC / LVS</dt><dd>未执行</dd></div><div><dt>物理性能</dt><dd>未独立验证</dd></div></dl><p className="pic-record-note">{sample.notes}</p><code>SHA256 · {geometry.sha256}</code></div>}
          <div className="pic-layers"><span><Layers size={14} /> 图层</span>{geometry?.layers.map((l, i) => <button key={l.id} aria-pressed={visible.includes(l.id)} onClick={() => setVisible(v => v.includes(l.id) ? v.filter(x => x !== l.id) : [...v, l.id])}><i style={{ background: COLORS[i % COLORS.length] }} />{l.id}</button>)}</div>
          <div className="pic-artifact-bar"><div><span>GDSII</span><strong>{geometry ? `${(geometry.bytes / 1024).toFixed(1)} KB` : "—"}</strong><small>{geometry?.polygonCount.toLocaleString("en-US") ?? "—"} 多边形 · {geometry?.layers.length ?? "—"} 图层</small></div><a href={`/pic/${sample.id}.gds`} download={`${sample.id}.gds`}><ArrowDownToLine size={16} />下载 GDS</a></div>
        </div>
      </section>

      <section className="pic-process"><div className="pic-process-heading"><div><span className="pic-eyebrow">DESIGN TRACE</span><h3>每一步，都有迹可循。</h3></div><div aria-live="polite">{finished ? "回放完成 · 可查看已保存产物" : step < 0 ? "选择案例，开始流程回放" : `正在回放：${STAGES[step][0]}`}</div>{step >= 0 && !finished && <button aria-label={running ? "暂停回放" : "继续回放"} onClick={() => setPlaying(!playing)}>{running ? <Pause size={16} /> : <Play size={16} />}</button>}</div><ol>{STAGES.map(([name, desc], i) => <li key={name} className={step > i || finished ? "complete" : step === i ? "current" : ""}><span className="pic-step-dot">{step > i || finished ? <Check size={16} /> : `0${i + 1}`}</span><strong>{name}</strong><small>{desc}</small></li>)}</ol><div className="pic-trace-foot"><span>回放展示处理顺序；动画时长不代表真实推理或仿真耗时。</span><button onClick={() => { setStep(-1); setPlaying(false); }}><RotateCcw size={13} />重置</button></div></section>

      <section className="pic-features"><div className="pic-section-heading"><div><span>02 / DESIGN CAPABILITIES</span><h2>把设计过程，变成可检查的产物。</h2></div></div><div className="pic-feature-grid"><article><Sparkles /><span>01</span><h3>需求驱动</h3><p>把器件类型、拓扑与几何参数放进同一条设计任务，连接语言描述与结构化设计。</p><small>当前展示：预设需求与保存的案例对应</small></article><article><Cpu /><span>02</span><h3>参数化构建</h3><p>基于器件库复用几何与端口定义，从微环扩展到干涉结构和多模块电路。</p><small>当前展示：generic_tech 生成的真实几何</small></article><article><Layers /><span>03</span><h3>可追溯交付</h3><p>保留来源、图层与验证状态。浏览器中的版图和下载的 GDS 来自同一份设计产物。</p><small>当前展示：文件摘要、图层预览与 GDS 下载</small></article></div></section>
      <details className="pic-credits"><summary>实现范围与开源来源 <Plus size={15} /></summary><p>本模块由项目组集成，实现网页交互、GDS 几何预览、案例回放与产物交付。设计方法与参考案例基于 <a href="https://github.com/ACADLab/PICasso" target="_blank" rel="noreferrer">PICasso（ACADLab）</a> 和 gdsfactory。MZM、8-QAM 为参考 notebook 的本地回放，微环为本地 YAML 案例。<a href="/pic/PICasso-LICENSE.txt">查看 MIT 许可</a>。</p><p>本版本无在线 LLM、实时仿真或自动优化服务。流程动画是演示回放；所有案例的完整 DRC/LVS、工艺签核及目标光学性能均未在此网页验证。未来可通过独立后端接入生成、检查与反馈修正。</p></details>
    </main><footer className="pic-footer"><span>CIRCUITMIND / PHOTONIC DESIGN STUDIO</span><span>INTENT → STRUCTURE → LAYOUT → ARTIFACT</span><Link href="/">返回 PCB 工作台 ↗</Link></footer>
  </div>;
}
