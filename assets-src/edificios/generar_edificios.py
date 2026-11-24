"""Genera los 4 edificios de Raíces 3D y sus 4 etapas de obra, y los exporta a .glb con meshopt.

Uso (modo fondo):
    blender -b --python assets-src/edificios/generar_edificios.py

Convenciones: 1 unidad = 1 m. El modelo va centrado en su huella, con la base en y=0 (arriba en
glTF) y la puerta mirando al sur (+z de glTF). En Blender eso es: ancho en X, fondo en Y y puerta
hacia -Y (el exportador pasa Y de Blender a -Z de glTF). Los colores salen de data/paleta.json.
También escribe assets-src/fichas/medidas.json y una ficha .md por edificio.
"""
import json
import os

import bpy
from mathutils import Vector

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SALIDA = os.path.join(RAIZ, "public", "modelos", "edificios")
FICHAS = os.path.join(RAIZ, "assets-src", "fichas")
PALETA = json.load(open(os.path.join(RAIZ, "data", "paleta.json"), encoding="utf-8"))

ETAPAS = ["cimientos", "andamios", "paredes", "terminado"]

# ancho (x), fondo (z), altura de pared y altura total en metros; forma del tejado.
EDIFICIOS = {
    "tienda": dict(ancho=3, fondo=3, pared=0.0, alto=1.8, forma="piramide", pared_color="crema", tejado_color="paja"),
    "caja-envio": dict(ancho=2, fondo=1, pared=0.8, alto=1.0, forma="tapa", pared_color="madera", tejado_color="maderaOscura"),
    "cobertizo": dict(ancho=4, fondo=3, pared=2.4, alto=3.5, forma="dos-aguas", pared_color="madera", tejado_color="maderaOscura"),
    "casa": dict(ancho=7, fondo=5, pared=3.0, alto=5.0, forma="dos-aguas", pared_color="crema", tejado_color="teja"),
}

_materiales = {}
colores_usados = set()


def hex_a_lineal(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c] + [1.0]


def material(nombre):
    colores_usados.add(nombre)
    if nombre not in _materiales:
        m = bpy.data.materials.new(nombre)
        m.use_nodes = True
        b = m.node_tree.nodes.get("Principled BSDF") or m.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        salida = m.node_tree.nodes.get("Material Output") or m.node_tree.nodes.new("ShaderNodeOutputMaterial")
        m.node_tree.links.new(b.outputs["BSDF"], salida.inputs["Surface"])
        b.inputs["Base Color"].default_value = hex_a_lineal(PALETA[nombre])
        b.inputs["Roughness"].default_value = 0.85
        _materiales[nombre] = m
    return _materiales[nombre]


def pieza(nombre, verts, caras, color):
    """Crea un objeto a partir de vértices y caras (triángulos o cuadriláteros)."""
    malla = bpy.data.meshes.new(nombre)
    malla.from_pydata(verts, [], caras)
    malla.update()
    malla.materials.append(material(color))
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    return obj


def caja(nombre, x0, x1, y0, y1, z0, z1, color):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return pieza(nombre, v, f, color)


def prisma_dos_aguas(nombre, hw, hd, z0, z1, color):
    """Tejado a dos aguas con cumbrera a lo largo de X; ocupa exactamente la huella."""
    v = [(-hw, -hd, z0), (hw, -hd, z0), (hw, hd, z0), (-hw, hd, z0),
         (-hw, 0, z1), (hw, 0, z1)]
    f = [(0, 3, 2, 1), (0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5)]
    return pieza(nombre, v, f, color)


def piramide(nombre, hw, hd, z0, z1, color, r=0.0):
    """Pirámide, o tronco de pirámide si r>0 (fracción de la base que queda arriba)."""
    if r > 0:
        a, b = hw * r, hd * r
        v = [(-hw, -hd, z0), (hw, -hd, z0), (hw, hd, z0), (-hw, hd, z0),
             (-a, -b, z1), (a, -b, z1), (a, b, z1), (-a, b, z1)]
        f = [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)]
    else:
        v = [(-hw, -hd, z0), (hw, -hd, z0), (hw, hd, z0), (-hw, hd, z0), (0, 0, z1)]
        f = [(0, 3, 2, 1), (0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)]
    return pieza(nombre, v, f, color)


def construir(tipo, d, etapa):
    hw, hd = d["ancho"] / 2, d["fondo"] / 2
    h_cim = 0.15
    e = 0.12  # grosor de pared
    pared, alto = d["pared"], d["alto"]
    # Cimientos: losa de piedra que ocupa la huella.
    caja("cimientos", -hw, hw, -hd, hd, 0, h_cim, "piedra")
    if etapa == "cimientos":
        return
    if etapa == "andamios":
        # Postes en las esquinas, travesaños y una plataforma, todo dentro de la huella.
        p = 0.08
        h_and = (pared if pared > 0 else alto * 0.7) + 0.4
        for i, (sx, sy) in enumerate([(-1, -1), (1, -1), (1, 1), (-1, 1)]):
            cx, cy = sx * (hw - p - 0.02), sy * (hd - p - 0.02)
            caja(f"poste{i}", cx - p, cx + p, cy - p, cy + p, h_cim, h_and, "maderaOscura")
        for k, z in enumerate([h_and * 0.5, h_and]):
            caja(f"travesano_s{k}", -hw + 0.1, hw - 0.1, -hd + 0.06, -hd + 0.14, z, z + 0.06, "madera")
            caja(f"travesano_n{k}", -hw + 0.1, hw - 0.1, hd - 0.14, hd - 0.06, z, z + 0.06, "madera")
            caja(f"travesano_o{k}", -hw + 0.06, -hw + 0.14, -hd + 0.1, hd - 0.1, z, z + 0.06, "madera")
            caja(f"travesano_e{k}", hw - 0.14, hw - 0.06, -hd + 0.1, hd - 0.1, z, z + 0.06, "madera")
        zp = h_and * 0.5 + 0.06
        caja("plataforma", -hw * 0.5, hw * 0.5, -hd * 0.3, hd * 0.3, zp, zp + 0.06, "paja")
        return
    forma = d["forma"]
    if forma == "piramide":
        # Tienda: en «paredes» solo media lona; entera al terminar, con mástil.
        if etapa == "paredes":
            piramide("lona_baja", hw, hd, h_cim, h_cim + alto * 0.4, d["pared_color"], r=0.6)
            return
        piramide("lona", hw, hd, h_cim, alto, d["pared_color"])
        caja("mastil", -0.04, 0.04, -0.04, 0.04, alto - 0.3, alto, "maderaOscura")
        return
    # Paredes con hueco de puerta en el sur (-Y de Blender).
    z0, z1 = h_cim, h_cim + pared
    col = d["pared_color"]
    caja("pared_norte", -hw, hw, hd - e, hd, z0, z1, col)
    caja("pared_oeste", -hw, -hw + e, -hd + e, hd - e, z0, z1, col)
    caja("pared_este", hw - e, hw, -hd + e, hd - e, z0, z1, col)
    if d["ancho"] >= 4:
        sd = 0.55 if d["ancho"] < 6 else 0.6  # semiancho de la puerta
        alto_p = min(2.0, pared - 0.2)
        caja("pared_sur_o", -hw + e, -sd, -hd, -hd + e, z0, z1, col)
        caja("pared_sur_e", sd, hw - e, -hd, -hd + e, z0, z1, col)
        caja("dintel", -sd, sd, -hd, -hd + e, z0 + alto_p, z1, col)
        if etapa == "terminado":
            caja("puerta", -sd, sd, -hd + 0.02, -hd + 0.08, z0, z0 + alto_p, "maderaOscura")
    else:
        caja("pared_sur", -hw + e, hw - e, -hd, -hd + e, z0, z1, col)
    if etapa == "paredes":
        return
    if forma == "tapa":
        caja("tapa", -hw, hw, -hd, hd, z1, alto, d["tejado_color"])
        return
    prisma_dos_aguas("tejado", hw, hd, z1, alto, d["tejado_color"])
    if tipo == "casa":
        caja("chimenea", hw - 1.2, hw - 0.8, 0.5, 0.9, z1 + 0.6, alto, "piedra")
        for i, vx in enumerate([-hw * 0.55, hw * 0.55]):
            caja(f"ventana{i}", vx - 0.4, vx + 0.4, -hd, -hd + 0.06, z0 + 1.0, z0 + 1.9, "agua")


def limpiar():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)


def medidas_y_triangulos(objs):
    mn = [1e9] * 3
    mx = [-1e9] * 3
    tris = 0
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                mn[i] = min(mn[i], w[i])
                mx[i] = max(mx[i], w[i])
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    # glTF: ancho=x, alto=z de Blender, fondo=y de Blender.
    return dict(ancho=round(mx[0] - mn[0], 3), fondo=round(mx[1] - mn[1], 3), alto=round(mx[2] - mn[2], 3),
                centroX=round((mx[0] + mn[0]) / 2, 3), centroZ=round((mx[1] + mn[1]) / 2, 3),
                base=round(mn[2], 3)), tris


def exportar(ruta):
    args = dict(filepath=ruta, export_format="GLB", export_yup=True, export_apply=True,
                export_materials="EXPORT", export_cameras=False, export_lights=False)
    try:
        bpy.ops.export_scene.gltf(export_meshopt_compression_enable=True, **args)
        return True
    except TypeError:
        bpy.ops.export_scene.gltf(**args)
        return False


def main():
    os.makedirs(SALIDA, exist_ok=True)
    os.makedirs(FICHAS, exist_ok=True)
    medidas = {}
    meshopt = True
    for tipo, d in EDIFICIOS.items():
        medidas[tipo] = {}
        for etapa in ETAPAS:
            limpiar()
            colores_usados.clear()
            construir(tipo, d, etapa)
            objs = list(bpy.context.collection.objects)
            m, tris = medidas_y_triangulos(objs)
            ruta = os.path.join(SALIDA, f"{tipo}_{etapa}.glb")
            meshopt = exportar(ruta) and meshopt
            m.update(triangulos=tris, bytes=os.path.getsize(ruta), colores=sorted(colores_usados))
            medidas[tipo][etapa] = m
            print(f"OK {tipo}_{etapa}: {m}")
    with open(os.path.join(FICHAS, "medidas.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"meshopt": meshopt, "edificios": medidas}, f, indent=2, ensure_ascii=False)
        f.write("\n")
    for tipo, d in EDIFICIOS.items():
        lineas = [f"# Ficha: {tipo}", "",
                  f"- **Huella:** {d['ancho']}×{d['fondo']} casillas (1 casilla = 1 m); ancho en x (este), fondo en z (sur).",
                  f"- **Altura total:** {d['alto']} m. Base en y=0, centrado en la huella, puerta al sur (+z).",
                  "- **Origen:** generado por `assets-src/edificios/generar_edificios.py` (Blender, modo fondo). Sin texturas: color plano de `data/paleta.json`.",
                  f"- **Formato:** `.glb` {'con meshopt' if meshopt else 'sin compresión'}, en `public/modelos/edificios/{tipo}_<etapa>.glb`.",
                  "", "| Etapa | Medidas (ancho×fondo×alto, m) | Triángulos | Peso (KB) | Colores |", "|---|---|---|---|---|"]
        for etapa in ETAPAS:
            m = medidas[tipo][etapa]
            lineas.append(f"| {etapa} | {m['ancho']}×{m['fondo']}×{m['alto']} | {m['triangulos']} | {m['bytes'] / 1024:.1f} | {', '.join(m['colores'])} |")
        lineas += ["", "Etapas de obra: cimientos, andamios, paredes y terminado (el terminado es el edificio final).", ""]
        with open(os.path.join(FICHAS, f"{tipo}.md"), "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lineas))


main()
