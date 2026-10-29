"""Export distinct successful archived runs; source tree is strictly read-only."""
import json, hashlib, shutil, tempfile, math
from pathlib import Path
import gdstk
P=Path(__file__).resolve().parents[1]; S=P.parent/'自动化设计/specpda_launch'; D=P/'public/pic/repair'; audit={}
def read(p):
    raw=p.read_bytes();audit[str(p.relative_to(S))]=hashlib.sha256(raw).hexdigest();return json.loads(raw)
def geo(p):
    audit[str(p.relative_to(S))]=hashlib.sha256(p.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory() as t:
        q=Path(t)/'mask.gds';shutil.copyfile(p,q);lib=gdstk.read_gds(str(q));c=max([c for c in lib.top_level() if not c.name.startswith('$$$')],key=lambda c:len(c.get_polygons()))
        return {'bounds':c.bounding_box(),'paths':[{'layer':v.layer,'points':[[round(float(x),5),round(float(y),5)] for x,y in v.points]} for v in c.get_polygons()]}
rows=[json.loads(l) for l in (S/'SpecPDA-drc-benchmark-v2/datasets/drc_public/v2/dataset_manifest.jsonl').read_text().splitlines()]
names={
'corridor_four':('四通道波导走线','多条波导在受限区域并行通过，连接前后端口。','内侧边界出现局部凹口，形成过窄的间隙。','局部替换边界，展开凹口区域，保持通道端点。'),
'ring_cascade_two':('双微环级联滤波结构','两个微环沿总线级联，属于谐振型光学滤波电路。','总线局部线宽缩窄，红框对应真实线宽检查标记。','调整局部总线轮廓，恢复最小线宽，保留环及耦合区域。'),
'tracked_mzi':('双臂 MZI','输入光被分到两条干涉臂，再经合束端输出。','波导边缘局部凹口导致几何规则违例。','修改标记附近的轮廓，保留双臂拓扑及外部端口。'),
'corridor_pair':('双通道耦合走线','两条波导在相邻通道中弯折，用于器件间光路连接。','相邻走线局部凹口过窄，影响几何间隙。','修整局部边界，消除凹口违例。'),
'coupler_escape':('耦合器引出波导','将耦合区的两个光路引出到外部连接端。','两处波导截面过窄，需要分别修正。','调整两处窄颈宽度，保留耦合器引出方向。'),
'route_serpentine':('蛇形延迟波导','利用折返走线在有限面积内增加光程。','折返路径存在局部线宽不足。','修复窄颈，保留蛇形路径及其连接端点。')}
out=[]
for f in sorted((S/'SpecPDA-drc-repair/runs/drc-repair-v2-first/trials/photonic').glob('*/run/summary.json')):
    sm=read(f)
    if not sm['success'] or sm['residual_drv']!=0:continue
    row=next(r for r in rows if r['artifacts'].get('initial_gds',{}).get('sha256')==sm['initial_gds_hash']);parent=row['plan']['parent_design_id'];name,desc,problem,fix=names[parent]
    initial=read(f.parent/'initial_drc.json');final=read(f.parent/'final_drc.json');ident=sm['task_id'];dbu=initial['dbu_um'];fault={'width':'线宽不足','notch':'局部凹口','two_widths':'双处窄颈'}[row['plan']['fault']]
    c={'id':ident,'device':name,'fault':fault,'description':desc,'problem':problem,'fix':fix,'success':True,'initial':sm['initial_drv'],'residual':0,'accepted':sm['accepted'],'candidates':sm['candidates'],'rollbacks':sm['rollbacks'],'runtime':sm['runtime_s'],'connectivity':sm['connectivity_status'],'optical':sm['optical_status'],'before':geo(f.parent/'before.gds'),'after':geo(f.parent/'after.gds'),'markers':[{'rule':v['rule_id'],'box':[n*dbu for n in v['bbox_dbu']],'limit':v.get('limit_value')} for v in initial['violations']],'remaining':[], 'evidence':{'kind':'actual_repair_run','source':str(f.parent.relative_to(S)),'deck':initial['deck'],'referenceUsedAsOutput':False}}
    # Remove local absolute paths from the public deck record.
    c['evidence']['deck']={k:v for k,v in initial['deck'].items() if k in ['name','version','kind','rule_ids','content_sha256']}
    (D/(ident+'.json')).write_text(json.dumps(c,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    for state in ['before','after']:shutil.copyfile(f.parent/(state+'.gds'),D/(ident+'-'+state+'.gds'))
    out.append({k:c[k] for k in ['id','device','fault','success','initial','residual']})
(D/'gallery.json').write_text(json.dumps({'cases':out,'selection':'Distinct successful examples, not a population success-rate evaluation.'},ensure_ascii=False,indent=2),encoding='utf8')
assert all(hashlib.sha256((S/p).read_bytes()).hexdigest()==h for p,h in audit.items())
(D/'gallery-audit.json').write_text(json.dumps({'sourceUnchanged':True,'files':audit},indent=2),encoding='utf8')

# Additional complete, parameterized SCISSOR layout: eight circular rings on one bus.
lib=gdstk.Library(unit=1e-6,precision=1e-9);top=lib.new_cell('SCISSOR_8_RING_FILTER');polys=[];stages=[];parts=[]
for i in range(8):
    radius=8+i*.25;cx=i*25;cy=radius+.7;cell=lib.new_cell(f'RING_{i+1}_R{radius:g}')
    ring=gdstk.ellipse((0,0),radius+.25,inner_radius=radius-.25,tolerance=.002,layer=1);cell.add(ring);top.add(gdstk.Reference(cell,(cx,cy)))
    ring=ring.copy().translate(cx,cy);polys.append(ring);stages.append(1);parts.append({'id':f'R{i+1}','kind':'RING','cell':cell.name,'bounds':ring.bounding_box()})
bus=gdstk.rectangle((-20,-.25),(200,.25),layer=1);top.add(bus);polys.append(bus);stages.append(2)
with tempfile.TemporaryDirectory() as t:
    q=Path(t)/'filter.gds';lib.write_gds(str(q));shutil.copyfile(q,P/'public/pic/filterbank.gds')
raw=(P/'public/pic/filterbank.gds').read_bytes()
data={'id':'filterbank','cell':top.name,'bounds':top.bounding_box(),'unitMeters':1e-6,'polygonCount':len(polys),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'provenance':'Local parameterized SCISSOR geometry. Optical transfer function not simulated.','parts':parts,'layers':[{'id':'1/0','polygons':[[[round(float(x),5),round(float(y),5)] for x,y in p.points] for p in polys],'construction':stages}]}
(P/'public/pic/filterbank.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf8')
print('Distinct actual repair cases:',len(out),'; source unchanged; 8-ring filter exported.')
