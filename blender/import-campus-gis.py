"""Run in Blender with BlenderGIS enabled after prepare-gis-elevation.mjs."""
import bpy
import importlib
import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

BASE = Path(__file__).resolve().parent
GIS = BASE / 'gis'
ORIGIN = (83.323715, 17.728887)
CRS = 'EPSG:32644'
RADIUS = 300
STEP = 10
NAME = 'Instrument campus - GIS working layout'
assert bpy.data.scenes.get(NAME) is None, 'Use a new scene or review the existing GIS scene before rerunning.'
scene = bpy.data.scenes.new(NAME)
bpy.context.window.scene = scene
scene.unit_settings.system = next(i.identifier for i in bpy.types.UnitSettings.bl_rna.properties['system'].enum_items if i.identifier == 'METRIC')
scene.unit_settings.scale_length = 1
proj = importlib.import_module('BlenderGIS-master.core.proj')
geo = importlib.import_module('BlenderGIS-master.geoscene').GeoScene(scene)
geo.crs = CRS
geo.setOriginGeo(*ORIGIN)
ox, oy = geo.getOriginPrj()
elevation = json.loads((GIS / 'elevation.json').read_text())
tiles = {(t['x'], t['y']): t['heights'] for t in elevation['tiles']}


def height(x, y):
    lon, lat = proj.reprojPt(CRS, 4326, ox + x, oy + y)
    n = 2 ** 14 * 256
    px = (lon + 180) / 360 * n - .5
    py = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - .5
    ix, iy = math.floor(px), math.floor(py)
    def pixel(u, v):
        return tiles[(u // 256, v // 256)][(v % 256) * 256 + u % 256]
    a, b = px - ix, py - iy
    return ((1-a)*pixel(ix, iy)+a*pixel(ix+1, iy))*(1-b) + ((1-a)*pixel(ix, iy+1)+a*pixel(ix+1, iy+1))*b


datum = height(0, 0)
scene['elevation_datum_m'] = datum
scene['source'] = 'OpenStreetMap contributors; Mapzen/Tilezen terrain on AWS'
scene['accuracy'] = 'GIS context only. Local road widths and photo-based details are estimates, not surveyed.'
scene['building_osm_id'] = '509878600'
scene['runtime_alignment'] = 'North-up GIS scene. Existing Three.js building is untouched; final registration pending.'


def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c


def relocate(obj, target):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    target.objects.link(obj)


def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .9
    return m


def mesh(name, verts, faces, target, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    assert not data.validate(), name + ': invalid mesh'
    obj = bpy.data.objects.new(name, data)
    target.objects.link(obj)
    data.materials.append(mat)
    return obj


terrain_col = collection('01 GIS elevation - unmodified reference')
reference_col = collection('02 OSM footprints and centerlines')
road_col = collection('03 GIS roads - estimated widths')
ground_mat = material('GIS earth', (.24, .31, .19))
road_mat = material('Asphalt layout', (.105, .115, .12))
footprint_mat = material('OSM building footprint', (.53, .60, .65))
department_mat = material('Department GIS footprint', (.20, .47, .55))

# ESRI ASCII retains projected coordinates and original elevations for reuse in GIS.
count = RADIUS * 2 // STEP + 1
rows = [[height(x, y) for x in range(-RADIUS, RADIUS+1, STEP)] for y in range(RADIUS, -RADIUS-1, -STEP)]
asc = GIS / 'campus-utm44n.asc'
asc.write_text(f'ncols {count}\nnrows {count}\nxllcenter {ox-RADIUS}\nyllcenter {oy-RADIUS}\ncellsize {STEP}\nNODATA_value -9999\n' + '\n'.join(' '.join(f'{h:.4f}' for h in row) for row in rows), newline='\n')
prefs = bpy.context.preferences.addons['BlenderGIS-master'].preferences
old_crs = prefs.predefCrsJson
entries = json.loads(old_crs)
if not any(e[0] == CRS for e in entries):
    entries.append([CRS, 'WGS84 / UTM zone 44N', 'Metres, Andhra University campus'])
prefs.predefCrsJson = json.dumps(entries)
try:
    mode = next(i.identifier for i in bpy.ops.importgis.asc_file.get_rna_type().properties['importMode'].enum_items if i.identifier == 'MESH')
    assert 'FINISHED' in bpy.ops.importgis.asc_file(filepath=str(asc), fileCRS=CRS, importMode=mode)
finally:
    prefs.predefCrsJson = old_crs
terrain = bpy.context.object
terrain.name = 'GIS terrain 600m - 10m interpolated grid'
# This installed BlenderGIS importer offsets xllcenter by half a cell; align sample centres.
world_min = Vector((min((terrain.matrix_world @ v.co).x for v in terrain.data.vertices), min((terrain.matrix_world @ v.co).y for v in terrain.data.vertices), 0))
terrain.location.x += -RADIUS - world_min.x
terrain.location.y += -RADIUS - world_min.y
terrain.location.z = -datum
terrain['source'] = elevation['sourceUrl']
terrain['grid_spacing_m'] = STEP
terrain['accuracy'] = 'Interpolated regional DEM, not 10m survey accuracy; no curb or step elevations.'
terrain.data.materials.append(ground_mat)
relocate(terrain, terrain_col)
for face in terrain.data.polygons:
    face.use_smooth = True
bpy.context.view_layer.update()
terrain_bvh = BVHTree.FromPolygons([terrain.matrix_world @ v.co for v in terrain.data.vertices], [list(p.vertices) for p in terrain.data.polygons])
def terrain_height(x, y):
    hit = terrain_bvh.ray_cast(Vector((x, y, 200)), Vector((0, 0, -1)))[0]
    assert hit is not None, 'Road point outside terrain'
    return hit.z

# Crop OSM ways before import so remote relation members cannot expand the scene.
root = ET.parse(GIS / 'north-campus.osm').getroot()
nodes = {n.get('id'): n for n in root.findall('node')}
def xy(node):
    x, y = proj.reprojPt(4326, CRS, float(node.get('lon')), float(node.get('lat')))
    return x-ox, y-oy
ways = []
for way in root.findall('way'):
    tags = {t.get('k'):t.get('v') for t in way.findall('tag')}
    if not any(k in tags for k in ('building', 'highway', 'landuse', 'leisure')):
        continue
    points = [xy(nodes[n.get('ref')]) for n in way.findall('nd')]
    if points and all(max(abs(x), abs(y)) < RADIUS-5 for x,y in points):
        ways.append(way)
    elif tags.get('highway') and any(max(abs(x), abs(y)) < RADIUS-15 for x,y in points):
        # Keep complete raw road topology; rendered roads below are clipped to the DEM.
        ways.append(way)
subset = ET.Element('osm', {'version':'0.6', 'generator':'Instrument campus GIS import'})
ET.SubElement(subset, 'bounds', {'minlon':'83.3208','maxlon':'83.3266','minlat':'17.7261','maxlat':'17.7317'})
refs = {n.get('ref') for w in ways for n in w.findall('nd')}
for ref in sorted(refs):
    subset.append(nodes[ref])
for way in ways:
    subset.append(way)
cropped = GIS / 'campus-context.osm'
with cropped.open('wb') as output:
    ET.ElementTree(subset).write(output, encoding='utf-8', xml_declaration=True)
osm = importlib.import_module('BlenderGIS-master.operators.io_import_osm')
osm.OSMTAGS = osm.getTags()
types = {i.identifier for i in bpy.ops.importgis.osm_file.get_rna_type().properties['featureType'].enum_items if i.identifier == 'way'}
before = set(scene.objects)
assert 'FINISHED' in bpy.ops.importgis.osm_file(filepath=str(cropped), featureType=types, filterTags={'building','highway','landuse','leisure'}, separate=True, buildingsExtrusion=False)
references = list(set(scene.objects)-before)
for obj in references:
    relocate(obj, reference_col)
    for v in obj.data.vertices:
        v.co.z = height(v.co.x, v.co.y)-datum+.05 if max(abs(v.co.x),abs(v.co.y)) < RADIUS else 0
    obj.data.materials.append(department_mat if str(obj.get('id')) == '509878600' else footprint_mat)
    obj['source'] = 'https://www.openstreetmap.org/way/' + str(obj.get('id',''))
    obj.hide_render = True
    obj.display_type = next(e.identifier for e in bpy.types.Object.bl_rna.properties['display_type'].enum_items if e.identifier == 'WIRE')

# Densified road ribbons follow the DEM instead of floating as straight chords over it.
roads = []
for way in ways:
    tags = {t.get('k'):t.get('v') for t in way.findall('tag')}
    if 'highway' not in tags:
        continue
    points = [Vector(xy(nodes[n.get('ref')])) for n in way.findall('nd')]
    path = []
    for a,b in zip(points,points[1:]):
        steps = max(1,math.ceil((b-a).length/2))
        path.extend(a.lerp(b,i/steps) for i in range(steps))
    path.append(points[-1])
    width = 7 if tags['highway'] == 'tertiary' else 2 if tags['highway'] in ('footway','path','steps') else 5.2
    try:
        width = float(tags['width'])
    except (KeyError,ValueError):
        pass
    verts,faces = [],[]
    previous = None
    for i,p in enumerate(path):
        if max(abs(p.x),abs(p.y)) > RADIUS-10:
            previous = None
            continue
        tangent = path[min(i+1,len(path)-1)]-path[max(0,i-1)]
        if tangent.length < .001:
            continue
        tangent.normalize()
        normal = Vector((-tangent.y,tangent.x)) * width/2
        start = len(verts)
        for v in [p-normal,p+normal]:
            verts.append((v.x,v.y,terrain_height(v.x,v.y)+.12))
        if previous is not None:
            faces.append((previous,previous+1,start+1,start))
        previous = start
    if faces:
        obj = mesh(tags.get('name','Campus '+tags['highway'])+' | OSM '+way.get('id'),verts,faces,road_col,road_mat)
        obj['osm_way'] = way.get('id')
        obj['width_m'] = width
        obj['width_basis'] = 'OSM width tag' if 'width' in tags else 'Provisional width; measure on site'
        obj['elevation_basis'] = 'Draped regional DEM; engineered road grade not surveyed'
        roads.append(obj)

scene['gis_import_complete'] = True
manifest = {'origin_lon_lat': ORIGIN, 'crs':CRS,'projected_origin_m':[ox,oy],'vertical_datum_at_origin_m':datum,'terrain_extent_m':600,'interpolated_grid_m':STEP,'road_objects':len(roads),'osm_reference_objects':len(references),'height_range_m':[min(map(min,rows)),max(map(max,rows))],'department_way':'509878600','status':'GIS base plus preliminary road ribbons; not surveyed and not connected to runtime'}
(GIS / 'manifest.json').write_text(json.dumps(manifest,indent=2), newline='\n')
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'campus-terrain-working.blend'))
print(json.dumps(manifest,indent=2))
