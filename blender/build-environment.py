"""First photo-guided environment pass, inside the existing campus master file.

Run in Blender after build-entrance-layout.py. Never rebuild over hand edits.
"""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

BASE = Path(__file__).resolve().parent
scene = bpy.data.scenes['Entrance road and ground - photo draft']
assert not scene.get('environment_pass'), 'Environment already exists; edit it in place.'
bpy.context.window.scene = scene
randomizer = random.Random(11026)
anchor = Vector(scene['gis_anchor_xy_m'])
right = Vector((.926, .377)).normalized()
forward = Vector((-right.y, right.x))
angle = math.atan2(right.y, right.x)

def world(x, y, z):
    p = anchor + right*x + forward*y
    return Vector((p.x, p.y, z))

def local(p):
    d = Vector(p[:2]) - anchor
    return d.dot(right), d.dot(forward)

def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

trees = collection('Environment - textured canopy and understory')
cover = collection('Environment - patchy verge planting')
details = collection('Environment - entrance gates and kerb detail')
views = collection('Environment - review cameras and daylight')
ground = scene.objects['Editable verges and lower courtyard grading']
bvh = BVHTree.FromPolygons([v.co for v in ground.data.vertices], [list(p.vertices) for p in ground.data.polygons])

def height(x, y):
    p = world(x, y, 100)
    hit = bvh.ray_cast(p, Vector((0, 0, -1)))[0]
    assert hit is not None, (x, y)
    return hit.z

def asset(asset_id, name):
    o = bpy.data.objects.get(name)
    if o is None:
        with bpy.data.libraries.load(str(BASE/'sources'/asset_id/(asset_id+'.blend')), link=False) as (src, dst):
            assert name in src.objects, name
            dst.objects = [name]
        o = dst.objects[0]
    return o

def tree(asset_id, name, x, y, target_height, rotation):
    source = asset(asset_id, name)
    o = bpy.data.objects.new('Canopy - '+asset_id, source.data)
    trees.objects.link(o)
    lo = min(v[2] for v in source.bound_box)
    hi = max(v[2] for v in source.bound_box)
    scale = target_height/(hi-lo)
    o.scale = (scale, scale, scale)
    o.rotation_euler.z = angle + rotation
    # Bury the lowest root slightly, rather than leaving the trunk floating.
    o.location = world(x, y, height(x, y)-lo*scale-.06)
    o['source'] = 'https://polyhaven.com/a/'+asset_id
    o['placement'] = 'Photo-guided proxy; not a surveyed tree or confirmed species'
    o['base_local_xy'] = [x, y]
    o['target_height_m'] = target_height
    return o

for x, y, h, rotation in [(-10,17,15,.4),(11,19,16,2.1),(-12,30,17,4.5),(14,31,15,1.3),(-20,53,16,2.9),(23,53,17,5.5)]:
    tree('jacaranda_tree','jacaranda_tree_LOD1',x,y,h,rotation)
for x, y, h in [(-23,17,7),(-31,25,8),(-22,31,6),(25,16,8),(32,26,9),(25,33,6),(-34,54,8),(37,57,9)]:
    tree('island_tree_02','island_tree_02_LOD1',x,y,h,randomizer.uniform(0,math.tau))

def pbr_material(name, asset_id, tile_m):
    m = bpy.data.materials[name]
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    maps = json.loads((BASE/'sources'/asset_id/'maps.json').read_text())
    coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeVectorMath')
    mapping.operation = next(e.identifier for e in mapping.bl_rna.properties['operation'].enum_items if e.identifier == 'SCALE')
    mapping.inputs['Scale'].default_value = 1/tile_m
    links.new(coord.outputs['Object'], mapping.inputs[0])
    for slot, filename in maps.items():
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(BASE/'sources'/asset_id/filename), check_existing=True)
        tex.label = asset_id+' '+slot
        links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
        if slot == 'color':
            links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        elif slot == 'roughness':
            tex.image.colorspace_settings.name = 'Non-Color'
            links.new(tex.outputs['Color'], bsdf.inputs['Roughness'])
        else:
            tex.image.colorspace_settings.name = 'Non-Color'
            normal = nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = .65
            links.new(tex.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    m['source'] = 'https://polyhaven.com/a/'+asset_id
    return m

pbr_material('Draft asphalt aggregate','asphalt_02',3)
earth = pbr_material('Exposed red earth','brown_mud_leaves_01',2.5)
# A metre-scale dirt/green mix prevents a uniformly painted lawn under the grass clumps.
green = bpy.data.materials['Planted verge ground']
nodes, links = green.node_tree.nodes, green.node_tree.links
bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
coord = nodes.new('ShaderNodeTexCoord')
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = .55
noise.inputs['Detail'].default_value = 3
links.new(coord.outputs['Object'], noise.inputs['Vector'])
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = .28
ramp.color_ramp.elements[0].color = (.11,.062,.028,1)
ramp.color_ramp.elements[1].position = .73
ramp.color_ramp.elements[1].color = (.13,.20,.038,1)
links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])

# UVs are measured in metres, also keeping the normal maps ready for later glTF baking.
for o in [ground,scene.objects['Entrance driveway with flared junction'],scene.objects['Principal Office Road - OSM alignment, provisional grade']]:
    uv = o.data.uv_layers.get('UVMap') or o.data.uv_layers.new(name='UVMap')
    tile = 3 if o != ground else 2.5
    for p in o.data.polygons:
        for index in p.loop_indices:
            v = o.data.vertices[o.data.loops[index].vertex_index].co
            uv.data[index].uv = (v.x/tile,v.y/tile)

# Bake many tiny grass cards into one mesh, preserving the source UVs and alpha material.
grass = asset('grass_bermuda_01','grass_bermuda_01_small_a')
vertices, faces, uvs = [], [], []
centres = []
attempts = 0
while len(centres) < 10000 and attempts < 60000:
    attempts += 1
    x, y = randomizer.uniform(-40,40), randomizer.uniform(5,60)
    # Keep all planting outside the apron, side paving, both roads and gate opening.
    if abs(x)<10 or (-39<x<-13 and y<12):
        continue
    p = world(x,y,100)
    road = scene.objects['Principal Office Road - OSM alignment, provisional grade']
    if 'road_bvh' not in globals():
        road_bvh = BVHTree.FromPolygons([v.co for v in road.data.vertices],[list(p.vertices) for p in road.data.polygons])
    if road_bvh.find_nearest(world(x,y,height(x,y)))[3] < 1.4:
        continue
    if any((x-t['base_local_xy'][0])**2+(y-t['base_local_xy'][1])**2 < 1.1**2 for t in trees.objects):
        continue
    density = .55 + .25*math.sin(x*.7)*math.sin(y*.4)
    if randomizer.random()>density:
        continue
    centres.append((x,y))
    scale = randomizer.uniform(2.2,5.5)
    transform = Matrix.Translation(world(x,y,height(x,y)-.008)) @ Matrix.Rotation(randomizer.uniform(0,math.tau),4,'Z') @ Matrix.Scale(scale,4)
    start = len(vertices)
    vertices.extend(transform@v.co for v in grass.data.vertices)
    for p in grass.data.polygons:
        faces.append(tuple(start+i for i in p.vertices))
        uvs.extend(tuple(grass.data.uv_layers.active.data[i].uv) for i in p.loop_indices)
mesh = bpy.data.meshes.new('Shared Bermuda verge cards')
mesh.from_pydata(vertices,[],faces)
mesh.materials.append(grass.data.materials[0])
uv = mesh.uv_layers.new(name='UVMap')
for item, value in zip(uv.data,uvs):
    item.uv = value
o = bpy.data.objects.new('Patchy Bermuda grass - road and trunk exclusion',mesh)
cover.objects.link(o)
o['clumps'] = len(centres)
o['source'] = 'https://polyhaven.com/a/grass_bermuda_01'

# Use standard PBR leaf shaders: keep the photographed alpha/UVs without the
# source libraries' renderer-specific translucent groups and dark variation.
for name in ['jacaranda_tree_leaves','island_tree_02_leaves','grass_bermuda_01']:
    m = bpy.data.materials[name]
    nodes, links = m.node_tree.nodes, m.node_tree.links
    output = next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.label = 'Portable textured foliage'
    shader.inputs['Roughness'].default_value = .8
    shader.inputs['Subsurface Weight'].default_value = .08
    for label, socket in [('Base Color','Base Color'),('Alpha','Alpha'),('Roughness','Roughness')]:
        tex = next(n for n in nodes if n.type=='TEX_IMAGE' and n.label==label)
        links.new(tex.outputs['Color'],shader.inputs[socket])
    tex = next(n for n in nodes if n.type=='TEX_IMAGE' and n.label=='Normal')
    normal = nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value = .5
    links.new(tex.outputs['Color'],normal.inputs['Color'])
    links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    links.new(shader.outputs['BSDF'],output.inputs['Surface'])

def material(name, color, metallic=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color,1)
    b = next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*color,1)
    b.inputs['Roughness'].default_value = .76
    b.inputs['Metallic'].default_value = metallic
    return m

iron = material('Aged ochre gate iron',(.21,.115,.055),.55)
stone = bpy.data.materials['Concrete kerb']

def beam(name, a, b, width, depth, mat):
    a,b = Vector(a),Vector(b)
    d = b-a
    bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2)
    o = bpy.context.object
    o.name = name
    for c in list(o.users_collection):
        c.objects.unlink(o)
    details.objects.link(o)
    o.rotation_euler = d.to_track_quat('Z','Y').to_euler()
    o.scale = (width,depth,d.length)
    o.data.materials.append(mat)
    return o

gate_y = scene['entrance_drive_length_m']*.72
# Keep the piers at the narrow throat, before the driveway begins to flare.
for side in [-1,1]:
    pier = scene.objects[('Left' if side<0 else 'Right')+' entrance gate pier - provisional']
    centre = sum((v.co for v in pier.data.vertices),Vector())/len(pier.data.vertices)
    x, old_y = local(centre)
    delta = forward*(gate_y-old_y)
    dz = height(x,gate_y)-min(v.co.z for v in pier.data.vertices)
    for v in pier.data.vertices:
        v.co += Vector((delta.x,delta.y,dz))
    pier.data.update()
scene['estimated_gate_distance_from_entrance_m'] = gate_y
for side in [-1,1]:
    label = 'West' if side<0 else 'East'
    hinge = Vector((side*3.48,gate_y))
    # Leaves rest along the verges, clear of the vehicle opening.
    direction = Vector((side*.16,-1)).normalized()
    z = height(*hinge)+.18
    def gate_point(u,h):
        p = hinge+direction*u
        return world(*p,z+h)
    for u in [0,2.5]:
        beam(label+' open gate upright',gate_point(u,0),gate_point(u,1.65),.045,.045,iron)
    for h in [0,.75,1.65]:
        beam(label+' open gate rail',gate_point(0,h),gate_point(2.5,h),.045,.045,iron)
    for i in range(1,12):
        beam(label+' gate picket',gate_point(i*2.5/12,0),gate_point(i*2.5/12,1.65),.018,.018,iron)
    beam(label+' gate brace',gate_point(0,0),gate_point(2.5,1.65),.026,.026,iron)
    for h in [.2,1.4]:
        beam(label+' gate hinge strap',world(side*3.39,gate_y,z+h),gate_point(0,h),.035,.05,iron)
    pier = scene.objects[('Left' if side<0 else 'Right')+' entrance gate pier - provisional']
    top = max(v.co.z for v in pier.data.vertices)
    beam(label+' gate pier coping',world(side*3.12,gate_y,top),world(side*3.12,gate_y,top+.08),.7,.7,stone)

def camera(name, position, target, lens):
    data = bpy.data.cameras.new(name)
    o = bpy.data.objects.new(name,data)
    views.objects.link(o)
    o.location = world(*position)
    o.rotation_euler = (world(*target)-o.location).to_track_quat('-Z','Y').to_euler()
    data.lens = lens
    data.clip_end = 1500
    return o

scene.camera = camera('Environment overview',(-48,66,40),(0,21,1),38)
camera('Entrance approach - eye level',(0,47,1.0),(0,3,1.3),26)
camera('Lower courtyard - eye level',(-24,5,1.2),(-10,26,1.5),30)
sun_data = bpy.data.lights.new('Soft campus daylight','SUN')
sun = bpy.data.objects.new('Soft campus daylight',sun_data)
views.objects.link(sun)
sun.rotation_euler = (.48,-.55,-.4)
sun_data.energy = 2.1
sun_data.angle = math.radians(12)
sky_data = bpy.data.lights.new('Broad sky fill','AREA')
sky = bpy.data.objects.new('Broad sky fill',sky_data)
views.objects.link(sky)
sky.location = world(0,25,32)
sky_data.energy = 65000
sky_data.size = 75
sky_data.color = (.78,.86,1)
background = next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs['Color'].default_value = (.55,.66,.78,1)
background.inputs['Strength'].default_value = .45
scene.render.resolution_x = 1400
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene['environment_pass'] = '01 - photo-guided vegetation and entrance details; draft, not runtime-ready'
scene['environment_seed'] = 11026
scene['asset_credits'] = 'Powered by Poly Haven - CC0 assets. See GIS-NOTES.md.'
bpy.context.view_layer.update()
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_location = world(0,24,3)
        area.spaces.active.region_3d.view_distance = 85
        area.spaces.active.region_3d.view_rotation = Vector((-.7,.6,.6)).to_track_quat('Z','Y')
        area.spaces.active.clip_end = 1500
print(json.dumps({'scene':scene.name,'trees':len(trees.objects),'grass_clumps':len(centres),'objects':len(scene.objects)}))

# Courtyard planting pass: callable independently without rebuilding the terrain.
def add_facade_planting():
    import bpy
    import math
    import random
    from pathlib import Path
    from mathutils import Vector, Matrix
    from mathutils.bvhtree import BVHTree

    scene = bpy.data.scenes['Entrance road and ground - photo draft']
    assert not scene.get('facade_planting_pass'), 'Edit the existing planting, do not duplicate it.'
    bpy.context.window.scene = scene
    base = Path(__file__).resolve().parent
    rng = random.Random(11102)
    anchor = Vector(scene['gis_anchor_xy_m'])
    right = Vector((.926,.377)).normalized()
    forward = Vector((-right.y,right.x))
    angle = math.atan2(right.y,right.x)
    ground = scene.objects['Editable verges and lower courtyard grading']
    terrain = BVHTree.FromPolygons([v.co for v in ground.data.vertices],[list(p.vertices) for p in ground.data.polygons])
    def world(x,y,z):
        p = anchor+right*x+forward*y
        return Vector((p.x,p.y,z))
    def height(x,y):
        return terrain.ray_cast(world(x,y,100),Vector((0,0,-1)))[0].z
    planting = bpy.data.collections.new('Environment - flowering shrubs and facade trees')
    scene.collection.children.link(planting)
    def mesh_object(name,vertices,faces,materials):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices,[],faces)
        mesh.update()
        o = bpy.data.objects.new(name,mesh)
        planting.objects.link(o)
        for material in materials:
            mesh.materials.append(material)
        return o

    source = scene.objects['Canopy - jacaranda_tree']
    for name,x,y,h,sx,sy in [('Slender tree beside left facade',-18,.45,11.5,.15,.12),('Forked tree beside main entrance',-8,1.35,12.8,.32,.26)]:
        o = bpy.data.objects.new(name,source.data)
        planting.objects.link(o)
        lo,hi = min(v[2] for v in source.bound_box),max(v[2] for v in source.bound_box)
        o.scale = (sx,sy,h/(hi-lo))
        o.rotation_euler.z = angle
        o.location = world(x,y,height(x,y)-lo*o.scale.z-.06)
        o['base_local_xy'] = [x,y]
        o['plant_role'] = 'facade_tree'
        o['placement'] = 'Photo-guided proportions; exact trunk survey and building registration pending'
        o['source'] = source['source']

    source_name = 'shrub_03_a_LOD0'
    sprig = bpy.data.objects.get(source_name)
    if sprig is None:
        with bpy.data.libraries.load(str(base/'sources'/'shrub_03'/'shrub_03.blend'),link=False) as (src,dst):
            dst.objects = [source_name]
        sprig = dst.objects[0]
    foliage = sprig.data.materials[0]
    nodes,links = foliage.node_tree.nodes,foliage.node_tree.links
    output = next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.label = 'Portable shrub foliage'
    shader.inputs['Roughness'].default_value = .85
    for label,socket in [('Base Color','Base Color'),('Alpha','Alpha')]:
        tex = next(n for n in nodes if n.type=='TEX_IMAGE' and n.label==label)
        links.new(tex.outputs['Color'],shader.inputs[socket])
    normal = nodes.new('ShaderNodeNormalMap')
    tex = next(n for n in nodes if n.type=='TEX_IMAGE' and n.label=='Normal')
    links.new(tex.outputs['Color'],normal.inputs['Color'])
    links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    links.new(shader.outputs['BSDF'],output.inputs['Surface'])
    def color_material(name,color):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        m.diffuse_color = (*color,1)
        b = next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (*color,1)
        b.inputs['Roughness'].default_value = .78
        b.inputs['Subsurface Weight'].default_value = .06
        return m
    petals = [color_material('Papery pink bracts',(.52,.025,.17)),color_material('Rose bract variation',(.72,.055,.27)),color_material('Small ivory flower centres',(.8,.72,.5))]
    stem_material = color_material('Woody shrub stems',(.12,.065,.028))
    shrub_min = min(v.co.z for v in sprig.data.vertices)
    shrub_height = max(v.co.z for v in sprig.data.vertices)-shrub_min
    centre = Vector(((min(v.co.x for v in sprig.data.vertices)+max(v.co.x for v in sprig.data.vertices))/2,(min(v.co.y for v in sprig.data.vertices)+max(v.co.y for v in sprig.data.vertices))/2,shrub_min))

    for index,(x,y,h,flowering) in enumerate([(-5.7,12.5,1.8,True),(-7.2,14,2.1,True),(-8.4,13,1.55,True),(-6.5,9.3,1.65,False),(-7.5,9.6,1.25,False),(-18.1,.65,.65,False)]):
        root = world(x,y,height(x,y)-.015)
        verts,faces,uvs,stems,stem_faces,candidates = [],[],[],[],[],[]
        for branch in range(38):
            theta = rng.uniform(0,math.tau)
            radius = h*rng.uniform(.1,.40)
            tip = Vector((math.cos(theta)*radius,math.sin(theta)*radius,h*rng.uniform(.32,.66)))
            foot = Vector((rng.uniform(-.12,.12)*h,rng.uniform(-.12,.12)*h,0))
            bend = tip*.45+Vector((rng.uniform(-.08,.08)*h,rng.uniform(-.08,.08)*h,.03))
            points = [foot,bend,tip]
            start = len(stems)
            # Tapered stems support each leaf spray; no detached floating clusters.
            for k,p in enumerate(points):
                r = (.006,.003,.001)[k]*h
                for j in range(6):
                    stems.append(root+p+Vector((math.cos(j*math.tau/6)*r,math.sin(j*math.tau/6)*r,0)))
            for k in range(2):
                for j in range(6):
                    a = start+k*6+j; b = start+k*6+(j+1)%6
                    stem_faces.append((a,b,b+6,a+6))
            for along in [.25,.60,1]:
                length = h*rng.uniform(.33,.52)
                rotation = Vector((tip.x*.6,tip.y*.6,1)).to_track_quat('Z','Y').to_matrix().to_4x4() @ Matrix.Rotation(theta+along*2,4,'Z')
                location = foot.lerp(bend,along*2) if along<.5 else bend.lerp(tip,along*2-1)
                transform = Matrix.Translation(root+location) @ rotation @ Matrix.Scale(length/shrub_height,4) @ Matrix.Translation(-centre)
                offset = len(verts)
                for v in sprig.data.vertices:
                    p = transform@v.co
                    verts.append(p)
                    if along==1 and v.co.z>shrub_min+shrub_height*.60:
                        candidates.append(p)
                for face in sprig.data.polygons:
                    faces.append(tuple(offset+i for i in face.vertices))
                    uvs.extend(tuple(sprig.data.uv_layers.active.data[i].uv) for i in face.loop_indices)
        shrub = mesh_object(('Pink flowering shrub' if flowering else 'Bright green understory')+' %02d'%index,verts,faces,[foliage])
        uv = shrub.data.uv_layers.new(name='UVMap')
        for item,value in zip(uv.data,uvs):
            item.uv = value
        shrub['plant_role'] = 'flowering_shrub' if flowering else 'green_shrub'
        shrub['base_local_xy'] = [x,y]
        shrub['source'] = 'https://polyhaven.com/a/shrub_03; custom stems and pink bracts, visual proxy only'
        mesh_object('Supporting shrub stems %02d'%index,stems,stem_faces,[stem_material])
        if flowering:
            v,f,slots = [],[],[]
            for p in rng.sample(candidates,min(120,len(candidates))):
                # Folded, pointed bracts in threes, clustered on actual leaf-spray tips.
                orientation = Vector((p.x-root.x,p.y-root.y,.5)).to_track_quat('Z','Y').to_matrix()
                for petal in range(3):
                    turn = orientation @ Matrix.Rotation(petal*math.tau/3+rng.uniform(-.2,.2),3,'Z')
                    length = rng.uniform(.035,.065)
                    profile = [(0,0,0),(-.42,.45,.12),(-.28,.85,.05),(0,1,.12),(.30,.83,.04),(.42,.42,.10),(0,.52,.25)]
                    start = len(v)
                    v.extend(p+turn@(Vector(q)*length) for q in profile)
                    for a,b in [(0,1),(1,2),(2,3),(3,4),(4,5),(5,0)]:
                        f.append((start+a,start+b,start+6)); slots.append(rng.randrange(2))
                start = len(v)
                v.extend(p+orientation@Vector(q) for q in [(-.003,0,.007),(.003,0,.007),(0,.005,.012)])
                f.append((start,start+1,start+2)); slots.append(2)
            flowers = mesh_object('Pink bloom clusters %02d'%index,v,f,petals)
            flowers['plant_role'] = 'blooms'
            for face,slot in zip(flowers.data.polygons,slots):
                face.material_index = slot

    # The low, weathered bed edging around the entrance-side tree in reference #3.
    curb = color_material('Dark weathered tree-bed edging',(.095,.10,.075))
    for a,b in [((-10,.15),(-10,2.8)),((-10,2.8),(-5.8,2.8)),((-5.8,2.8),(-5.8,.15))]:
        p,q = world(*a,height(*a)+.13),world(*b,height(*b)+.13)
        direction = (q-p).normalized(); side = Vector((-direction.y,direction.x,0))*.075
        v = [c+s+Vector((0,0,z)) for c in [p,q] for z in [-.13,.13] for s in [-side,side]]
        mesh_object('Low entrance tree-bed edging',v,[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],[curb])
    data = bpy.data.cameras.new('Facade planting review')
    camera = bpy.data.objects.new('Facade planting review',data)
    bpy.data.collections['Environment - review cameras and daylight'].objects.link(camera)
    camera.location = world(-13,12,4.6)
    camera.rotation_euler = (world(-13,1,6)-camera.location).to_track_quat('-Z','Y').to_euler()
    data.lens = 20
    scene['facade_planting_pass'] = '02 - pink flowering shrubs, bright understory and two facade trees'
    bpy.context.view_layer.update()
    print('Added courtyard planting in the existing master:',len(planting.objects),'objects')

add_facade_planting()

# Rear canopy pass: run this section in the existing master, without rebuilding it.
def add_rear_canopy():
    import bpy
    import math
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    scene = bpy.data.scenes['Entrance road and ground - photo draft']
    assert not scene.get('rear_canopy_pass'), 'Rear canopy already exists; edit it in place'
    bpy.context.window.scene = scene
    collection = bpy.data.collections.new('Environment - rear terrace canopy')
    scene.collection.children.link(collection)
    anchor = Vector((-4.8,9.0))
    right = Vector((.926,.377)).normalized()
    forward = Vector((-right.y,right.x))
    def world(x,y,z):
        p = anchor+right*x+forward*y
        return Vector((p.x,p.y,z))
    ground = scene.objects['Editable verges and lower courtyard grading']
    bvh = BVHTree.FromPolygons([ground.matrix_world@v.co for v in ground.data.vertices],[list(p.vertices) for p in ground.data.polygons])
    # Ground-rooted outside the wings; only the upper crowns reach the parapets.
    # Sizes and placements are photo estimates until the detailed building is registered.
    placements = [
        ('Spreading canopy beside tank terrace','jacaranda_tree',-38.85,-15,(.56,.66,.86),0),
        ('Rear compound-leaf canopy','jacaranda_tree',-29,-34,(.48,.70,.82),0),
        ('Rear right spreading canopy','jacaranda_tree',42,-20,(.59,.64,1.02),math.pi),
        ('Broadleaf screen beside AC terrace','island_tree_02',-40.1,-3,(2.7,2.3,4.8),.4),
        ('Broadleaf rear screen west','island_tree_02',-16,-29,(1.6,1.7,4.5),1.2),
        ('Broadleaf rear screen centre','island_tree_02',0,-28,(1.8,1.7,4.2),2.4),
        ('Narrow rear crown east','island_tree_02',26,-35,(1.05,1.05,5.5),.7),
    ]
    for name,source,x,y,scale,turn in placements:
        mesh = scene.objects['Canopy - '+source].data
        obj = bpy.data.objects.new(name,mesh)
        collection.objects.link(obj)
        obj.scale = scale
        obj.rotation_euler.z = math.atan2(right.y,right.x)+turn
        hit = bvh.ray_cast(world(x,y,100),Vector((0,0,-1)))[0]
        assert hit is not None
        obj.location = world(x,y,hit.z-.06-min(v.co.z for v in mesh.vertices)*scale[2])
        obj['plant_role'] = 'rear_canopy'
        obj['base_local_xy'] = [x,y]
        obj['source'] = 'https://polyhaven.com/a/'+source
        obj['placement'] = 'Photo-guided ground root; terrace overhang pending detailed building registration'
    data = bpy.data.cameras.new('Rear canopy review')
    camera = bpy.data.objects.new('Rear canopy review',data)
    bpy.data.collections['Environment - review cameras and daylight'].objects.link(camera)
    camera.location = world(-52,-44,25)
    camera.rotation_euler = (world(-5,-13,7)-camera.location).to_track_quat('-Z','Y').to_euler()
    data.lens = 28
    scene.camera = camera
    scene['rear_canopy_pass'] = '03 - ground-rooted spreading and broadleaf terrace canopy'
    bpy.context.view_layer.update()
    print('Added rear canopy to the same master:',len(collection.objects),'shared-mesh trees')

add_rear_canopy()
