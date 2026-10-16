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

import gdstk

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
        cell = library.top_level()[0]
        polygons = cell.get_polygons()
        bounds = [[float(value) for value in point] for point in cell.bounding_box()]
        groups = {}
        for polygon in polygons:
            layer = f"{polygon.layer}/{polygon.datatype}"
            groups.setdefault(layer, []).append(
                [[round(float(x), 4), round(float(y), 4)] for x, y in polygon.points]
            )
        data = {
            "id": key, "cell": cell.name, "bounds": bounds,
            "unitMeters": library.unit, "polygonCount": len(polygons),
            "layers": [{"id": layer, "polygons": pts} for layer, pts in groups.items()],
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
