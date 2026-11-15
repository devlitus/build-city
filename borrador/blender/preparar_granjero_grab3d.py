"""Prepara para la web el granjero gratuito de Grab3D (CC0): https://grab3d.com/models/characters/farmer/

Entrada: la versión "Rigged" en GLB (24 huesos, animaciones "walk" y "run", ~250 000 triángulos, 2K).
Salida: GLB ligero para la demo:
  - borra objetos sueltos (una icoesfera de ayuda),
  - diezma la malla a ~CARAS triángulos conservando los pesos del esqueleto,
  - reduce las texturas (color 2048, normal y metal/rugosidad 1024),
  - escala a 1,75 m (GDD),
  - renombra las animaciones a "Andar" y "Correr" y crea "Reposo" a partir del cuadro del andar en el
    que los pies están más juntos, con una respiración suave en la columna.

Uso:
  blender -b -P preparar_granjero_grab3d.py -- <farmer-rigged.glb> <salida.glb> [render.png]
"""
import math
import os
import sys

import bpy
from mathutils import Quaternion

args = sys.argv[sys.argv.index("--") + 1:]
ENTRADA, SALIDA = args[0], args[1]
RENDER = args[2] if len(args) > 2 else None
CARAS = 45000
ALTO = 1.75

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
escena.render.fps = 24
bpy.ops.import_scene.gltf(filepath=ENTRADA)

arm = next(o for o in escena.objects if o.type == "ARMATURE")
malla = next(o for o in escena.objects if o.type == "MESH" and o.parent == arm)
for o in list(escena.objects):
    if o not in (arm, malla):
        bpy.data.objects.remove(o)

# Diezmado (el modificador interpola los grupos de vértices, así que los pesos se conservan).
malla.data.calc_loop_triangles()
antes = len(malla.data.loop_triangles)
bpy.context.view_layer.objects.active = malla
mod = malla.modifiers.new("diezmado", "DECIMATE")
mod.ratio = min(1.0, CARAS / antes)
bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
bpy.ops.object.modifier_apply(modifier=mod.name)
malla.data.calc_loop_triangles()
print(f"triángulos: {antes} -> {len(malla.data.loop_triangles)}")

for img in bpy.data.images:
    lado = 2048 if "basecolor" in img.name else 1024
    if img.size[0] > lado:
        img.scale(lado, lado)
    print("textura", img.name, tuple(img.size))

# Altura: el objeto mide lo que mide la malla deformada en reposo.
alto_actual = malla.dimensions.z
arm.scale = [s * ALTO / alto_actual for s in arm.scale]
print(f"altura: {alto_actual:.3f} -> {ALTO} m")

acciones = {a.name: a for a in bpy.data.actions}
acciones["walk"].name = "Andar"
acciones["run"].name = "Correr"
andar = bpy.data.actions["Andar"]

# Reposo: cuadro del andar con los pies más juntos (fase de paso) + respiración.
arm.animation_data.action = andar
pb = arm.pose.bones
mejor, distancia = 0, 1e9
for f in range(int(andar.frame_range[0]), int(andar.frame_range[1]) + 1):
    escena.frame_set(f)
    d = (arm.matrix_world @ pb["LeftFoot"].head - arm.matrix_world @ pb["RightFoot"].head)
    if abs(d.y) < distancia:
        mejor, distancia = f, abs(d.y)
escena.frame_set(mejor)
pose = {b.name: (b.rotation_quaternion.copy(), b.location.copy()) for b in pb}
print(f"reposo basado en el cuadro {mejor} del andar")

reposo = bpy.data.actions.new("Reposo")
reposo.use_fake_user = True
arm.animation_data.action = reposo
columna = [n for n in ("Spine", "Spine01", "Spine02") if n in pb]
for f in range(0, 49, 6):
    fase = math.sin(2 * math.pi * f / 48)
    for b in pb:
        rot, loc = pose[b.name]
        b.rotation_mode = "QUATERNION"
        if b.name in columna:
            rot = rot @ Quaternion((1, 0, 0), 0.012 * fase)
        b.rotation_quaternion = rot
        b.location = loc
        b.keyframe_insert("rotation_quaternion", frame=f)
        b.keyframe_insert("location", frame=f)
for a in (andar, bpy.data.actions["Correr"]):
    a.use_fake_user = True
arm.animation_data.action = reposo
escena.frame_set(0)

bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True); malla.select_set(True)
bpy.ops.export_scene.gltf(filepath=SALIDA, export_format="GLB", use_selection=True, export_apply=True,
                          export_yup=True, export_animations=True, export_animation_mode="ACTIONS",
                          export_skins=True, export_image_format="JPEG", export_jpeg_quality=86)
print("exportado", SALIDA, os.path.getsize(SALIDA) // 1024, "KB")

if RENDER:
    escena.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys() else "BLENDER_EEVEE"
    mundo = bpy.data.worlds.new("cielo"); escena.world = mundo
    mundo.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.8, 0.82, 1)
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), 0, math.radians(25)))
    bpy.context.active_object.data.energy = 3.0
    escena.render.resolution_x, escena.render.resolution_y = 700, 900
    base, ext = os.path.splitext(RENDER)
    for nombre, pos, rot, accion, cuadro in [("frente", (0, -4, 0.9), (90, 0, 0), "Reposo", 0),
                                             ("lado", (4, 0, 0.9), (90, 0, 90), "Andar", 6),
                                             ("frente_y", (0, 4, 0.9), (90, 0, 180), "Reposo", 0)]:
        bpy.ops.object.camera_add(location=pos, rotation=tuple(math.radians(r) for r in rot))
        escena.camera = bpy.context.active_object
        arm.animation_data.action = bpy.data.actions[accion]
        escena.frame_set(cuadro)
        escena.render.filepath = f"{base}_{nombre}{ext}"
        bpy.ops.render.render(write_still=True)
