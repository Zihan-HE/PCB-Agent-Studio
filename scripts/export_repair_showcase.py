"""Read-only extraction of saved experiments. Never imports or executes source code."""
import json, shutil, tempfile, hashlib, math
from pathlib import Path
import gdstk

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent / '自动化设计/specpda_launch/SpecPDA-drc-repair/runs/drc-repair-v1-final'
DEST = PROJECT / 'public/pic/repair'
DEST.mkdir(parents=True, exist_ok=True)
audit = {}
def read(path):
    raw = path.read_bytes()
    audit[str(path.relative_to(SOURCE))] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)
def geometry(path):
    audit[str(path.relative_to(SOURCE))] = hashlib.sha256(path.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix='web_gds_') as temp:
        local = Path(temp)/'input.gds'; shutil.copyfile(path, local)
        lib = gdstk.read_gds(str(local)); cells = [c for c in lib.top_level() if not c.name.startswith('$$$')]
        cell = max(cells, key=lambda c: len(c.get_polygons()))
        return {'bounds': cell.bounding_box(), 'paths': [{'layer': p.layer, 'points': [[round(float(x),4),round(float(y),4)] for x,y in p.points]} for p in cell.get_polygons()]}
def markers(report):
    return [{'rule': v['rule_id'], 'box': [round(n*report['dbu_um'],5) for n in v['bbox_dbu']], 'limit':v.get('limit_value')} for v in report.get('violations',[])]
faults = {'width_neck':'局部线宽不足','two_width_necks':'双处窄颈','spacing_encroachment':'局部间距不足','combined_width_spacing':'线宽与间距复合缺陷'}
devices = {'WG':'直波导','CHAIN':'串接波导','PARALLEL':'并行波导','DC':'定向耦合器','MZI':'MZI','RING':'微环'}
cases=[]
for folder in sorted((SOURCE/'trials/photonic').iterdir()):
    run=folder/'run'
    if not (run/'summary.json').exists():continue
    summary=read(run/'summary.json'); initial=read(run/'initial_drc.json'); final=read(run/'final_drc.json'); history=read(run/'history.json')
    ident=folder.name; fault=ident.split('-',3)[-1]; device=ident.split('-')[1]
    case={'id':ident,'device':devices.get(device,device),'fault':faults.get(fault,fault),'success':summary['drc_clean'], 'initial':summary['initial_drv'],'residual':summary['residual_drv'],'accepted':summary['accepted'],'rollbacks':summary['rollbacks'],'candidates':summary['candidates'],'runtime':summary['runtime_s'],'connectivity':summary['connectivity_status'],'optical':summary['optical_status'], 'termination':summary['termination'], 'before':geometry(run/'before.gds'),'after':geometry(run/'after.gds'),'markers':markers(initial),'remaining':markers(final), 'actions':[{'operations':[c['operation'] for c in h.get('patch',{}).get('changes',[])], 'keys':list(h.keys())} for h in history]}
    for state in ['before','after']:shutil.copyfile(run/(state+'.gds'), DEST/(ident+'-'+state+'.gds'))
    (DEST/(ident+'.json')).write_text(json.dumps(case,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    cases.append({k:case[k] for k in ['id','device','fault','success','initial','residual','accepted','rollbacks','candidates','runtime','termination']})
summary={'cases':cases,'total':len(cases),'successes':sum(c['success'] for c in cases),'method':'SpecPDA / photonic','engine':'KLayout 0.30.12','rules':'specpda.mock_geometry@1.0.0','thresholds':'线宽 ≥ 0.4 μm；间距 ≥ 0.15 μm','scope':'公开几何测试规则；非代工厂签核。此批次未评估连接和光学性能。','source':'SpecPDA-drc-repair/runs/drc-repair-v1-final','selection':'完整 photonic 方法的 40 道题，包含成功与失败；非抽样成功率。'}
(DEST/'index.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
for relative, sha in audit.items():
    assert hashlib.sha256((SOURCE/relative).read_bytes()).hexdigest()==sha
(DEST/'source-audit.json').write_text(json.dumps({'readOnly':True,'files':audit,'verifiedUnchanged':True},indent=2),encoding='utf8')

# Replace the racetrack example with an actual circular single-bus ring.
lib=gdstk.Library(unit=1e-6,precision=1e-9);cell=lib.new_cell('CIRCULAR_RING_R10_GAP020')
polygons=[]; stages=[]
for i in range(4):
    p=gdstk.ellipse((0,10.7),10.25,inner_radius=9.75,initial_angle=i*math.pi/2,final_angle=(i+1)*math.pi/2,tolerance=.001,layer=1)
    cell.add(p);polygons.append(p);stages.append(1)
p=gdstk.rectangle((-14,-.25),(14,.25),layer=1);cell.add(p);polygons.append(p);stages.append(2)
with tempfile.TemporaryDirectory() as temp:
    target=Path(temp)/'ring.gds';lib.write_gds(str(target));shutil.copyfile(target,PROJECT/'public/pic/ring.gds')
raw=(PROJECT/'public/pic/ring.gds').read_bytes()
ring={'id':'ring','cell':cell.name,'bounds':cell.bounding_box(),'unitMeters':1e-6,'polygonCount':len(polygons),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'provenance':'Local circular ring: R=10 um, WG=0.5 um, gap=0.2 um. gdstk geometry.','layers':[{'id':'1/0','polygons':[[[round(float(x),4),round(float(y),4)] for x,y in p.points] for p in polygons],'construction':stages}],'parts':[{'id':'RING1','kind':'RING','cell':cell.name,'bounds':cell.bounding_box()}],'constructionMode':'local_parametric_geometry'}
(PROJECT/'public/pic/ring.json').write_text(json.dumps(ring,separators=(',',':')),encoding='utf8')
print(f'Exported {len(cases)} cases, {summary["successes"]} clean; source hashes unchanged. Circular ring exported.')
