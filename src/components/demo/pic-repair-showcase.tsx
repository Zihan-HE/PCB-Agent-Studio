"use client";
import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { assetPath } from "./pic-design-data";
type Marker={rule:string;box:number[]};
type Shape={bounds:number[][];paths:{layer:number;points:number[][]}[]};
type Item={id:string;device:string;fault:string};
type Case=Item&{before:Shape;after:Shape;markers:Marker[];description:string;problem:string;fix:string;initial:number;residual:number;connectivity:string};
const STEPS=['读取完整结构','标记错误位置','放大缺陷区域','局部修复','检查结果'];
function extent(shape:Shape){const [[x,y],[xx,yy]]=shape.bounds;const p=Math.max(xx-x,yy-y)*.12;return [x-p,y-p,xx-x+2*p,yy-y+2*p];}
function Mask({shape,markers,bounds,label,zoomFrom}: {shape:Shape;markers:Marker[];bounds:number[];label:string;zoomFrom?:number[]}){
  const [x,y,w,h]=bounds;const vb=`${x} ${-y-h} ${w} ${h}`;
  return <svg className="repair-mask" viewBox={vb} role="img" aria-label={label}>
    {zoomFrom&&<animate attributeName="viewBox" from={`${zoomFrom[0]} ${-zoomFrom[1]-zoomFrom[3]} ${zoomFrom[2]} ${zoomFrom[3]}`} to={vb} dur="1.1s" fill="freeze"/>}
    {shape.paths.map((p,i)=><path key={i} d={'M'+p.points.map(p=>`${p[0]},${-p[1]}`).join('L')+'Z'} fill="#50bfff" stroke="#86d5ff" strokeWidth=".7" vectorEffect="non-scaling-stroke" fillRule="evenodd"/>)}
    {markers.map((m,i)=><rect key={i} x={m.box[0]} y={-m.box[3]} width={Math.max(m.box[2]-m.box[0],w*.007)} height={Math.max(m.box[3]-m.box[1],h*.01)} fill="#ff426b33" stroke="#ff5577" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{m.rule}</title></rect>)}
  </svg>;
}
export function RepairShowcase(){
  const [items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState(''),[data,setData]=useState<Case|null>(null);
  const [stage,setStage]=useState(4),[playing,setPlaying]=useState(false),[error,setError]=useState('');
  useEffect(()=>{fetch(assetPath('/pic/repair/gallery.json')).then(r=>{if(!r.ok)throw Error('无法读取案例');return r.json();}).then(d=>{setItems(d.cases);setSelected(d.cases[0].id);}).catch(e=>setError(e.message));},[]);
  useEffect(()=>{if(!selected)return;const c=new AbortController();fetch(assetPath(`/pic/repair/${selected}.json`),{signal:c.signal}).then(r=>r.json()).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[selected]);
  useEffect(()=>{if(!playing)return;const t=setTimeout(()=>{if(stage<4)setStage(stage+1);else setPlaying(false);},2200);return()=>clearTimeout(t);},[stage,playing]);
  let detail=[0,0,1,1],overview=[0,0,1,1];
  if(data){overview=extent(data.before);const m=data.markers[0];if(m){const [x,y,xx,yy]=m.box;const span=Math.max(xx-x,yy-y,.3),p=span*.7;detail=[x-p,y-p,xx-x+2*p,yy-y+2*p];}}
  return <section className="repair-section" id="repair">
    <div className="repair-heading"><div><span>SPECPDA / LAYOUT REPAIR</span><h2>SpecPDA 版图修复</h2><p>自主设计的 SpecPDA 修复流程：定位几何违例、生成局部修改、复检连接与设计规则。</p></div><div className="repair-goal">修复目标<strong>DRC-free</strong></div></div>
    <div className="repair-capabilities">{['线宽不足','局部凹口','多处窄颈','耦合区走线','双微环级联','多通道互连'].map(t=><span key={t}>{t}</span>)}</div>
    <p className="repair-selection-note">代表性修复案例 · 下列结果来自已完成的修复记录。</p>
    {error?<p role="alert">{error}</p>:<div className="repair-workspace"><aside className="repair-case-list" aria-label="修复案例">{items.map(c=><button key={c.id} aria-pressed={selected===c.id} onClick={()=>{if(selected!==c.id){setSelected(c.id);setData(null);}setPlaying(false);setStage(4);}}><strong>{c.device}</strong><small>{c.fault}</small></button>)}</aside>
    <div className="repair-main">{!data?<p>读取案例…</p>:<>
      <div className="repair-toolbar"><div><strong>{data.device}</strong><small>{data.fault}</small></div><button className="repair-play" aria-label={playing?'暂停修复演示':'播放修复演示'} onClick={()=>{if(!playing)setStage(0);setPlaying(!playing);}}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><button aria-label="重置修复演示" onClick={()=>{setStage(0);setPlaying(false);}}><RotateCcw size={15}/></button></div>
      <div className="repair-triptych">
        <div><header><b>01</b> 失败版图<span>完整器件 / 电路</span></header><Mask shape={data.before} markers={stage>=1?data.markers:[]} bounds={overview} label="失败版图完整结构"/><p>{data.description}</p></div>
        <div><header><b>02</b> 错误局部放大<span>红框为规则标记</span></header>{stage>=2?<Mask key={playing?`zoom-${stage}`:'detail'} shape={data.before} markers={data.markers.slice(0,1)} bounds={detail} zoomFrom={playing&&stage===2?overview:undefined} label="错误区域放大"/>:<div className="repair-placeholder">{stage===0?'读取器件与图层':'根据规则标记定位缺陷'}</div>}<p>{data.problem}</p></div>
        <div className="repair-after"><header><b>03</b> 修复结果<span>{stage>=4?'复检通过':'实际修复 GDS'}</span></header>{stage>=3?<div className="repair-after-views"><Mask shape={data.after} markers={[]} bounds={overview} label="实际修复结果完整结构"/><div className="repair-after-inset"><span>修复位置 · 与中栏相同倍率</span><Mask shape={data.after} markers={[]} bounds={detail} label="修复后局部对照"/></div></div>:<div className="repair-placeholder">等待局部修复</div>}<p>{data.fix}</p></div>
      </div>
      <div className="repair-steps">{STEPS.map((s,i)=><button key={s} aria-current={stage===i?'step':undefined} onClick={()=>{setStage(i);setPlaying(false);}}><span>0{i+1}</span>{s}</button>)}</div>
      <div className="repair-detail"><div><h3>{STEPS[stage]}</h3><p>{stage<2?data.description:stage===2?data.problem:stage===3?data.fix:`该案例的几何规则复检通过${data.connectivity==='passed'?'，连接检查通过':''}。可下载实际输入、输出和检查记录。`}</p></div><dl><div><dt>处理部位</dt><dd>{data.fault}</dd></div><div><dt>结果</dt><dd>{stage===4?'已修复':'演示中'}</dd></div></dl></div>
      <div className="repair-download"><a href={assetPath(`/pic/repair/${data.id}-before.gds`)} download>失败 GDS ↓</a><a href={assetPath(`/pic/repair/${data.id}-after.gds`)} download>修复 GDS ↓</a><a href={assetPath(`/pic/repair/${data.id}.json`)} download>检查记录 ↓</a><span>SpecPDA · 归档结果演示</span></div>
    </>}</div></div>}
  </section>;
}
