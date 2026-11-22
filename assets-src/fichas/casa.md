# Ficha: casa

- **Huella:** 7×5 casillas (1 casilla = 1 m); ancho en x (este), fondo en z (sur).
- **Altura total:** 5.0 m. Base en y=0, centrado en la huella, puerta al sur (+z).
- **Origen:** generado por `assets-src/edificios/generar_edificios.py` (Blender, modo fondo). Sin texturas: color plano de `data/paleta.json`.
- **Formato:** `.glb` con meshopt, en `public/modelos/edificios/casa_<etapa>.glb`.

| Etapa | Medidas (ancho×fondo×alto, m) | Triángulos | Peso (KB) | Colores |
|---|---|---|---|---|
| cimientos | 7.0×5.0×0.15 | 12 | 1.8 | piedra |
| andamios | 7.0×5.0×3.46 | 168 | 15.6 | madera, maderaOscura, paja, piedra |
| paredes | 7.0×5.0×3.15 | 84 | 8.1 | crema, piedra |
| terminado | 7.0×5.0×5.0 | 140 | 13.9 | agua, crema, maderaOscura, piedra, teja |

Etapas de obra: cimientos, andamios, paredes y terminado (el terminado es el edificio final).
