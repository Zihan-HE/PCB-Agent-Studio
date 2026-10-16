"""Export existing GDS artifacts into browser geometry. No invented layout data.

Run in the local photonics environment; the web app needs only the exported files.
Usage: python scripts/export_pic_assets.py --source-root /path/to/PICasso
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import math

import gdstk


def design_root(library):
    """KLayout's $$$CONTEXT_INFO$$$ references a catalog, not the chip."""
    cells = [c for c in library.cells if not c.name.startswith('$$$')]
    used = {r.cell.name for c in cells for r in c.references}
    roots = [c for c in cells if c.name not in used]
    if len(roots) != 1:
        raise ValueError(f'Expected one physical design root, got {[c.name for c in roots]}')
    return roots[0]


def construction_geometry(root, case):
    polygons, stages, parts = [], [], []

    def walk(cell, matrix, origin, ancestors):
        for polygon in cell.get_polygons(depth=0):
            copy = polygon.copy()
            # The reference trees here use rotation/reflection and unit scale.
            points = [(matrix[0] * x + matrix[1] * y + origin[0],
                       matrix[2] * x + matrix[3] * y + origin[1]) for x, y in polygon.points]
            copy = gdstk.Polygon(points, layer=copy.layer, datatype=copy.datatype)
            optical = copy.layer == 1 and copy.datatype == 0
            module = any(n.startswith(('straight_pin', 'mmi1x2')) for n in ancestors + [cell.name])
            device = module or (case == 'ring' and cell.name.startswith('bend'))
            polygons.append(copy)
            stages.append(1 if optical and device else 2 if optical else 3)
        for ref in cell.references:
            angle, mag = ref.rotation or 0, ref.magnification or 1
            co, si = math.cos(angle) * mag, math.sin(angle) * mag
            sign = -1 if ref.x_reflection else 1
            local = (co, -si * sign, si, co * sign)
            a, b, c, d = matrix
            e, f, g, h = local
            combined = (a*e+b*g, a*f+b*h, c*e+d*g, c*f+d*h)
            offsets = ref.repetition.get_offsets() if ref.repetition.size else [(0, 0)]
            for offset in offsets:
                x, y = ref.origin[0] + offset[0], ref.origin[1] + offset[1]
                translated = (a*x+b*y+origin[0], c*x+d*y+origin[1])
                name = ref.cell.name
                is_part = (case == 'ring' and name.startswith('ring_single')) or \
                    (case == 'qam' and name.startswith(('mzi_', 'mmi1x2')) and not any(n.startswith('mzi_') for n in ancestors + [cell.name])) or \
                    (case == 'mzm' and name.startswith(('straight_pin', 'mmi1x2')))
                if is_part:
                    box = ref.cell.bounding_box()
                    corners = [(combined[0]*xx+combined[1]*yy+translated[0],
                                combined[2]*xx+combined[3]*yy+translated[1])
                               for xx in (box[0][0], box[1][0]) for yy in (box[0][1], box[1][1])]
                    kind = 'RING' if name.startswith('ring') else 'MZI' if name.startswith('mzi') else 'PHASE' if name.startswith('straight_pin') else 'MMI'
                    parts.append({'id': f'{kind}{sum(p["kind"] == kind for p in parts)+1}', 'kind': kind,
                                  'cell': name, 'bounds': [[min(p[0] for p in corners), min(p[1] for p in corners)],
                                                         [max(p[0] for p in corners), max(p[1] for p in corners)]]})
                walk(ref.cell, combined, translated, ancestors + [cell.name])
    walk(root, (1, 0, 0, 1), (0, 0), [])
    return polygons, stages, parts

parser = argparse.ArgumentParser()
parser.add_argument("--source-root", type=Path, required=True)
args = parser.parse_args()
destination = Path(__file__).resolve().parents[1] / "public" / "pic"
destination.mkdir(parents=True, exist_ok=True)
cases = [
    ("ring", "manual_ring/output/ring.gds", "Local single-bus ring example, generated from YAML using gdsfactory generic_tech.", "local-yaml"),
    ("mzm", "output/author_notebook_replay/author_cell4_single_mzm.gds", "PICasso author notebook cell 4, local replay with gdsfactory API compatibility alias.", "reference-replay"),
    ("qam", "output/author_notebook_replay/author_cell6_8qam.gds", "PICasso author notebook cell 6, local replay with gdsfactory API compatibility alias.", "reference-replay"),
]
for key, relative, provenance, mode in cases:
    original = args.source_root / relative
    with tempfile.TemporaryDirectory(prefix="pic_export_") as temp:
        ascii_path = Path(temp) / "source.gds"
        shutil.copyfile(original, ascii_path)
        library = gdstk.read_gds(str(ascii_path))
        cell = design_root(library)
        polygons, stages, parts = construction_geometry(cell, key)
        if len(polygons) != len(cell.get_polygons()):
            raise ValueError('Construction geometry lost polygons')
        bounds = [[float(value) for value in point] for point in cell.bounding_box()]
        groups = {}
        group_stages = {}
        for polygon, stage in zip(polygons, stages):
            layer = f"{polygon.layer}/{polygon.datatype}"
            groups.setdefault(layer, []).append(
                [[round(float(x), 4), round(float(y), 4)] for x, y in polygon.points]
            )
            group_stages.setdefault(layer, []).append(stage)
        data = {
            "id": key, "cell": cell.name, "bounds": bounds,
            "unitMeters": library.unit, "polygonCount": len(polygons),
            "layers": [{"id": layer, "polygons": pts, "construction": group_stages[layer]} for layer, pts in groups.items()],
            "parts": parts, "constructionMode": "reconstructed_from_final_gds_hierarchy",
            "excludedMetadataCell": "$$$CONTEXT_INFO$$$" if any(c.name == '$$$CONTEXT_INFO$$$' for c in library.cells) else None,
            "provenance": provenance, "mode": mode,
            "sha256": hashlib.sha256(original.read_bytes()).hexdigest(),
            "bytes": original.stat().st_size,
            "verification": {"gdsParsed": True, "fullDrc": "not_run", "lvs": "not_run", "physicalPerformance": "not_verified"},
        }
        (destination / f"{key}.json").write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        shutil.copyfile(original, destination / f"{key}.gds")
        print(key, len(polygons), len(groups), "layers", original.stat().st_size, "bytes")
shutil.copyfile(args.source_root / "manual_ring/ring.yaml", destination / "ring.yaml")
shutil.copyfile(args.source_root / "LICENSE", destination / "PICasso-LICENSE.txt")
