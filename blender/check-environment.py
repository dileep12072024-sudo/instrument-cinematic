"""Run in Blender: placement, texture and shared-mesh checks for the master scene."""
import bpy
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

BASE = Path(__file__).resolve().parent
scene = bpy.data.scenes['Entrance road and ground - photo draft']
bpy.context.window.scene = scene
bpy.context.view_layer.update()

def bvh(o):
    return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices], [list(p.vertices) for p in o.data.polygons])

ground = bvh(scene.objects['Editable verges and lower courtyard grading'])
roads = [bvh(scene.objects[n]) for n in ['Entrance driveway with flared junction','Principal Office Road - OSM alignment, provisional grade']]
footprint = bvh(scene.objects['Department footprint - registration only'])
trees = list(bpy.data.collections['Environment - textured canopy and understory'].objects)
assert len(trees) == 14
assert len({o.data.as_pointer() for o in trees}) == 2, 'Tree instances must share source meshes'
planting = bpy.data.collections.get('Environment - flowering shrubs and facade trees')
if scene.get('facade_planting_pass'):
    assert planting is not None
    near_trees = [o for o in planting.objects if o.get('plant_role')=='facade_tree']
    assert len(near_trees)==2
    assert all(o.data==trees[0].data for o in near_trees), 'Reuse the existing tree mesh'
    trees += near_trees
    assert len([o for o in planting.objects if o.get('plant_role')=='flowering_shrub'])==3
    assert len([o for o in planting.objects if o.get('plant_role')=='blooms'])==3
    assert len([o for o in planting.objects if o.get('plant_role')=='green_shrub'])==3
    for o in planting.objects:
        if o.get('plant_role') in ['flowering_shrub','green_shrub','blooms']:
            assert len(o.data.polygons)>0
            # Conservative footprint/road check of every new leaf and bloom vertex.
            for v in o.data.vertices:
                p=o.matrix_world@v.co
                origin=Vector((p.x,p.y,100))
                assert footprint.ray_cast(origin,Vector((0,0,-1)))[0] is None, o.name+' overlaps building'
                assert all(r.ray_cast(origin,Vector((0,0,-1)))[0] is None for r in roads), o.name+' reaches road'
rear = bpy.data.collections.get('Environment - rear terrace canopy')
if scene.get('rear_canopy_pass'):
    assert rear is not None and len(rear.objects)==7
    assert all(o.data in [t.data for t in trees] for o in rear.objects)
    trees += list(rear.objects)
gaps = []
for o in trees:
    origin = Vector((o.location.x,o.location.y,100))
    assert footprint.ray_cast(origin,Vector((0,0,-1)))[0] is None, o.name+' inside building'
    assert all(r.ray_cast(origin,Vector((0,0,-1)))[0] is None for r in roads), o.name+' in road'
    hit = ground.ray_cast(origin,Vector((0,0,-1)))[0]
    low = min((o.matrix_world@Vector(p)).z for p in o.bound_box)
    gaps.append(low-hit.z)
    assert -.065 < low-hit.z < -.055, (o.name,low-hit.z)

for o in scene.objects:
    if 'gate pier - provisional' in o.name:
        for v in o.data.vertices:
            p = o.matrix_world@v.co
            assert all(r.ray_cast(Vector((p.x,p.y,100)),Vector((0,0,-1)))[0] is None for r in roads), o.name+' encroaches on carriageway'

missing = [i.filepath for i in bpy.data.images if i.source=='FILE' and not i.packed_file and not Path(bpy.path.abspath(i.filepath)).is_file()]
assert not missing, missing
for name in ['jacaranda_tree_leaves','island_tree_02_leaves','grass_bermuda_01']:
    m = bpy.data.materials[name]
    node = next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED' and n.label=='Portable textured foliage')
    assert node.inputs['Alpha'].is_linked and node.inputs['Base Color'].is_linked, name
grass = scene.objects['Patchy Bermuda grass - road and trunk exclusion']
assert grass['clumps'] == 10000
assert len(grass.data.uv_layers.active.data) == len(grass.data.loops)
assert scene['estimated_drive_drop_m'] == .9, 'Do not silently change provisional grading'
report = {'status':'PASS','trees':len(trees),'rear_canopy_trees':len(rear.objects) if rear else 0,'shared_tree_meshes':2,'flowering_shrubs':3 if planting else 0,'green_shrubs':3 if planting else 0,'grass_clumps':grass['clumps'],'missing_textures':missing,'root_ground_gap_m':[min(gaps),max(gaps)],'draft_objects':len(scene.objects),'note':'Tree checks cover roots; new shrub leaves and blooms checked against roads/building footprint. Final detailed building registration remains pending.'}
(BASE/'gis'/'environment-checks.json').write_text(json.dumps(report,indent=2)+'\n',newline='\n')
print(json.dumps(report,indent=2))
