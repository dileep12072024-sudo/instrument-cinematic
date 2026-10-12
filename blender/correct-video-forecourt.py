"""Update the existing master in place from the October 12 entrance videos.

Run once after reviewing the open master. Dimensions remain photo estimates.
This does not rebuild the architecture, vegetation assets, or raw GIS scene.
"""
import bpy
import bmesh
import json
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

BASE = Path(__file__).resolve().parent
source = bpy.data.scenes['Entrance road and ground - photo draft']
export_scene = bpy.data.scenes['Website environment export']
assert not source.get('oct12_forecourt_corrected'), 'Already applied; edit the existing result'
bpy.context.window.scene = source
bpy.context.view_layer.update()
anchor = Vector(source['gis_anchor_xy_m'])
right = Vector((.926, .377)).normalized()
forward = Vector((-right.y, right.x))

def local(p):
    q = Vector((p.x, p.y)) - anchor
    return q.dot(right), q.dot(forward)

def world(x, y, z):
    p = anchor + right*x + forward*y
    return Vector((p.x, p.y, z))

def bvh(obj):
    return BVHTree.FromPolygons([obj.matrix_world@v.co for v in obj.data.vertices],
                               [list(p.vertices) for p in obj.data.polygons])

ground = source.objects['Editable verges and lower courtyard grading']
old_ground = bvh(ground)

def height(tree, x, y):
    hit = tree.ray_cast(world(x, y, 100), Vector((0, 0, -1)))[0]
    assert hit is not None, (x, y)
    return hit.z

# Keep the mapped road and its existing junction fixed; widen only the approach
# at the entrance, as shown by the white edge lines in both videos.
road = source.objects['Principal Office Road - OSM alignment, provisional grade']
line = sorted(local(road.matrix_world@v.co) for v in road.data.vertices[2*131:3*131])
def road_y(x):
    for a, b in zip(line, line[1:]):
        if a[0] <= x <= b[0]:
            return a[1] + (b[1]-a[1])*(x-a[0])/(b[0]-a[0])
    a, b = (line[0], line[1]) if x < line[0][0] else (line[-2], line[-1])
    return a[1] + (b[1]-a[1])*(x-a[0])/(b[0]-a[0])

def width(t):
    return 2.65 + 2.25*max(0, 1-t/.24) + 5.35*max(0, (t-.74)/.26)**2

def drive(t, u):
    x = u*width(t)
    return x, t*(road_y(x)-3.25), (-.9+x*.004)*t

def courtyard(x, y):
    # Open earth between facade paving and the tree/flower verges, not lawn.
    return (-22 < x < -5 and -3.2 < y < 14) or (5 < x < 22 and -3.2 < y < 6.5)

def ground_point(x, y):
    t = max(0, min(1, y/(road_y(x)-3.25)))
    road_z = (-.9+x*.004)*t
    if y < 0:
        return x, y, -.12
    if y > road_y(x)+3.25:
        return x, y, -.9+x*.004+.13
    if abs(y-road_y(x)) < 3.5 or abs(x) < width(t)+.25:
        return x, y, road_z-.16
    shoulder = min(1, max(0, (abs(x)-width(t))/1.2))
    z = road_z-.16+.29*shoulder
    if courtyard(x, y):
        depth = .34 if x < 0 else .19
        z -= depth*min(1, max(0, (abs(x)-5)/4))
    return x, y, z

def grid(nx, ny, point):
    verts = [world(*point(i, j)) for j in range(ny+1) for i in range(nx+1)]
    faces = []
    for j in range(ny):
        for i in range(nx):
            a = j*(nx+1)+i
            face = (a, a+1, a+nx+2, a+nx+1)
            p, q, r = (verts[k] for k in face[:3])
            faces.append(face if (q-p).cross(r-p).z >= 0 else tuple(reversed(face)))
    return verts, faces

changed = []
def replace(name, verts, faces, tile=3):
    obj = source.objects[name]
    old = obj.data
    mesh = bpy.data.meshes.new(name+' - video layout')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    assert not mesh.validate(), name
    for mat in old.materials:
        mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        p = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (p.x/tile, p.y/tile)
    obj.data = mesh
    obj.matrix_world = Matrix.Identity(4)
    changed.append(obj)
    return obj

replace(ground.name, *grid(130, 105, lambda i,j: ground_point(i-65, j-40)), tile=2.5)
for p in ground.data.polygons:
    x, y = local(p.center)
    p.material_index = int(y > 5 and not courtyard(x, y))
replace('Entrance driveway with flared junction', *grid(16, 64, lambda i,j: drive(j/64, i/8-1)))
for side, label in [(-1, 'West'), (1, 'East')]:
    for kind in ['edge paint', 'kerb']:
        def point(i, j):
            x, y, z = drive(j/64, side)
            return (x-side*(.17+i*.065), y, z+.008) if kind=='edge paint' else (x+side*(.04+i*.18), y, z+.14)
        obj = replace(label+' driveway '+kind, *grid(1, 64, point))
        # Both videos show unkerbed access from the road into the bare courts.
        if kind == 'kerb':
            bm = bmesh.new(); bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if local(f.calc_center_median())[1] < (14 if side < 0 else 6.5)], context='FACES')
            bm.to_mesh(obj.data); bm.free()

# Replace the 40 m wide draft sheet with facade-bound paving on either side of
# the existing tiled porch. The left return belongs INSIDE the left wing.
verts, faces = [], []
for x0, x1, y0, y1 in [(-21.8,-5,-7.3,-3.2), (5,21.8,-7.3,-3.2), (16,21.8,-3.2,6.5)]:
    v, f = grid(18, 6, lambda i,j: (x0+(x1-x0)*i/18, y0+(y1-y0)*j/6, -.06))
    faces.extend(tuple(k+len(verts) for k in face) for face in f)
    verts.extend(v)
replace('Entrance concrete apron', verts, faces)
replace('Lower side courtyard paving', *grid(12, 20, lambda i,j: (-21.8+i*.45, -3.2+j*.66, -.08-max(0, j*.66-3.2)*.018)))

# Reuse the packed aggregate maps for subdued, rough grey paving, rather than
# exporting procedural-only concrete as a featureless bright sheet.
for name, asphalt in [('Weathered concrete apron', 'Draft asphalt aggregate'), ('Web - Weathered concrete apron', 'Web - Draft asphalt aggregate')]:
    material = bpy.data.materials[name]
    donor = bpy.data.materials[asphalt]
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    other = next(n for n in donor.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (.34,.33,.30,1)
    shader.inputs['Roughness'].default_value = .96
    for slot in ['Base Color','Roughness','Normal']:
        incoming = next(iter(other.inputs[slot].links), None)
        if incoming is None:
            continue
        if incoming.from_node.type=='TEX_IMAGE':
            tex = nodes.new('ShaderNodeTexImage'); tex.image=incoming.from_node.image
            links.new(tex.outputs['Color'], shader.inputs[slot])
        elif slot=='Normal' and incoming.from_node.type=='NORMAL_MAP':
            normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.28
            link = next(iter(incoming.from_node.inputs['Color'].links), None)
            if link:
                tex=nodes.new('ShaderNodeTexImage'); tex.image=link.from_node.image
                links.new(tex.outputs['Color'],normal.inputs['Color']); links.new(normal.outputs['Normal'],shader.inputs['Normal'])

bpy.context.view_layer.update()
new_ground = bvh(ground)
# Keep tree roots seated after the local grading change. No X/Y tree relocation.
for obj in source.objects:
    if obj.get('base_local_xy') is not None and 'shrub' not in obj.name.lower() and 'understory' not in obj.name.lower():
        x, y = obj['base_local_xy']
        obj.location.z += height(new_ground,x,y)-height(old_ground,x,y)

placements = [(4.3,8.6),(5.6,10.2),(4.4,12.1),(6.7,8.0),(7.0,10.5),(-18.1,.65)]
for i, (x,y) in enumerate(placements):
    leaf = source.objects[('Pink flowering shrub ' if i<3 else 'Bright green understory ')+f'{i:02}']
    old_x, old_y = leaf['base_local_xy']
    delta = world(x,y,height(new_ground,x,y))-world(old_x,old_y,height(old_ground,old_x,old_y))
    names = [leaf.name, f'Supporting shrub stems {i:02}']
    if i<3: names.append(f'Pink bloom clusters {i:02}')
    for name in names:
        source.objects[name].location += delta
    leaf['base_local_xy'] = [x,y]
    leaf['placement_reference'] = 'Oct 12 video: right kerbed planting edge beyond bare forecourt; estimated distances'

# Grass should not turn the filmed open earth/paving into a lawn. Preserve UVs.
grass = source.objects['Patchy Bermuda grass - road and trunk exclusion']
bm=bmesh.new(); bm.from_mesh(grass.data)
remove=[]
for face in bm.faces:
    x,y=local(face.calc_center_median())
    if courtyard(x,y) or (-22<x<-16 and -3.2<y<10):
        remove.append(face)
bmesh.ops.delete(bm,geom=remove,context='FACES')
for v in bm.verts:
    x,y=local(v.co)
    v.co.z += height(new_ground,x,y)-height(old_ground,x,y)
bm.to_mesh(grass.data); bm.free()
changed.append(grass)

bpy.context.view_layer.update()
registration=Matrix(((right.x,right.y,0,-right.dot(anchor)),(-forward.x,-forward.y,0,forward.dot(anchor)-10.75),(0,0,1,0),(0,0,0,1)))
for obj in export_scene.objects:
    name=obj.get('source_object')
    if name not in source.objects: continue
    original=source.objects[name]
    obj.matrix_world=registration@original.matrix_world
    if original not in changed: continue
    mats=list(obj.data.materials)
    obj.data=original.data.copy()
    indices=[p.material_index for p in obj.data.polygons]
    obj.data.materials.clear()
    for mat in mats: obj.data.materials.append(mat)
    for p,index in zip(obj.data.polygons,indices): p.material_index=index
    if original==grass:
        # Grass vertices still use the original clump UVs; roots get zero bend.
        weights=obj.data.attributes.new('_WIND','FLOAT_VECTOR','POINT')
        for v in obj.data.vertices:
            x,y=local(v.co)
            h=max(0,min(1,(v.co.z-height(new_ground,x,y))/.35))
            weights.data[v.index].vector=(h*h,h,(v.co.x*.37+v.co.y*.19)%1)

source['oct12_forecourt_corrected']=True
source['forecourt_reference']='2026-10-12 videos: bare left/right courts, facade paving, right kerbed flowering strip; estimated dimensions'
export_scene['forecourt_reference']=source['forecourt_reference']
bpy.context.window.scene=export_scene
bpy.context.view_layer.update()
# Verify pavement stays below the entrance, on its intended side, with no old
# continuous slab spanning the drive and both courtyard areas.
for name in ['Entrance concrete apron','Lower side courtyard paving']:
    obj=next(o for o in export_scene.objects if o.get('source_object')==name)
    assert all((obj.matrix_world@v.co).z < 0 for v in obj.data.vertices), name
assert width(0)>width(.5)
assert road_y(0)-3.25 > 30
assert all(source.objects[f'Pink flowering shrub {i:02}']['base_local_xy'][0]>3 for i in range(3))
print(json.dumps({'changed_surfaces':[o.name for o in changed], 'flowers':placements[:3], 'road_join_unchanged':True}))
