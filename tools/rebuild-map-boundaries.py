"""Dissolve district SVG polygons into NUTS 2 and national silhouettes.

Requires Shapely only when regenerating the checked-in map geometry.
"""
from collections import defaultdict
from pathlib import Path
import json
import re

from shapely import Polygon, make_valid, union_all


def polygons(geometry):
    if geometry.geom_type == "Polygon":
        yield geometry
    elif hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            yield from polygons(part)


def outline(paths):
    rings = (
        [tuple(map(float, point.split())) for point in ring.split("L")]
        for path in paths
        for ring in re.findall(r"M([^Z]+)Z", path)
    )
    area = union_all([part for ring in rings for part in polygons(make_valid(Polygon(ring)))])
    # Use exterior silhouettes. The simplified source can leave tiny internal
    # slivers where two districts meet; these are not national/regional borders.
    return "".join(
        "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in list(part.exterior.coords)[:-1]) + "Z"
        for part in polygons(area)
    )


if __name__ == "__main__":
    file = Path(__file__).resolve().parents[1] / "wwwroot/data/map.json"
    data = json.loads(file.read_text(encoding="utf-8"))
    grouped = defaultdict(list)
    for district, path in data["paths"].items():
        grouped[data["membership"][district]].append(path)
    data["regions"] = {name: outline(paths) for name, paths in grouped.items()}
    data["country"] = outline(data["paths"].values())
    file.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
