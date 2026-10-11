"""Run in the saved Blender working file, without changing source geometry."""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

BASE=Path(__file__).resolve().parent
gis=bpy.data.scenes['Instrument campus - GIS working layout']
draft=bpy.data.scenes['Entrance road and ground - photo draft']
active=bpy.context.window.scene
report={}
try:
    bpy.context.window.scene=gis
    bpy.context.view_layer.update()
    terrain=gis.objects['GIS terrain 600m - 10m interpolated grid']
    points=[terrain.matrix_world@v.co for v in terrain.data.vertices]
    assert len(points)==61*61
    assert len(terrain.data.polygons)==60*60
    for axis in [0,1]:
        assert abs(min(p[axis] for p in points)+300)<.001
        assert abs(max(p[axis] for p in points)-300)<.001
    assert all(math.isfinite(v) for p in points for v in p)
    bvh=BVHTree.FromPolygons(points,[list(p.vertices) for p in terrain.data.polygons])
    roads=list(bpy.data.collections['03 GIS roads - estimated widths'].objects)
    assert len(roads)==39
    gaps=[]
    face_gaps=[]
    for o in roads:
        for v in o.data.vertices:
            p=o.matrix_world@v.co
            hit=bvh.ray_cast(Vector((p.x,p.y,200)),Vector((0,0,-1)))[0]
            assert hit is not None,o.name
            gap=p.z-hit.z
            gaps.append(gap)
            assert .10<gap<.14,(o.name,gap)
        o.data.calc_loop_triangles()
        for triangle in o.data.loop_triangles:
            p=sum((o.matrix_world@o.data.vertices[i].co for i in triangle.vertices),Vector())/3
            hit=bvh.ray_cast(Vector((p.x,p.y,200)),Vector((0,0,-1)))[0]
            assert hit is not None,o.name
            face_gaps.append(p.z-hit.z)
            assert p.z>hit.z,o.name+' road buried under terrain'
    report['gis']={'vertices':len(points),'grid_faces':len(terrain.data.polygons),'roads':len(roads),'road_vertex_clearance_m':[min(gaps),max(gaps)],'minimum_triangle_clearance_m':min(face_gaps),'extent_m':600,'crs':gis.get('SRID')}

    bpy.context.window.scene=draft
    bpy.context.view_layer.update()
    drive=draft.objects['Entrance driveway with flared junction']
    road=draft.objects['Principal Office Road - OSM alignment, provisional grade']
    road_points=[v.co.copy() for v in road.data.vertices]
    join=[v.co for v in drive.data.vertices][-17:]
    join_errors=[min((p-q).length for q in road_points) for p in join]
    assert max(join_errors)<.001,join_errors
    assert all(p.normal.z>0 for p in drive.data.polygons)
    closed=[]
    depsgraph=bpy.context.evaluated_depsgraph_get()
    for o in draft.objects:
        if o.type!='MESH':
            continue
        assert all(math.isfinite(v) for p in o.data.vertices for v in p.co),o.name
        if not any(m.type=='SOLIDIFY' for m in o.modifiers):
            continue
        assert all(p.normal.z>0 for p in o.data.polygons),o.name+' downward surface'
        evaluated=o.evaluated_get(depsgraph)
        data=evaluated.to_mesh()
        bm=bmesh.new()
        bm.from_mesh(data)
        assert all(e.is_manifold for e in bm.edges),o.name+' open slab'
        bm.free()
        evaluated.to_mesh_clear()
        closed.append(o.name)
    report['draft']={'drive_join_max_error_m':max(join_errors),'closed_slabs':closed,'objects':len(draft.objects),'grading_status':'Provisional, not surveyed'}
    report['status']='PASS'
    (BASE/'gis'/'checks.json').write_text(json.dumps(report,indent=2), newline='\n')
    print(json.dumps(report,indent=2))
finally:
    bpy.context.window.scene=active
