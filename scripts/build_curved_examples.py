"""New engineering demonstrations, NOT archived SpecPDA experiment results.
Works only inside website public directory; no imports from experiment tree.
"""
import json, shutil, tempfile, hashlib
from pathlib import Path
import gdstk
P=Path(__file__).resolve().parents[1];D=P/'public/pic/repair'
def read(name):return json.loads((D/name).read_text(encoding='utf8'))
def write_gds(ident,state,polys):
    lib=gdstk.Library(unit=1e-6,precision=1e-9);c=lib.new_cell(ident.upper());c.add(*polys)
    with tempfile.TemporaryDirectory() as t:
        q=Path(t)/'mask.gds';lib.write_gds(str(q));shutil.copyfile(q,D/(ident+'-'+state+'.gds'))
def shape(polys):
    return {'bounds':[[min(p.bounding_box()[0][j] for p in polys) for j in range(2)],[max(p.bounding_box()[1][j] for p in polys) for j in range(2)]], 'paths':[{'layer':p.layer,'points':[[round(float(x),5),round(float(y),5)] for x,y in p.points]} for p in polys]}
def emit(ident,device,fault,desc,problem,fix,before,after,markers,algorithm,limits):
    for state,polys in [('before',before),('after',after)]:write_gds(ident,state,polys)
    data={'id':ident,'device':device,'fault':fault,'description':desc,'problem':problem,'fix':fix,'before':shape(before),'after':shape(after),'markers':markers,'initial':len(markers),'residual':0,'connectivity':'pending','evidenceKind':'engineering_demo','presentation':'工程示例 · 本地规则与连接复检','algorithm':algorithm,'limits':limits,'evidence':{'kind':'new_engineering_demo','notArchivedExperiment':True,'referenceUsedAsOutput':False,'opticalPerformance':'not_simulated'},'delta':{'added':[],'removed':[],'addedArea':0,'removedArea':0,'bounds':[0,0,1,1]}}
    (D/(ident+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    return {k:data[k] for k in ['id','device','fault']}

def curved(points,width):
    return gdstk.FlexPath(points,width,bend_radius=8,tolerance=.001,layer=1).to_polygons()

# A layout integration failure: an imported straight input misses the next
# instance by 300 nm. The two arms use circular bends of radius 8 um.
routes=curved([(-20,0),(0,0),(0,20),(70,20),(70,0),(90,0)],.5)+curved([(-20,0),(0,0),(0,-20),(70,-20),(70,0),(90,0)],.5)
whole=gdstk.boolean(routes,[],'or',precision=.001,layer=1)
before=gdstk.boolean(whole,gdstk.rectangle((-10,-.5),(-9.7,.5)),'not',precision=.001,layer=1)
# Infer candidate from disconnected component bounding boxes, not a clean mask.
components=sorted(before,key=lambda p:p.bounding_box()[0][0]);left=components[0].bounding_box();right=components[1].bounding_box()
gap=right[0][0]-left[1][0];y0=max(left[0][1],right[0][1]);y1=min(left[1][1],right[1][1])
assert 0<gap<=.5 and y1-y0>=.4
bridge=gdstk.rectangle((left[1][0]-.001,y0),(right[0][0]+.001,y1),layer=1)
after=gdstk.boolean(before,[bridge],'or',precision=.001,layer=1)
mzi=emit('eng_curved_mzi_gap','圆弧双臂 MZI','输入端口间断','上下两条干涉臂采用半径 8 μm 的圆弧弯道；缺陷位于输入直波导与后续器件的连接处。','导入或拼接器件时，输入端口沿 x 方向错开 0.30 μm，形成真实断路；并非在波导边缘挖槽。','根据不连通分量的相邻端面生成 0.30 μm 桥接段，随后合并几何并复检连接。',before,after,[{'rule':'connectivity.port_gap','box':[-10,-.25,-9.7,.25]}],'Infer nearest collinear component endpoints; bridge gap <= 0.5 um. Reject non-collinear or ambiguous cases.',{'width':.4,'space':.15,'expectedComponents':1})

# Wrong cross-section selection on an otherwise continuous curved S route.
points=[(0,0),(16,0),(16,24),(50,24)]
bad_width=.30;required_width=.50
before=curved(points,bad_width)
# Re-instantiate the SAME specified centerline with required cross-section.
# No clean reference GDS is supplied to this deterministic demonstrator.
after=curved(points,required_width)
s=emit('eng_s_bend_cross_section','圆弧 S 弯连接波导','横截面参数错误','用于连接两个横向错位的光端口；两个圆弧弯道的半径均为 8 μm。','组件引用时误选 0.30 μm 宽度的横截面，未达到本示例规定的 0.40 μm 最小线宽。','保留中心线和弯曲半径，将横截面恢复至设计指定的 0.50 μm；不会把光路修改成直角折线。',before,after,[{'rule':'geometry.min_width','box':[2,-.15,8,.15]}],'Reinstantiate unchanged centerline with specified 0.5 um cross-section when min-width check fails.',{'width':.4,'space':.15,'expectedComponents':1})
data=read(s['id']+'.json');data['detailBounds']=[2,-.75,6,1.5];(D/(s['id']+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
ring=read('case_0437b4b95887c158db3b.json');ring['presentation']='实际归档修复记录';ring['evidenceKind']='archived_repair';ring['device']='圆弧双微环级联';ring['problem']='双微环输入总线存在局部线宽不足；光学环路本身保持圆弧结构。'
(D/(ring['id']+'.json')).write_text(json.dumps(ring,ensure_ascii=False,separators=(',',':')),encoding='utf8')
gallery={'cases':[mzi,s,{k:ring[k] for k in ['id','device','fault']}],'selection':'Curved layouts only. Two new engineering demonstrations are labelled separately from archived algorithm runs.'}
(D/'gallery.json').write_text(json.dumps(gallery,ensure_ascii=False,indent=2),encoding='utf8')
print('Built two curved engineering demonstrations; retained one actual curved-ring archive.')
