# Ficha: cobertizo

- **Huella:** 4×3 casillas (1 casilla = 1 m); ancho en x (este), fondo en z (sur).
- **Altura total:** 3.5 m. Base en y=0, centrado en la huella, puerta al sur (+z).
- **Origen:** generado por `assets-src/edificios/generar_edificios.py` (Blender, modo fondo). Sin texturas: color plano de `data/paleta.json`.
- **Formato:** `.glb` con meshopt, en `public/modelos/edificios/cobertizo_<etapa>.glb`.

| Etapa | Medidas (ancho×fondo×alto, m) | Triángulos | Peso (KB) | Colores |
|---|---|---|---|---|
| cimientos | 4.0×3.0×0.15 | 12 | 1.8 | piedra |
| andamios | 4.0×3.0×2.86 | 168 | 15.7 | madera, maderaOscura, paja, piedra |
| paredes | 4.0×3.0×2.55 | 84 | 8.1 | madera, piedra |
| terminado | 4.0×3.0×3.5 | 104 | 10.6 | madera, maderaOscura, piedra |

Etapas de obra: cimientos, andamios, paredes y terminado (el terminado es el edificio final).
