"use client";
import { useEffect, useState } from "react";
import { assetPath } from "./pic-design-data";

type Item={id:string;device:string;fault:string;success:boolean;initial:number;residual:number;accepted:number;rollbacks:number;candidates:number;runtime:number;termination:string};
type Marker={rule:string;box:number[];limit:number};
type Shape={bounds:number[][];paths:{layer:number;points:number[][]}[]};
type Case=Item&{before:Shape;after:Shape;markers:Marker[];remaining:Marker[];connectivity:string;optical:string};
type Index={cases:Item[];total:number;successes:number;engine:string;rules:string;thresholds:string;scope:string};
const STEPS=["读取失败版图","定位规则违例","局部几何修改","重新执行检查"];

function Mask({shape,markers,bounds,label}: {shape:Shape;markers:Marker[];bounds:number[];label:string}){
  const [x,y,w,h]=bounds;
  return <svg viewBox={`${x} ${-y-h} ${w} ${h}`} role="img" aria-label={label} className="repair-mask">
    {shape.paths.map((p,i)=><path key={i} d={"M"+p.points.map(p=>`${p[0]},${-p[1]}`).join("L")+"Z"} fill="#c0d99d" stroke="#c0d99d" strokeWidth=".45" vectorEffect="non-scaling-stroke" fillRule="evenodd"/>)}
    {markers.map((m,i)=><rect key={i} x={m.box[0]} y={-m.box[3]} width={Math.max(m.box[2]-m.box[0],w*.01)} height={Math.max(m.box[3]-m.box[1],h*.015)} fill="#ff765830" stroke="#ff7658" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{m.rule} · limit {m.limit} μm</title></rect>)}
  </svg>;
}

export function RepairShowcase(){
  const [index,setIndex]=useState<Index|null>(null),[selected,setSelected]=useState(""),[data,setData]=useState<Case|null>(null);
  const [filter,setFilter]=useState("全部"),[stage,setStage]=useState(0),[playing,setPlaying]=useState(false),[focus,setFocus]=useState(true),[error,setError]=useState("");
  useEffect(()=>{fetch(assetPath('/pic/repair/index.json')).then(r=>{if(!r.ok)throw Error('案例索引加载失败');return r.json();}).then((d:Index)=>{setIndex(d);setSelected(d.cases.find(c=>c.success)?.id??d.cases[0].id);}).catch(e=>setError(e.message));},[]);
  useEffect(()=>{if(!selected)return;const c=new AbortController();fetch(assetPath(`/pic/repair/${selected}.json`),{signal:c.signal}).then(r=>{if(!r.ok)throw Error('案例加载失败');return r.json();}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[selected]);
  useEffect(()=>{if(!playing)return;const timer=setTimeout(()=>{if(stage<3)setStage(stage+1);else setPlaying(false);},2000);return()=>clearTimeout(timer);},[stage,playing]);
  if(error)return <p role="alert">{error}</p>;
  if(!index)return <p>读取修复案例…</p>;
  const items=index.cases.filter(c=>filter==='全部'||c.fault===filter||filter==='待修复'&&!c.success);
  let bounds=[0,0,1,1];
  if(data){
    const a=data.before.bounds,b=data.after.bounds;
    let x0=Math.min(a[0][0],b[0][0]),y0=Math.min(a[0][1],b[0][1]),x1=Math.max(a[1][0],b[1][0]),y1=Math.max(a[1][1],b[1][1]);
    if(focus&&data.markers.length){x0=Math.min(...data.markers.map(m=>m.box[0]));y0=Math.min(...data.markers.map(m=>m.box[1]));x1=Math.max(...data.markers.map(m=>m.box[2]));y1=Math.max(...data.markers.map(m=>m.box[3]));}
    const pad=Math.max(x1-x0,y1-y0,.5)*(focus?.7:.1);bounds=[x0-pad,y0-pad,x1-x0+pad*2,y1-y0+pad*2];
  }
  return <section className="repair-section" id="repair">
    <div className="repair-heading"><div><span>SPEC PDA / GEOMETRY REPAIR</span><h2>版图检查与局部修复</h2><p>输入失败 GDS，根据规则标记修改几何，复检后保留或回滚候选。</p></div><div className="repair-goal">工程目标<strong>DRC-free</strong><small>以指定规则集的复检结果为准</small></div></div>
    <div className="repair-metrics"><div><small>已归档题目</small><b>{index.total}</b></div><div><small>本批次零剩余违例</small><b>{index.successes} / {index.total}</b></div><div><small>检查引擎</small><b>{index.engine}</b></div><div><small>规则阈值</small><b>{index.thresholds}</b></div></div>
    <p className="repair-scope">{index.rules} · {index.scope} 数据覆盖本批次全部题目，未仅选取成功案例。</p>
    <div className="repair-filter" aria-label="缺陷类型">{['全部',...new Set(index.cases.map(c=>c.fault)),'待修复'].map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    <div className="repair-workspace"><aside className="repair-case-list" aria-label="修复案例">{items.map(c=><button key={c.id} aria-pressed={selected===c.id} onClick={()=>{if(selected!==c.id){setData(null);setSelected(c.id);}setStage(0);setPlaying(false);}}><span>{c.device}<i className={c.success?'clean':'pending'}>{c.success?'已清零':'有残留'}</i></span><strong>{c.fault}</strong><small>{c.id}</small><small>违例 {c.initial} → {c.residual}</small></button>)}</aside>
      <div className="repair-main">{!data?<p>读取案例…</p>:<>
        <div className="repair-toolbar"><div><strong>{data.device} / {data.fault}</strong><small>{data.id}</small></div><button aria-pressed={focus} onClick={()=>setFocus(!focus)}>{focus?'查看全局':'定位缺陷区域'}</button><button onClick={()=>{setStage(0);setPlaying(true);}}>回放修复记录</button></div>
        <div className="repair-compare"><div><header>修复前 <span>{data.initial} 个规则标记</span></header><Mask shape={data.before} markers={stage>=1?data.markers:[]} bounds={bounds} label="修复前 GDS 与规则标记"/></div><div><header>{stage>=2?'修复候选 / 最终保留结果':'待生成修复候选'}<span>{stage>=3?`剩余 ${data.residual} 个规则标记`:''}</span></header>{stage>=2?<Mask shape={data.after} markers={stage>=3?data.remaining:[]} bounds={bounds} label="修复后 GDS 与剩余规则标记"/>:<div className="repair-placeholder">{stage===0?'读取失败版图与规则集':'根据标记位置构建局部修改候选'}</div>}</div></div>
        <div className="repair-steps">{STEPS.map((s,i)=><button key={s} aria-current={stage===i?'step':undefined} onClick={()=>{setStage(i);setPlaying(false);}}><span>0{i+1}</span>{s}</button>)}</div>
        <div className="repair-detail"><div><h3>{STEPS[stage]}</h3><p>{stage===0?`输入 ${data.device} 的失败版图，初检产生 ${data.initial} 个规则标记。`:stage===1?`${data.fault}：红框标出原始 KLayout marker 区域。可切换全局视图查看与其余结构的关系。`:stage===2?`本次搜索评估 ${data.candidates} 个候选，接受 ${data.accepted} 次修改，回滚 ${data.rollbacks} 次。右侧显示实际保留的 GDS。`:`复检剩余 ${data.residual} 个标记；${data.success?'在所列规则范围内达到零违例。':'仍有违例，保留为未完成案例。'}`}</p></div><dl><div><dt>规则违例</dt><dd>{data.initial} → {data.residual}</dd></div><div><dt>归档耗时</dt><dd>{data.runtime.toFixed(2)} s</dd></div><div><dt>连接 / 光学检查</dt><dd>本轨道未评估</dd></div></dl></div>
        <div className="repair-download"><a href={assetPath(`/pic/repair/${data.id}-before.gds`)} download>失败 GDS ↓</a><a href={assetPath(`/pic/repair/${data.id}-after.gds`)} download>保留结果 GDS ↓</a><a href={assetPath(`/pic/repair/${data.id}.json`)} download>检查记录 JSON ↓</a><span>{playing?'回放中 · 归档结果':'SpecPDA 几何修复模块 · 确定性局部搜索'}</span></div>
      </>}</div></div>
  </section>;
}
