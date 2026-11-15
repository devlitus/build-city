"""Boceto 3D (blockout) del juego de granja.

Genera tres láminas con formas simples y estilo low-poly:
  1. valle.png       – el valle 6×6 parcelas con tipos de terreno, río y parcelas propias
  2. progresion.png  – la misma parcela en el día 1, el mes 1 y el año 2
  3. escala.png      – granjero frente a los edificios con una cuadrícula de 1 m

Uso:
  blender -b -P boceto.py -- <carpeta_salida>
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.dirname(__file__)
random.seed(42)

# ---------------------------------------------------------------- utilidades
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
MATS = {}

def mat(name, rgb, rough=0.9, emit=0.0, alpha=1.0):
    key = (name, alpha)
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            m.blend_method = "BLEND"
    MATS[key] = m
    return m

def hexc(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

PAL = {
    "prado": hexc("#8fb86a"), "bosque": hexc("#5e8f4e"), "rocoso": hexc("#a89f8c"),
    "rio": hexc("#5fa8c9"), "tierra": hexc("#8a5a3b"), "madera": hexc("#b07a4a"),
    "madera_osc": hexc("#7a5234"), "teja": hexc("#c4553b"), "crema": hexc("#efe4cc"),
    "ocre": hexc("#d9a441"), "piedra": hexc("#9c9a92"), "hoja": hexc("#4f7d3f"),
    "hoja2": hexc("#6f9d48"), "lona": hexc("#e8dcc0"), "fuego": hexc("#ff9a3c"),
    "trigo": hexc("#e3c25a"), "brote": hexc("#9fd16a"), "propia": hexc("#ffe08a"),
    "cristal": hexc("#bfe3ef"), "granero": hexc("#b5432f"), "piel": hexc("#e8b48c"),
    "vaquero": hexc("#4f6f9a"), "linea": hexc("#f6efdc"), "agua_osc": hexc("#3f86a8"),
}

def link(o, coll=None):
    (coll or scene.collection).objects.link(o)
    return o

def box(name, loc, size, m, rot_z=0.0, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=(0, 0, rot_z))
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    if bevel:
        mod = o.modifiers.new("bev", "BEVEL")
        mod.width = bevel
        mod.segments = 1
    return o

def cyl(name, loc, r, h, m, verts=6, r2=None, rot=(0, 0, 0)):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(m)
    return o

def roof(name, loc, w, d, h, m, rot_z=0.0):
    """Tejado a dos aguas: prisma triangular."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    x, y = w / 2, d / 2
    v = [bm.verts.new(p) for p in [(-x, -y, 0), (x, -y, 0), (0, -y, h), (-x, y, 0), (x, y, 0), (0, y, h)]]
    for f in [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]:
        bm.faces.new([v[i] for i in f])
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler.z = rot_z
    me.materials.append(m)
    return link(o)

def tree(loc, s=1.0, kind="pino"):
    x, y, z = loc
    cyl("tronco", (x, y, z + 0.6 * s), 0.18 * s, 1.2 * s, mat("madera_osc", PAL["madera_osc"]))
    if kind == "pino":
        for i, (r, h) in enumerate([(1.3, 1.8), (1.0, 1.5), (0.7, 1.2)]):
            cyl("copa", (x, y, z + (1.6 + i * 0.8) * s), r * s, h * s,
                mat("hoja", PAL["hoja"]), verts=7, r2=0.0)
    else:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.2 * s, location=(x, y, z + 2.0 * s))
        o = bpy.context.active_object
        o.data.materials.append(mat("hoja2", PAL["hoja2"]))

def rock(loc, s=1.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.6 * s, location=loc)
    o = bpy.context.active_object
    o.scale = (1.0, 0.8 + random.random() * 0.4, 0.55)
    o.rotation_euler.z = random.random() * math.pi
    o.data.materials.append(mat("piedra", PAL["piedra"]))

def fence(x0, y0, x1, y1, z=0.0):
    m = mat("madera", PAL["madera"])
    L = math.dist((x0, y0), (x1, y1))
    n = max(2, int(L / 2) + 1)
    ang = math.atan2(y1 - y0, x1 - x0)
    for i in range(n):
        t = i / (n - 1)
        box("poste", (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z + 0.45), (0.15, 0.15, 0.9), m)
    for hh in (0.35, 0.7):
        box("tabla", ((x0 + x1) / 2, (y0 + y1) / 2, z + hh), (L, 0.08, 0.1), m, rot_z=ang)

def field(cx, cy, w, d, crop="brote", rows=None):
    box("tierra", (cx, cy, 0.05), (w, d, 0.1), mat("tierra", PAL["tierra"]))
    rows = rows or int(d / 1.0)
    for i in range(rows):
        y = cy - d / 2 + 0.5 + i * (d - 1) / max(1, rows - 1)
        box("surco", (cx, y, 0.14), (w - 0.4, 0.35, 0.1), mat("tierra2", PAL["madera_osc"]))
        if crop:
            k = int(w / 0.8)
            for j in range(k):
                x = cx - w / 2 + 0.5 + j * (w - 1) / max(1, k - 1)
                if crop == "trigo":
                    cyl("planta", (x, y, 0.55), 0.18, 0.8, mat("trigo", PAL["trigo"]), verts=5, r2=0.05)
                else:
                    cyl("planta", (x, y, 0.3), 0.18, 0.35, mat("brote", PAL["brote"]), verts=5, r2=0.0)

def house(cx, cy, w=6, d=5, h=3, roof_m="teja", wall="crema", rot=0.0, chimney=True):
    box("muro", (cx, cy, h / 2), (w, d, h), mat(wall, PAL[wall]))
    roof("tejado", (cx, cy, h), w + 0.6, d + 0.6, h * 0.6, mat(roof_m, PAL[roof_m]), rot_z=rot)
    box("puerta", (cx, cy - d / 2 - 0.02, 1.0), (1.0, 0.1, 2.0), mat("madera_osc", PAL["madera_osc"]))
    for sx in (-1, 1):
        box("ventana", (cx + sx * w / 3.2, cy - d / 2 - 0.02, 1.8), (0.9, 0.1, 0.8),
            mat("cristal", PAL["cristal"], rough=0.2))
    if chimney:
        box("chimenea", (cx + w / 4, cy + d / 6, h + h * 0.55), (0.6, 0.6, 1.4), mat("piedra", PAL["piedra"]))

def farmer(cx, cy, s=1.0):
    """Granjero de referencia: 1,75 m."""
    box("botas", (cx, cy, 0.1 * s), (0.45 * s, 0.3 * s, 0.2 * s), mat("madera_osc", PAL["madera_osc"]))
    box("piernas", (cx, cy, 0.55 * s), (0.42 * s, 0.26 * s, 0.7 * s), mat("vaquero", PAL["vaquero"]))
    box("torso", (cx, cy, 1.15 * s), (0.5 * s, 0.3 * s, 0.6 * s), mat("ocre", PAL["ocre"]))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.2 * s, location=(cx, cy, 1.6 * s))
    bpy.context.active_object.data.materials.append(mat("piel", PAL["piel"]))
    cyl("ala", (cx, cy, 1.72 * s), 0.38 * s, 0.04 * s, mat("trigo", PAL["trigo"]), verts=10)
    cyl("copa", (cx, cy, 1.82 * s), 0.2 * s, 0.18 * s, mat("trigo", PAL["trigo"]), verts=8, r2=0.17 * s)

# -------------------------------------------------------- 1. el valle 6×6
PLOT = 16
N = 6
ORIGIN = Vector((0, 0, 0))
tipos = [
    "pbbprr".replace("p", "P"), "pbrrpb", "bprppb", "rpprrp", "prpbrr", "pppppb",
]
mapa = [[{"P": "prado", "p": "prado", "b": "bosque", "r": "rocoso"}[c] for c in fila] for fila in tipos]
propias = {(2, 3), (3, 3), (3, 2)}
rio = [(0, 3.4), (1, 3.4), (2, 3.4), (2.3, 3.4), (2.3, 4.2), (4, 4.2), (4, 5.4), (6, 5.4)]

def plot_origin(i, j):
    return Vector((ORIGIN.x + (i - N / 2) * PLOT, ORIGIN.y + (j - N / 2) * PLOT, 0))

for i in range(N):
    for j in range(N):
        t = mapa[j][i]
        o = plot_origin(i, j)
        cx, cy = o.x + PLOT / 2, o.y + PLOT / 2
        box(f"parcela_{i}_{j}", (cx, cy, -0.25), (PLOT - 0.3, PLOT - 0.3, 0.5), mat(t, PAL[t]))
        if (i, j) in propias:
            box("propia", (cx, cy, 0.02), (PLOT - 0.3, PLOT - 0.3, 0.04),
                mat("propia_a", PAL["propia"], alpha=0.35))
        if t == "bosque":
            for _ in range(14):
                tree((cx + random.uniform(-6.5, 6.5), cy + random.uniform(-6.5, 6.5), 0),
                     random.uniform(0.8, 1.3), random.choice(["pino", "pino", "redondo"]))
        elif t == "rocoso":
            for _ in range(9):
                rock((cx + random.uniform(-6.5, 6.5), cy + random.uniform(-6.5, 6.5), 0.1),
                     random.uniform(0.7, 1.6))
        else:
            for _ in range(2):
                tree((cx + random.uniform(-6, 6), cy + random.uniform(-6, 6), 0), 0.8, "redondo")
# bordes de parcela
for k in range(N + 1):
    a = (k - N / 2) * PLOT
    box("borde", (a, 0, 0.03), (0.25, N * PLOT, 0.06), mat("linea", PAL["linea"]))
    box("borde", (0, a, 0.03), (N * PLOT, 0.25, 0.06), mat("linea", PAL["linea"]))
# río (en coordenadas de parcela)
for (a, b) in zip(rio, rio[1:]):
    p0 = Vector(((a[0] - N / 2) * PLOT, (a[1] - N / 2) * PLOT, 0))
    p1 = Vector(((b[0] - N / 2) * PLOT, (b[1] - N / 2) * PLOT, 0))
    mid, L = (p0 + p1) / 2, (p1 - p0).length
    ang = math.atan2(p1.y - p0.y, p1.x - p0.x)
    box("rio", (mid.x, mid.y, 0.06), (L + 4, 4, 0.12), mat("rio", PAL["rio"], rough=0.15), rot_z=ang)
# colinas que cierran el valle
for k in range(40):
    ang = k / 40 * math.tau
    r = N * PLOT * 0.78 + random.uniform(0, 10)
    cyl("colina", (math.cos(ang) * r, math.sin(ang) * r, 0), random.uniform(14, 22),
        random.uniform(10, 26), mat("bosque", PAL["bosque"]), verts=6, r2=random.uniform(2, 6))
# campamento en la primera parcela propia
o = plot_origin(2, 3)
cyl("tienda", (o.x + 8, o.y + 8, 0.9), 1.4, 1.8, mat("lona", PAL["lona"]), verts=4, r2=0.0)
cyl("hoguera", (o.x + 10, o.y + 7, 0.25), 0.4, 0.5, mat("fuego", PAL["fuego"], emit=4), verts=5, r2=0.0)
# pueblo al sur
for k in range(7):
    house(-12 + k * 6, -N * PLOT / 2 - 14 - (k % 2) * 6, 4.5, 4, 3, wall="crema")
cyl("campanario", (6, -N * PLOT / 2 - 26, 6), 1.6, 12, mat("piedra", PAL["piedra"]), verts=4)

# ---------------------------------------- 2. progresión de una parcela (día 1 → año 2)
PROG_Y = -260
def plot_base(cx, cy, t="prado"):
    box("base", (cx, cy, -0.25), (PLOT, PLOT, 0.5), mat(t, PAL[t]))

etapas = [-24, 0, 24]
# Día 1: tienda, hoguera, árboles y rocas sin tocar
cx, cy = etapas[0], PROG_Y
plot_base(cx, cy)
cyl("tienda", (cx - 2, cy + 1, 0.9), 1.4, 1.8, mat("lona", PAL["lona"]), verts=4, r2=0.0)
cyl("hoguera", (cx + 0.5, cy - 1, 0.25), 0.4, 0.5, mat("fuego", PAL["fuego"], emit=4), verts=5, r2=0.0)
for p in [(-5, 5), (4, 6), (6, -2), (-6, -5), (2, 4), (-3, -6)]:
    tree((cx + p[0], cy + p[1], 0), random.uniform(0.8, 1.1), random.choice(["pino", "redondo"]))
for p in [(5, 2), (-6, 0), (1, -5)]:
    rock((cx + p[0], cy + p[1], 0.1), 1.2)
farmer(cx + 1.5, cy - 2)
# Mes 1: cobertizo, primer bancal, valla parcial, montón de troncos
cx = etapas[1]
plot_base(cx, cy)
house(cx - 3.5, cy + 4, 4, 3, 2.4, roof_m="madera_osc", wall="madera", chimney=False)
field(cx + 2.5, cy - 1, 7, 6, "brote")
fence(cx - 7.5, cy - 7.5, cx + 7.5, cy - 7.5)
fence(cx + 7.5, cy - 7.5, cx + 7.5, cy + 2)
for k in range(5):
    cyl("tronco", (cx - 5, cy - 3 + k * 0.45, 0.25 + (k % 2) * 0.4), 0.22, 2.2,
        mat("madera", PAL["madera"]), verts=6, rot=(0, math.pi / 2, 0))
for p in [(-6, 6.5), (6.5, 6)]:
    tree((cx + p[0], cy + p[1], 0), 0.9, "redondo")
farmer(cx - 1, cy - 4)
# Año 2: casa, granero, silo, molino, campos de trigo, valla completa, camino
cx = etapas[2]
plot_base(cx, cy)
house(cx - 3.5, cy + 4, 6, 4.5, 3)
box("granero", (cx + 4, cy + 4.5, 2.2), (5, 5, 4.4), mat("granero", PAL["granero"]))
roof("tejado_g", (cx + 4, cy + 4.5, 4.4), 5.6, 5.6, 2.6, mat("madera_osc", PAL["madera_osc"]))
cyl("silo", (cx + 7, cy + 1, 3), 1.1, 6, mat("piedra", PAL["piedra"]), verts=10)
cyl("silo_t", (cx + 7, cy + 1, 6.6), 1.2, 1.2, mat("teja", PAL["teja"]), verts=10, r2=0.0)
field(cx - 2, cy - 3.5, 9, 6, "trigo")
field(cx + 5, cy - 4, 4, 5, "brote")
box("camino", (cx, cy + 0.6, 0.06), (15, 1.4, 0.12), mat("ocre", PAL["ocre"]))
for (a, b, c, d) in [(-7.5, -7.5, 7.5, -7.5), (7.5, -7.5, 7.5, 7.5), (-7.5, -7.5, -7.5, 7.5)]:
    fence(cx + a, cy + b, cx + c, cy + d)
# molino
cyl("molino", (cx - 6, cy + 6, 2.5), 1.0, 5, mat("crema", PAL["crema"]), verts=8, r2=0.7)
farmer(cx + 1, cy - 0.5)

# ---------------------------------------------- 3. escala (cuadrícula 1 m)
ESC_Y = -360
box("suelo", (0, ESC_Y, -0.05), (40, 14, 0.1), mat("prado", PAL["prado"]))
for k in range(-20, 21):
    box("g", (k, ESC_Y, 0.005), (0.03, 14, 0.01), mat("linea", PAL["linea"]))
for k in range(-7, 8):
    box("g", (0, ESC_Y + k, 0.005), (40, 0.03, 0.01), mat("linea", PAL["linea"]))
farmer(-16, ESC_Y)
cyl("tienda", (-12.5, ESC_Y, 0.9), 1.4, 1.8, mat("lona", PAL["lona"]), verts=4, r2=0.0)
house(-7, ESC_Y, 4, 3, 2.4, roof_m="madera_osc", wall="madera", chimney=False)   # cobertizo 4×3
house(1, ESC_Y, 7, 5, 3)                                                        # casa 7×5
box("granero", (11, ESC_Y, 2.5), (8, 6, 5), mat("granero", PAL["granero"]))       # granero 8×6
roof("tejado_g", (11, ESC_Y, 5), 8.6, 6.6, 3, mat("madera_osc", PAL["madera_osc"]))
cyl("silo", (17.5, ESC_Y, 3.5), 1.4, 7, mat("piedra", PAL["piedra"]), verts=10)

# ---------------------------------------------------------- luz y render
world = bpy.data.worlds.new("cielo")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (*hexc("#cfe6ef"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
sun = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN"))
sun.data.energy = 3.2
sun.data.color = hexc("#fff1d6")
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
link(sun)

for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        pass
try:
    scene.eevee.taa_render_samples = 32
except Exception:
    pass
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
for o in scene.objects:
    if o.type == "MESH":
        for p in o.data.polygons:
            p.use_smooth = False

def shot(name, target, dist, elev=35, azim=-45, ortho=None, lens=35):
    cam = bpy.data.objects.get("cam") or link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    scene.camera = cam
    e, a = math.radians(elev), math.radians(azim)
    t = Vector(target)
    cam.location = t + Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e))) * dist
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    if ortho:
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = ortho
    else:
        cam.data.type = "PERSP"
        cam.data.lens = lens
    cam.data.clip_end = 2000
    scene.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)

shot("valle.png", (0, -8, 0), 260, elev=48, azim=-60, ortho=150)
shot("progresion.png", (0, PROG_Y, 0), 200, elev=38, azim=-62, ortho=78)
shot("escala.png", (1, ESC_Y, 2), 200, elev=18, azim=-80, ortho=42)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "boceto.blend"))
print("BOCETO OK")
