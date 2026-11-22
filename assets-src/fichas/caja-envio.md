# Ficha: caja-envio

- **Huella:** 2×1 casillas (1 casilla = 1 m); ancho en x (este), fondo en z (sur).
- **Altura total:** 1.0 m. Base en y=0, centrado en la huella, puerta al sur (+z).
- **Origen:** generado por `assets-src/edificios/generar_edificios.py` (Blender, modo fondo). Sin texturas: color plano de `data/paleta.json`.
- **Formato:** `.glb` con meshopt, en `public/modelos/edificios/caja-envio_<etapa>.glb`.

| Etapa | Medidas (ancho×fondo×alto, m) | Triángulos | Peso (KB) | Colores |
|---|---|---|---|---|
| cimientos | 2.0×1.0×0.15 | 12 | 1.8 | piedra |
| andamios | 2.0×1.0×1.26 | 168 | 15.8 | madera, maderaOscura, paja, piedra |
| paredes | 2.0×1.0×0.95 | 60 | 6.1 | madera, piedra |
| terminado | 2.0×1.0×1.0 | 72 | 7.3 | madera, maderaOscura, piedra |

Etapas de obra: cimientos, andamios, paredes y terminado (el terminado es el edificio final).
