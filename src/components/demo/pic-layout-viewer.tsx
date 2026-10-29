"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Crosshair, Maximize2, Minus, Plus } from "lucide-react";
import { Geometry, layerStyle, STAGES } from "./pic-design-data";
import Image from "next/image";
import { assetPath } from "./pic-design-data";

export function LayoutViewer({ geometry, visible, step, playing, zoom, setZoom, showLabels }: {
  geometry: Geometry; visible: string[]; step: number; playing: boolean;
  zoom: number; setZoom: (value: number) => void; showLabels: boolean;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [native,setNative]=useState(true);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const id = useId().replace(/:/g, "");
  const [[x0, y0], [x1, y1]] = geometry.bounds;
  const width = x1-x0, height = y1-y0;
  const padding = Math.max(width,height)*.12;
  const viewWidth = width+padding*2, viewHeight = height+padding*2;
  const centerX = (x0+x1)/2, centerY = -(y0+y1)/2;
  const labelSize = Math.max(width,height)/58;
  const unit = geometry.unitMeters*1e6;
  const geometryStep=[0,1,3,4][step];
  const scaleLength = width >= 200 ? 100 : width >= 50 ? 20 : 5;
  const segments = useMemo(() => geometry.layers.flatMap(layer => {
    const buckets = new Map<string, { stage: number; band: number; paths: string[]; count: number }>();
    layer.polygons.forEach((points,i) => {
      const stage = layer.construction[i];
      const middle = points.reduce((sum,point) => sum+point[0],0)/points.length;
      const band = Math.min(7,Math.max(0,Math.floor((middle-x0)/width*8)));
      const key = `${stage}-${band}`;
      if (!buckets.has(key)) buckets.set(key,{ stage,band,paths:[],count:0 });
      const bucket = buckets.get(key)!;
      bucket.paths.push("M"+points.map(p => `${p[0]},${-p[1]}`).join("L")+"Z");
      bucket.count++;
    });
    return [...buckets.values()].map(bucket => ({ ...bucket,layer:layer.id,d:bucket.paths.join("") }));
  }).sort((a,b) => Number(a.layer === "1/0")-Number(b.layer === "1/0")),[geometry,width,x0]);
  const shown=segments.filter(s=>s.stage<=geometryStep&&visible.includes(s.layer));
  const visibleCount = shown.reduce((sum,s) => sum+s.count,0);
  if(step===3&&native)return <div className="pic-native-view"><div className="pic-native-title"><span>KLayout 原生渲染 · {geometry.cell}</span><button onClick={()=>setNative(false)}>分层几何检查</button></div><a href={assetPath(`/pic/native/${geometry.id}.png`)} target="_blank" rel="noreferrer"><Image src={assetPath(`/pic/native/${geometry.id}.png`)} alt={`${geometry.id} 实际 GDS 的 KLayout 原生渲染`} width={1800} height={1100} unoptimized/></a><p>由本机 KLayout 直接读取下载的 GDS 输出；点击查看原始分辨率。</p></div>;
  return <div className="pic-viewer" data-design-stage={step} data-visible-polygons={visibleCount}>
    <div className="pic-canvas-caption"><span>TOP / {geometry.cell}</span><span>{step === 0 ? "PLACEMENT OUTLINE" : STAGES[step].english.toUpperCase()}</span></div>
    <svg className="pic-geometry" viewBox={`${x0-padding} ${-y1-padding} ${viewWidth} ${viewHeight}`} role="img" aria-label={`${STAGES[step].name}阶段的真实 GDS 几何`} onPointerDown={e => {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current={ x:e.clientX,y:e.clientY,originX:pan.x,originY:pan.y };
    }} onPointerMove={e => {
      const box=e.currentTarget.getBoundingClientRect();
      const scale=Math.max(viewWidth/box.width,viewHeight/box.height);
      const px=(e.clientX-box.left-box.width/2)*scale+centerX;
      const py=(e.clientY-box.top-box.height/2)*scale+centerY;
      setCursor({x:((px-pan.x-centerX)/zoom+centerX)*unit,y:-((py-pan.y-centerY)/zoom+centerY)*unit});
      if(drag.current) setPan({x:drag.current.originX+(e.clientX-drag.current.x)*scale,y:drag.current.originY+(e.clientY-drag.current.y)*scale});
    }} onPointerUp={() => {drag.current=null;}} onPointerCancel={() => {drag.current=null;}} onPointerLeave={() => setCursor(null)}>
      <defs>{geometry.layers.map(layer => <pattern key={layer.id} id={`${id}-${layer.id.replace("/","-")}`} patternUnits="userSpaceOnUse" width={width/65} height={width/65} patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2={width/65} stroke={layerStyle(layer.id).color} strokeWidth={width/450}/></pattern>)}</defs>
      <g transform={`translate(${pan.x} ${pan.y}) translate(${centerX} ${centerY}) scale(${zoom}) translate(${-centerX} ${-centerY})`}>
        {shown.map(segment => <g key={`${segment.layer}-${segment.stage}-${segment.band}`} className={segment.stage===geometryStep&&playing ? "pic-build-piece" : ""} style={{animationDelay:`${segment.band*90}ms`}}>
          <path d={segment.d} fill={segment.layer==="1/0" ? layerStyle(segment.layer).color : `url(#${id}-${segment.layer.replace("/","-")})`} fillRule="nonzero" stroke={layerStyle(segment.layer).color} strokeWidth={segment.layer==="1/0" ? .6 : .35} vectorEffect="non-scaling-stroke" opacity={segment.layer==="1/0" ? 1 : .72}/>
        </g>)}
        {(step===0||showLabels)&&geometry.parts.map(part => {
          const [[ax,ay],[bx,by]]=part.bounds, pad=labelSize*.6;
          return <g key={part.id} className="pic-cell-outline">
            {step===0&&(geometry.id==='ring'?<g fill="none" stroke="#a2b29c" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="5 4"><circle cx="0" cy="-10.7" r="10"/><path d="M-14,0H14"/></g>:<rect x={ax-pad} y={-by-pad} width={bx-ax+pad*2} height={by-ay+pad*2} fill="#ffffff03" stroke="#818998" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="5 4"/>)}
            <text x={(ax+bx)/2} y={-by-labelSize*.9} textAnchor="middle" fontSize={labelSize} fill={step===0 ? "#b1b9c6" : "#a7aeb8"}>{part.id}</text>
          </g>;
        })}
        {step>=4&&<g stroke="#747d8b" strokeWidth=".7"><path vectorEffect="non-scaling-stroke" d={`M${x0},${-y0+padding*.45}H${x1}M${x0},${-y0+padding*.3}v${padding*.3}M${x1},${-y0+padding*.3}v${padding*.3}`} fill="none"/><text x={centerX} y={-y0+padding*.8} stroke="none" fill="#a7adb6" fontSize={labelSize*.8} textAnchor="middle">{(width*unit).toFixed(1)} μm</text></g>}
      </g>
      <g transform={`translate(${x0-padding*.5} ${-y0+padding*.95})`} stroke="#8e98a7" strokeWidth="1"><path vectorEffect="non-scaling-stroke" d={`M0,${-labelSize*.3}V0H${scaleLength/unit*zoom}v${-labelSize*.3}`} fill="none"/><text x="0" y={-labelSize*.7} fill="#8e98a7" stroke="none" fontSize={labelSize*.75}>{scaleLength} μm</text></g>
    </svg>
    {step===0&&<div className="pic-floorplan-note">器件范围与放置规划<span>{geometry.parts.length} 个主要模块 · 物理位置来自 GDS</span></div>}
    <div className="pic-canvas-bottom"><button onClick={()=>setNative(true)} hidden={step!==3}>返回 KLayout 原生图</button><div className="pic-zoom"><button aria-label="缩小版图" onClick={() => setZoom(Math.max(.5,zoom-.25))}><Minus size={15}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="放大版图" onClick={() => setZoom(Math.min(5,zoom+.25))}><Plus size={15}/></button><button aria-label="适合窗口" onClick={() => {setZoom(1);setPan({x:0,y:0});}}><Maximize2 size={15}/></button></div></div>
    <div className="pic-coordinate"><span><Crosshair size={11}/>{cursor ? `x ${cursor.x.toFixed(3)} · y ${cursor.y.toFixed(3)} μm` : "拖动平移 · 工艺层可独立开关"}</span><span>{visibleCount.toLocaleString("en-US")} polygons</span></div>
  </div>;
}
