# Ficha: tienda

- **Huella:** 3×3 casillas (1 casilla = 1 m); ancho en x (este), fondo en z (sur).
- **Altura total:** 1.8 m. Base en y=0, centrado en la huella, puerta al sur (+z).
- **Origen:** generado por `assets-src/edificios/generar_edificios.py` (Blender, modo fondo). Sin texturas: color plano de `data/paleta.json`.
- **Formato:** `.glb` con meshopt, en `public/modelos/edificios/tienda_<etapa>.glb`.

| Etapa | Medidas (ancho×fondo×alto, m) | Triángulos | Peso (KB) | Colores |
|---|---|---|---|---|
| cimientos | 3.0×3.0×0.15 | 12 | 1.8 | piedra |
| andamios | 3.0×3.0×1.72 | 168 | 15.6 | madera, maderaOscura, paja, piedra |
| paredes | 3.0×3.0×0.87 | 24 | 3.4 | crema, piedra |
| terminado | 3.0×3.0×1.8 | 30 | 4.5 | crema, maderaOscura, piedra |

Etapas de obra: cimientos, andamios, paredes y terminado (el terminado es el edificio final).
