# Modelos de los edificios

`generar_edificios.py` crea con Blender, por script, los 4 edificios (tienda, caja-envio, cobertizo, casa)
en sus 4 etapas de obra (cimientos, andamios, paredes, terminado) con los colores de `data/paleta.json`.

## Regenerar

Desde la raíz del repositorio (Blender 4.4 o superior; probado con 5.2):

```
blender -b --python assets-src/edificios/generar_edificios.py
```

En Windows: `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python assets-src/edificios/generar_edificios.py`.

Salida:

- `public/modelos/edificios/<tipo>_<etapa>.glb`: 16 archivos con compresión meshopt (`EXT_meshopt_compression`,
  requiere `MeshoptDecoder` al cargarlos; lo configura `src/world/edificios/carga.ts`).
- `assets-src/fichas/medidas.json` y `assets-src/fichas/<tipo>.md`: medidas, triángulos, peso y colores.

## Convenciones

- 1 unidad = 1 m. Modelo centrado en su huella, base en y=0, puerta al sur (+z).
- El ancho es el eje x y el fondo el eje z; las medidas en x y z de cada etapa no superan la huella.
- Si cambias una huella, cámbiala también en `EDIFICIOS` del script y en el test `carga-medidas.test.ts`.
