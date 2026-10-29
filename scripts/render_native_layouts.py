"""Run using installed KLayout -z -nc -r. Reads only copied website GDS files."""
import pya, json, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public/pic'
dest=root/'native';dest.mkdir(exist_ok=True)
app=pya.Application.instance();window=app.main_window()
def open_view(path, cell_name=None):
    cv=window.load_layout(str(path),0);view=window.current_view()
    ly=cv.layout()
    cells=[c for c in ly.each_cell() if c.name==cell_name] if cell_name else [c for c in ly.top_cells() if not c.name.startswith('$$$')]
    if not cells:
        used={i.cell_index for c in ly.each_cell() if not c.name.startswith('$$$') for i in c.each_inst()}
        cells=[c for c in ly.each_cell() if not c.name.startswith('$$$') and c.cell_index() not in used]
    cell=cells[0];view.select_cell(cell.cell_index(),0);view.add_missing_layers();view.max_hier()
    view.set_config('background-color','#080c14');view.set_config('grid-visible','true')
    it=view.begin_layers()
    while not it.at_end():
        lp=it.current();n=lp.source_layer
        colors={1:0x57c4ff,3:0x897aff,40:0xffe266,41:0x56d3a5,43:0xffb05a,44:0xff86c3,45:0x72d9df,49:0xc4c9d4}
        lp.fill_color=colors.get(n,0xaaaaaa);lp.frame_color=lp.fill_color;lp.dither_pattern=0 if n==1 else 3
        view.set_layer_properties(it,lp);it.next()
    view.zoom_fit()
    return view,ly,cell
manifest=[]
for ident in ['ring','mzm','qam','filterbank']:
    metadata=json.loads((root/(ident+'.json')).read_text(encoding='utf8'))
    view,ly,cell=open_view(root/(ident+'.gds'),metadata['cell'])
    view.save_image(str(dest/(ident+'.png')),1800,1100)
    manifest.append({'id':ident,'renderer':'KLayout '+pya.Application.instance().version(),'cell':cell.name,'gdsSha256':hashlib.sha256((root/(ident+'.gds')).read_bytes()).hexdigest()})
    window.close_current_view()
gallery=json.loads((root/'repair/gallery.json').read_text(encoding='utf8'))
for item in gallery['cases']:
    ident=item['id'];path=root/'repair'/(ident+'.json');data=json.loads(path.read_text(encoding='utf8'))
    regions=[]
    for state in ['before','after']:
        layout=pya.Layout();layout.read(str(root/'repair'/(ident+'-'+state+'.gds')));top=layout.top_cell()
        region=pya.Region(top.begin_shapes_rec(layout.layer(1,0))).merged();regions.append(region)
    added=regions[1]-regions[0];removed=regions[0]-regions[1];delta=added+removed
    if delta.is_empty():raise RuntimeError('No geometric change: '+ident)
    dbu=layout.dbu
    def dump(r):return [[[round(p.x*dbu,6),round(p.y*dbu,6)] for p in poly.each_point_hull()] for poly in r.each()]
    b=delta.bbox();pad=max(b.width(),b.height(),300)*.7
    data['delta']={'added':dump(added),'removed':dump(removed),'addedArea':added.area()*dbu*dbu,'removedArea':removed.area()*dbu*dbu,'bounds':[(b.left-pad)*dbu,(b.bottom-pad)*dbu,(b.width()+2*pad)*dbu,(b.height()+2*pad)*dbu],'dbu':dbu}
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    for state in ['before','after']:
        view,ly,cell=open_view(root/'repair'/(ident+'-'+state+'.gds'))
        view.zoom_box(pya.DBox(*[v for pair in data['before']['bounds'] for v in pair]).enlarged(max(data['before']['bounds'][1][0]-data['before']['bounds'][0][0],data['before']['bounds'][1][1]-data['before']['bounds'][0][1])*.1))
        view.save_image(str(dest/(ident+'-'+state+'.png')),1200,800)
        window.close_current_view()
    print(ident,'added',data['delta']['addedArea'],'removed',data['delta']['removedArea'])
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print('KLayout rendering complete')
