"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownToLine, Check, Code2, FolderOpen, Layers, Pause, Play, RotateCcw, StepForward, Waves } from "lucide-react";
import { assetPath, CASES, Geometry, layerStyle, STAGES } from "./pic-design-data";
import { LayoutViewer } from "./pic-layout-viewer";
import { RepairShowcase } from "./pic-repair-showcase";

export function PicWorkbench() {
  const [selected,setSelected]=useState(3);
  const [prompt,setPrompt]=useState<string>(CASES[3].prompt);
  const [geometry,setGeometry]=useState<Geometry|null>(null);
  const [error,setError]=useState("");
  const [step,setStep]=useState(6);
  const [playing,setPlaying]=useState(false);
  const [visible,setVisible]=useState<string[]>([]);
  const [zoom,setZoom]=useState(1);
  const [tab,setTab]=useState("layout");
  const [showLabels,setShowLabels]=useState(true);
  const [speed,setSpeed]=useState(1);
  const [draft,setDraft]=useState(false);
  const sample=CASES[selected], custom=prompt.trim()!==sample.prompt;
  useEffect(()=>{
    const controller=new AbortController();
    fetch(assetPath(`/pic/${sample.id}.json`),{signal:controller.signal})
      .then(r=>{if(!r.ok)throw Error("版图加载失败，请刷新重试。");return r.json();})
      .then((data:Geometry)=>{setGeometry(data);setVisible(data.layers.map(l=>l.id));})
      .catch(e=>{if(e.name!=="AbortError")setError(e.message);});
    return ()=>controller.abort();
  },[sample.id]);
  useEffect(()=>{
    if(!playing)return;
    const timer=window.setTimeout(()=>{if(step<6)setStep(step+1);else setPlaying(false);},2600/speed);
    return ()=>window.clearTimeout(timer);
  },[playing,step,speed]);
  function choose(index:number){
    setSelected(index);setPrompt(CASES[index].prompt);setStep(0);setPlaying(false);setTab("layout");setDraft(false);setZoom(1);
    if(index!==selected){setGeometry(null);setError("");setVisible([]);}
  }
  function start(){if(custom){setDraft(true);return;}setStep(0);setPlaying(true);setTab("layout");setZoom(1);}
  function exportRequest(){
    const url=URL.createObjectURL(new Blob([JSON.stringify({request:prompt,status:"pending_backend"},null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="pic-design-request.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="pic-app">
    <header className="pic-header"><Link href="/" className="pic-brand"><Waves size={21}/><strong>CIRCUITMIND</strong><span>PIC ENGINEERING</span></Link><nav aria-label="设计领域"><Link href="/">意图理解</Link><Link href="/pic" aria-current="page">PIC 设计与修复</Link></nav><a className="pic-repo" href="https://github.com/Zihan-HE/PCB-Agent-Studio" target="_blank" rel="noreferrer">GitHub ↗</a></header>
    <main className="pic-shell">
      <div className="pic-title"><div><span>WORKSPACE / PHOTONICS</span><h1>AI辅助PIC设计和验证展示</h1></div><p>从设计需求，到器件放置、波导连接与完整 GDS。<small>保存案例演示 · 基于真实 GDS 层级重建</small></p></div>
      <section className="pic-workspace">
        <aside className="pic-input-panel">
          <div className="pic-panel-title"><Code2 size={15}/><h2>设计任务</h2><span>INPUT</span></div>
          <label htmlFor="pic-request">设计需求</label><textarea id="pic-request" value={prompt} disabled={playing} maxLength={2000} onChange={e=>{setPrompt(e.target.value);setDraft(false);setPlaying(false);}}/>
          <div className="pic-prompt-meta"><span>{custom?"自定义任务 · 待接后端":"案例任务"}</span><span>{prompt.length}/2000</span></div>
          <button className="pic-primary" disabled={!geometry||playing||!prompt.trim()} onClick={start}><Play size={15}/>{custom?"整理设计需求":"播放设计过程"}</button>
          {draft&&<div className="pic-draft" role="status">当前为案例演示。自定义需求可导出并交给生成后端。<button onClick={exportRequest}>下载需求 JSON</button></div>}
          <div className="pic-side-label"><FolderOpen size={14}/> 示例工程</div>
          <div className="pic-examples">{CASES.map((item,index)=><button key={item.id} className={selected===index?"active":""} onClick={()=>choose(index)} aria-pressed={selected===index}><Layers size={14}/><span><strong>{item.name}</strong><small>{item.tag}</small></span></button>)}</div>
          <div className="pic-hierarchy"><div className="pic-side-label">CELL HIERARCHY</div><div className="pic-cell-tree"><div><FolderOpen size={13}/>{sample.code}</div>{geometry?.parts.map(part=><div key={part.id} title={part.cell}><span>└</span><Layers size={12}/>{part.id}<small>{part.kind}</small></div>)}</div></div>
          <p className="pic-input-note">点击下方步骤查看对应版图，或暂停后单步前进。</p>
        </aside>
        <div className="pic-editor">
          <div className="pic-editor-toolbar"><div className="pic-tabs" role="tablist" aria-label="产物视图"><button role="tab" aria-selected={tab==="layout"} onClick={()=>setTab("layout")}><Layers size={14}/>Layout</button><button role="tab" aria-selected={tab==="details"} onClick={()=>setTab("details")}><Code2 size={14}/>设计记录</button></div><span>{sample.id}.gds <b>generic_tech</b></span></div>
          <div className="pic-editor-body"><div className="pic-canvas-column">
            {error?<div className="pic-load-error" role="alert">{error}</div>:!geometry?<div className="pic-loading">正在读取 GDS…</div>:tab==="layout"?<LayoutViewer key={sample.id} geometry={geometry} visible={visible} step={step} playing={playing} zoom={zoom} setZoom={setZoom} showLabels={showLabels}/>:<div className="pic-record"><span>DESIGN RECORD</span><h2>{sample.name}</h2><dl>{sample.parameters.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}<div><dt>设计顶层</dt><dd>{geometry.cell}</dd></div><div><dt>GDS 解析</dt><dd>已完成</dd></div><div><dt>完整 DRC / LVS</dt><dd>未执行</dd></div></dl><p>{sample.notes}</p><p>过程视图从最终 GDS 的层级与几何重建，解释构建顺序；并非在线模型运行记录。</p><code>SHA256 {geometry.sha256}</code></div>}
          </div><aside className="pic-layer-panel"><div className="pic-panel-title"><Layers size={14}/><h2>图层</h2><span>L / D</span></div>
            <div className="pic-layer-list">{geometry?.layers.map(layer=><label key={layer.id}><input type="checkbox" checked={visible.includes(layer.id)} onChange={()=>setVisible(current=>current.includes(layer.id)?current.filter(item=>item!==layer.id):[...current,layer.id])}/><i style={{background:layerStyle(layer.id).color}}/><span>{layerStyle(layer.id).name}<small>{layer.id}</small></span></label>)}</div>
            <div className="pic-layer-options"><label><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/>单元标注</label><button onClick={()=>setVisible(["1/0"])}>只看光路</button><button onClick={()=>setVisible(geometry?.layers.map(l=>l.id)??[])}>显示全部图层</button></div>
            <div className="pic-properties"><h3>设计属性</h3>{sample.parameters.map(([key,value])=><div key={key}><span>{key}</span><b>{value}</b></div>)}<div><span>边界尺寸</span><b>{geometry?`${((geometry.bounds[1][0]-geometry.bounds[0][0])*geometry.unitMeters*1e6).toFixed(1)} × ${((geometry.bounds[1][1]-geometry.bounds[0][1])*geometry.unitMeters*1e6).toFixed(1)}`:"—"} μm</b></div></div>
          </aside></div>
          <div className="pic-artifact-bar"><span><i/>{step===6?"完整设计":STAGES[step].name}<small>{geometry?.polygonCount.toLocaleString("en-US")??"—"} polygons / {geometry?.layers.length??"—"} layers</small></span><a href={assetPath(`/pic/${sample.id}.gds`)} download={`${sample.id}.gds`}><ArrowDownToLine size={14}/>下载完整 GDS <small>{geometry?`${(geometry.bytes/1024).toFixed(1)} KB`:""}</small></a></div>
        </div>
      </section>
      <section className="pic-process"><div className="pic-process-heading"><div><strong>设计过程</strong><span aria-live="polite">{playing?"播放中":step===6?"已到最终版图":"可选择阶段查看"} · {step+1} / 7</span></div><div className="pic-playback"><label>速度<select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label><button aria-label={playing?"暂停回放":"继续回放"} disabled={!geometry} onClick={()=>{if(step===6)setStep(0);setPlaying(!playing);setTab("layout");}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?"暂停":"播放"}</button><button aria-label="下一步" disabled={step===6||!geometry} onClick={()=>{setPlaying(false);setStep(s=>Math.min(6,s+1));setTab("layout");}}><StepForward size={14}/>单步</button><button aria-label="重置过程" onClick={()=>{setStep(0);setPlaying(false);setTab("layout");}}><RotateCcw size={14}/></button></div></div>
        <ol>{STAGES.map((stage,index)=><li key={stage.name}><button className={step===index?"current":step>index?"complete":""} aria-current={step===index?"step":undefined} onClick={()=>{setStep(index);setPlaying(false);setTab("layout");}}><span>{step>index?<Check size={13}/>:String(index+1).padStart(2,"0")}</span><div><strong>{stage.name}</strong><small>{stage.detail}</small></div></button></li>)}</ol>
        <div className="pic-event-log"><code>{String(step+1).padStart(2,"0")} / {STAGES[step].english}</code><p>{sample.id==='filterbank'?sample.events[step]:STAGES[step].detail}</p><span>几何构建演示</span></div>
      </section>
      <RepairShowcase />
      <details className="pic-credits"><summary>项目说明</summary><p>SpecPDA 是项目组设计的版图修复流程，展示内容包括缺陷定位、局部几何修改与复检。设计区提供参数化电路、层级结构和 GDS 交付；修复区选取结构不同且已完成修复的代表案例。设计动画按保存几何重建，修复动画使用实际归档输入与输出。</p></details>
    </main><footer className="pic-footer"><span>CircuitMind / Photonic Design</span><span>GDSII · μm · generic_tech</span><Link href="/">PCB 工作台 ↗</Link></footer>
  </div>;
}
