# Prueba de estilo visual (M0)

La misma granja en cuatro estilos, con la misma cámara, para decidir el estilo del juego.
**Decisión: estilo 4** ([ADR 0003](../../docs/adr/0003-estilo-visual.md)).

| Tecla | Estilo |
|---|---|
| 1 | *Low-poly* plano (el del GDD 0.2) |
| 2 | Pintado a mano (texturas por código con la luz horneada) |
| 3 | PBR estilizado con texturas de Poly Haven |
| 4 | **PBR estilizado con texturas propias de ComfyUI** (elegido) |

Vistas: General, Casa, Campo, Estanque y Personaje (sigue al granjero, que pasea por el sendero).

## Cómo abrirla

```bash
python -m http.server 8765 --directory borrador/prueba-estilo
```

Después, abre `http://localhost:8765`. También está en `.claude/launch.json` como `prueba-estilo`.
Necesita conexión: three.js se carga del CDN de jsDelivr y las texturas del estilo 3 de Poly Haven.

## Contenido

- `index.html`: toda la escena (three.js 0.170).
- `texturas-comfy/`: las 11 texturas propias (`_diff`, `_nor_gl`, `_rough`), generadas con la receta de
  [`borrador/workflows/texturas/`](../workflows/texturas/).
- `modelos/granjero.glb`: el granjero, preparado con
  [`borrador/blender/preparar_granjero_grab3d.py`](../blender/preparar_granjero_grab3d.py).

## Licencias de terceros

- **Granjero:** «Farmer» de [Grab3D](https://grab3d.com/models/characters/farmer/), CC0 1.0.
- **Texturas del estilo 3 y piedra, roca y corteza del estilo 4:** [Poly Haven](https://polyhaven.com), CC0.
  Se cargan desde su CDN; no están en el repositorio.
- **three.js:** licencia MIT, cargado desde jsDelivr.

## Qué no es

Es material de diseño (`borrador/`): no se importa desde `src/`, y su código no sigue las reglas del
proyecto (colores y escalas escritos a mano, sin tests). El juego reimplementará lo necesario en
`src/world/` con datos en `data/` (ver M0-T04 y M0-T06).
