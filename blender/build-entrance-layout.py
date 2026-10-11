"""Editable photo-based entrance draft, separate from the unmodified GIS scene."""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parent
GIS_SCENE = bpy.data.scenes['Instrument campus - GIS working layout']
NAME = 'Entrance road and ground - photo draft'
assert bpy.data.scenes.get(NAME) is None, 'Review the existing draft before rerunning.'
scene = bpy.data.scenes.new(NAME)
bpy.context.window.scene = scene
scene.unit_settings.system = GIS_SCENE.unit_settings.system
scene.unit_settings.scale_length = 1
scene.world = bpy.data.worlds.new('Entrance daylight')
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.65,.74,.82,1)
background.inputs['Strength'].default_value = .7
anchor = Vector((-4.8, 9.0))
right = Vector((.926,.377)).normalized()
forward = Vector((-right.y,right.x))
scene['source'] = 'OSM horizontal layout plus user photographs Entire building / Road from main door / Left courtyard'
scene['status'] = 'PROVISIONAL GRADING: verify entrance position, widths and local elevations before runtime integration'
scene['estimated_drive_drop_m'] = .9
scene['estimated_kerb_height_m'] = .14
scene['gis_anchor_xy_m'] = list(anchor)
scene['building_reference'] = 'OSM footprint only, not a replacement for the approved building'
scene['coordinate_frame'] = 'Same UTM-relative XY as GIS scene. Z=0 is proposed entrance paving datum, NOT GIS elevation.'

def col(name):
    c=bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

ground_col=col('Draft ground grading - photo estimates')
road_col=col('Entrance and adjoining road surfaces')
kerb_col=col('Kerbs and road edge paint')
ref_col=col('Registration references - not final building')

def mat(name,color,noise=False):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    n=m.node_tree.nodes
    bsdf=next(v for v in n if v.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=.94
    if noise:
        tex=n.new('ShaderNodeTexNoise')
        tex.inputs['Scale'].default_value=34
        bump=n.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value=.2
        bump.inputs['Distance'].default_value=.012
        m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    return m

asphalt=mat('Draft asphalt aggregate',(.115,.124,.132),True)
soil=mat('Exposed red earth',(.32,.17,.10),True)
grass=mat('Planted verge ground',(.19,.28,.105),True)
paving=mat('Weathered concrete apron',(.43,.43,.39),True)
kerb=mat('Concrete kerb',(.52,.50,.43),True)
paint=mat('Worn white edge paint',(.79,.78,.68))
building_mat=mat('Building footprint placeholder',(.40,.58,.63))

def world(x,y,z):
    p=anchor+right*x+forward*y
    return (p.x,p.y,z)

def local(x,y):
    p=Vector((x,y))-anchor
    return p.dot(right),p.dot(forward)

def mesh(name,verts,faces,target,material,thickness=0):
    d=bpy.data.meshes.new(name)
    d.from_pydata(verts,[],faces)
    d.update()
    assert not d.validate(),name
    o=bpy.data.objects.new(name,d)
    target.objects.link(o)
    d.materials.append(material)
    if thickness:
        kind=next(e.identifier for e in bpy.types.Modifier.bl_rna.properties['type'].enum_items if e.identifier=='SOLIDIFY')
        m=o.modifiers.new('Closed slab edges',kind)
        m.thickness=thickness
        m.offset=-1
    return o

# Preserve the mapped Principal Office Road alignment in plan, not a guessed straight road.
source=next(o for o in GIS_SCENE.objects if o.get('id')=='509848677')
line=sorted(local(v.co.x,v.co.y) for v in source.data.vertices)
def road_y(x):
    for a,b in zip(line,line[1:]):
        if a[0]<=x<=b[0]:
            return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])
    a,b=(line[0],line[1]) if x<line[0][0] else (line[-2],line[-1])
    return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])

join=road_y(0)
half_road=3.25
scene['estimated_main_road_width_m']=half_road*2
scene['entrance_drive_length_m']=join-half_road
scene['entrance_drive_width_m']=5.3
def road_z(x):
    return -.9 + x*.004

def drive(t,u):
    flare=max(0,(t-.74)/.26)
    width=2.65+5.35*flare*flare
    x=u*width
    y=t*(road_y(x)-half_road)
    z=road_z(x)*t
    return x,y,z

def grid(name,nx,ny,point,target,material,thickness=0):
    verts=[world(*point(i,j)) for j in range(ny+1) for i in range(nx+1)]
    faces=[]
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i
            face=(a,a+1,a+nx+2,a+nx+1)
            p,q,r=(Vector(verts[k]) for k in face[:3])
            faces.append(face if (q-p).cross(r-p).z>=0 else tuple(reversed(face)))
    return mesh(name,verts,faces,target,material,thickness)

main=grid('Principal Office Road - OSM alignment, provisional grade',130,4,lambda i,j:(i-65,road_y(i-65)+(j/4*2-1)*half_road,road_z(i-65)),road_col,asphalt,.14)
main['source_way']='509848677'
drive_obj=grid('Entrance driveway with flared junction',16,64,lambda i,j:drive(j/64,i/8-1),road_col,asphalt,.14)
drive_obj['source']='Photo-inferred entrance axis and 5.3m width; road join follows OSM'

# The draft ground follows the road edge but remains lower under the asphalt.
def ground_point(x,y):
    front=road_y(x)-half_road
    t=max(0,min(1,y/front))
    h=road_z(x)*t-.16
    flare=max(0,(t-.74)/.26)
    road_width=2.65+5.35*flare*flare
    in_main=abs(y-road_y(x))<half_road+.25
    in_drive=0<=y<=front and abs(x)<road_width+.25
    if not (in_main or in_drive):
        shoulder=min(1,max(0,(abs(x)-road_width)/1.2))
        h+=.29*shoulder
        if x<-7 and -5<y<12:
            h-=.45*min(1,(-x-7)/6)*min(1,(12-y)/5)
    if y<0:
        h=-.12
    if y>road_y(x)+half_road:
        h=road_z(x)+.13
    return x,y,h

ground=grid('Editable verges and lower courtyard grading',130,105,lambda i,j:ground_point(i-65,j-40),ground_col,soil,.3)
ground.data.materials.append(grass)
for p in ground.data.polygons:
    x,y=local(p.center.x,p.center.y)
    if y>5:
        p.material_index=1
ground['heights']='Photo-based draft; 0.9m drive fall and 0.45m lower side ground are NOT measurements'
forecourt=grid('Entrance concrete apron',40,6,lambda i,j:(i-20,j-6,.01),ground_col,paving,.12)
side_paving=grid('Lower side courtyard paving',24,10,lambda i,j:(-38+i,j+1,ground_point(-38+i,j+1)[2]+.025),ground_col,paving,.12)

# Edge strips use the same sampled boundary as the road surface, avoiding detached ends.
for side in [-1,1]:
    grid(('West' if side<0 else 'East')+' driveway edge paint',1,64,
         lambda i,j,s=side:(lambda p:(p[0]-s*(.17+i*.065),p[1],p[2]+.008))(drive(j/64,side)),kerb_col,paint)
    grid(('West' if side<0 else 'East')+' driveway kerb',1,64,
         lambda i,j,s=side:(lambda p:(p[0]+s*(.04+i*.18),p[1],p[2]+.14))(drive(j/64,s)),kerb_col,kerb,.25)
for side in [-1,1]:
    edge=grid(('Near' if side<0 else 'Far')+' campus road edge paint',130,1,
         lambda i,j,s=side:(i-65,road_y(i-65)+s*(half_road-.16-j*.065),road_z(i-65)+.008),kerb_col,paint)
    if side<0:
        import bmesh
        bm=bmesh.new()
        bm.from_mesh(edge.data)
        bmesh.ops.delete(bm,geom=[f for f in bm.faces if abs(local(*f.calc_center_median()[:2])[0])<8],context='FACES')
        bm.to_mesh(edge.data)
        bm.free()

# Registration footprint is deliberately shallow; do not substitute it for the approved model.
source=bpy.data.objects['Instrumentation Engineering Department']
footprint=mesh('Department footprint - registration only',[(v.co.x,v.co.y,.08) for v in source.data.vertices],[tuple(p.vertices) for p in source.data.polygons],ref_col,building_mat,.35)
footprint['source']='https://www.openstreetmap.org/way/509878600'
footprint['status']='Reference footprint only; approved Three.js architecture remains unchanged'

# Gate positions are photo estimates and remain easy to move independently.
gate_y=join-9
for side in [-1,1]:
    x=side*3.12
    y=gate_y
    z=road_z(x)*y/(join-half_road)
    verts=[world(x+dx,y+dy,z+dz) for dz in [0,2.15] for dy in [-.30,.30] for dx in [-.30,.30]]
    mesh(('Left' if side<0 else 'Right')+' entrance gate pier - provisional',verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],ref_col,kerb)

note=bpy.data.texts.new('READ ME - GIS versus photo grading')
note.write('Two separate scenes:\n1. Instrument campus - GIS working layout: UTM44N DEM and OSM.\n2. Entrance road and ground - photo draft: same XY, proposed entrance datum Z=0.\nThe 0.9m driveway fall, 0.45m lower paving, 0.14m kerbs and road widths are editable estimates.\nThe regional DEM suggests roughly 6m drop from footprint to road here, which is NOT verified as road grade.\nDo not blend this draft into the runtime until the user checks direction, road width and levels.\nExisting architecture and panorama are untouched.\n')
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
drive_obj.select_set(True)
bpy.context.view_layer.objects.active=drive_obj
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_location=Vector(world(0,18,0))
        area.spaces.active.region_3d.view_distance=85
        area.spaces.active.clip_end=2000
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'campus-terrain-working.blend'))
print(json.dumps({'scene':scene.name,'objects':len(scene.objects),'drive_length_m':join-half_road,'estimated_drive_drop_m':.9,'file':bpy.data.filepath}))
