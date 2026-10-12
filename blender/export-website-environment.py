"""Web derivatives of the current master, kept in a scene inside the same file."""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector, Matrix

BASE = Path(__file__).resolve().parent
source = bpy.data.scenes['Entrance road and ground - photo draft']
NAME = 'Website environment export'
assert bpy.data.scenes.get(NAME) is None, 'Edit the existing export scene instead of duplicating it'
scene = bpy.data.scenes.new(NAME)
bpy.context.window.scene = scene
anchor = Vector(source['gis_anchor_xy_m'])
right = Vector((.926,.377)).normalized()
forward = Vector((-right.y,right.x))
# Blender +Y is toward the road. glTF is Y-up with -Z forward.
# Align the start of the existing drive with the approved entrance apron edge.
registration = Matrix(((right.x,right.y,0,-right.dot(anchor)),
                       (-forward.x,-forward.y,0,forward.dot(anchor)-10.75),
                       (0,0,1,0),(0,0,0,1)))
scene['source_blend'] = 'campus-terrain-working.blend'
scene['entrance_apron_edge_z'] = 10.75
scene['drive_drop_m'] = source['estimated_drive_drop_m']
scene['grading_status'] = 'Photo-based provisional elevations, not surveyed'
meshes, materials, images = {}, {}, {}
report = []

def web_image(image):
    if image.name not in images:
        path = Path(bpy.path.abspath(image.filepath))
        # Keep original image bytes packed; resize only after glTF export.
        fresh = bpy.data.images.load(str(path),check_existing=False) if path.is_file() else image
        if fresh != image:
            fresh.name = 'Web source - '+image.name
            fresh.colorspace_settings.name = image.colorspace_settings.name
            fresh.pack()
        images[image.name] = fresh
    return images[image.name]

def web_material(original):
    if original.name in materials:
        return materials[original.name]
    m = bpy.data.materials.new('Web - '+original.name)
    materials[original.name] = m
    m.use_nodes = True
    nodes,links = m.node_tree.nodes,m.node_tree.links
    bsdf = next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    old = next((n for n in original.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    bsdf.inputs['Base Color'].default_value = old.inputs['Base Color'].default_value if old else original.diffuse_color
    bsdf.inputs['Roughness'].default_value = .85
    source_material = original
    if original.name=='Planted verge ground':
        source_material = bpy.data.materials['Exposed red earth']
    connected = set()
    for node in source_material.node_tree.nodes:
        if node.type!='TEX_IMAGE' or node.image is None:
            continue
        label = node.label.lower()
        slot = 'Base Color' if label=='base color' or label.endswith(' color') or label.startswith('diffus') else 'Alpha' if label=='alpha' else 'Roughness' if 'rough' in label else 'Normal' if 'normal' in label else None
        if slot is None or slot in connected:
            continue
        connected.add(slot)
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = web_image(node.image)
        if slot=='Normal':
            normal = nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = .5
            links.new(tex.outputs['Color'],normal.inputs['Color'])
            links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
        else:
            links.new(tex.outputs['Color'],bsdf.inputs[slot])
    m['source_material'] = original.name
    m['foliage'] = any(w in original.name.lower() for w in ['leaves','shrub_03','grass_bermuda','bract','flower centr'])
    if m['foliage']:
        bsdf.inputs['Roughness'].default_value = .72
        m.use_backface_culling = False
        color = next(iter(bsdf.inputs['Base Color'].links),None)
        if color and color.from_node.type=='TEX_IMAGE' and Path(color.from_node.image.filepath).suffix.lower()=='.png':
            # The supplied diffuse PNG already includes its mask. Recombining
            # separate RGB and alpha images can premultiply/darken the export.
            links.new(color.from_node.outputs['Alpha'],bsdf.inputs['Alpha'])
    return m

def simplify_tree(original, target):
    # Collapse woody branches separately so small leaf sprays retain their canopy area.
    parts = []
    for slot, material in enumerate(original.materials):
        foliage = 'leaves' in material.name
        trunk = 'trunk' in material.name or slot == 0
        mesh = original.copy()
        bm = bmesh.new(); bm.from_mesh(mesh)
        unwanted = [f for f in bm.faces if f.material_index != slot]
        bmesh.ops.delete(bm,geom=unwanted,context='FACES')
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
        bm.to_mesh(mesh); bm.free()
        obj=bpy.data.objects.new('Web tree component',mesh); scene.collection.objects.link(obj)
        bpy.context.view_layer.objects.active=obj
        triangles=sum(len(p.vertices)-2 for p in mesh.polygons)
        mod=obj.modifiers.new('Component triangle budget','DECIMATE')
        mod.ratio=1 if trunk else min(1,target*(.82 if foliage else .18)/max(1,triangles)); mod.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
        parts.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    result=parts[0].data
    bpy.data.objects.remove(parts[0],do_unlink=True)
    return result

def simplified_mesh(original, target):
    key = original.as_pointer()
    if key in meshes:
        return meshes[key]
    is_tree = any('tree' in m.name for m in original.materials)
    obj = bpy.data.objects.new('Web simplification',simplify_tree(original,target) if is_tree else original.copy())
    scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    triangles = sum(len(p.vertices)-2 for p in original.polygons)
    if triangles > target and not is_tree:
        modifier = obj.modifiers.new('Web triangle budget','DECIMATE')
        modifier.ratio = target/triangles
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    mesh = obj.data
    mesh.name = 'Web - '+original.name
    for i,m in enumerate(list(mesh.materials)):
        mesh.materials[i] = web_material(m)
    meshes[key] = mesh
    bpy.data.objects.remove(obj,do_unlink=True)
    print('Simplified',original.name,triangles,'->',sum(len(p.vertices)-2 for p in mesh.polygons),flush=True)
    return mesh

for original in source.objects:
    if original.type!='MESH' or original.name=='Department footprint - registration only':
        continue
    tree = original.get('base_local_xy') is not None and ('Canopy - ' in original.name or original.get('plant_role') in ['facade_tree','rear_canopy'])
    plant = tree or any(w in original.name for w in ['shrub','understory','bloom','Bermuda'])
    target = 200000 if tree and 'jacaranda' in original.data.materials[0].name else 80000 if tree else 40000 if 'shrub' in original.name or 'understory' in original.name else 200000
    mesh = simplified_mesh(original.data,target)
    obj = bpy.data.objects.new(original.name,mesh)
    scene.collection.objects.link(obj)
    obj.matrix_world = registration@original.matrix_world
    obj['source_object'] = original.name
    obj['vegetation'] = bool(plant)
    obj['tree'] = bool(tree)
    obj['source_collection'] = original.users_collection[0].name
    # Keep closed terrain/road slabs from the authoring model.
    for old in original.modifiers:
        if old.type=='SOLIDIFY':
            mod=obj.modifiers.new(old.name,'SOLIDIFY'); mod.thickness=old.thickness; mod.offset=old.offset
    if plant:
        low = min(v.co.z for v in mesh.vertices)
        high = max(v.co.z for v in mesh.vertices)
        obj['wind_height'] = (high-low)*abs(original.scale.z)
        if mesh.attributes.get('_WIND') is None:
            weights=mesh.attributes.new('_WIND','FLOAT_VECTOR','POINT')
            leaf_vertices=set()
            for face in mesh.polygons:
                if mesh.materials[face.material_index].get('foliage'):
                    leaf_vertices.update(face.vertices)
            for v in mesh.vertices:
                height=max(0,min(1,(v.co.z-low)/max(.01,high-low)))
                if 'Bermuda' in original.name:
                    # The original grass is baked in twelve-vertex rooted clumps.
                    start=v.index//12*12
                    bottom=min(mesh.vertices[k].co.z for k in range(start,min(start+12,len(mesh.vertices))))
                    height=max(0,min(1,(v.co.z-bottom)/.35))
                weights.data[v.index].vector=(height*height, float(v.index in leaf_vertices)*height, (v.co.x*.37+v.co.y*.19)%1)
    report.append({'name':original.name,'tree':bool(tree),'vegetation':bool(plant),'triangles':sum(len(p.vertices)-2 for p in mesh.polygons)})

bpy.context.view_layer.update()
scene['tree_count'] = sum(o['tree'] for o in report)
scene['export_triangles'] = sum(o['triangles'] for o in report)
scene['wind_attribute'] = '_WIND: bend weight, leaf flexibility, phase'
print(json.dumps({'objects':len(report),'trees':scene['tree_count'],'triangles':scene['export_triangles']},indent=2))

def export():
    path=BASE.parent/'public'/'media'/'campus-environment.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_active_scene=True,
        export_extras=True,export_attributes=True,export_apply=True,export_animations=False,
        export_cameras=False,export_lights=False,export_vertex_color='NONE',
        export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    print('Exported',path,path.stat().st_size,'bytes')
    # prepare-environment.mjs repacks the embedded images before deployment.
    (BASE/'gis'/'runtime-checks.json').write_text(json.dumps({'source':bpy.data.filepath,'trees':scene['tree_count'],'triangles':scene['export_triangles'],'bytes':path.stat().st_size,'registration_apron_z':10.75,'objects':report},indent=2)+'\n',newline='\n')

export()
