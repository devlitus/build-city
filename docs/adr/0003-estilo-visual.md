# ADR 0003 — Estilo visual: PBR estilizado con texturas propias

- **Estado:** aceptado
- **Fecha:** 2026-11-15
- **Sustituye a:** la propuesta inicial del GDD 0.2 («*low-poly* estilizado, sombreado plano, una sola textura de paleta»)
- **Prueba:** [`borrador/prueba-estilo/`](../../borrador/prueba-estilo/) (estilos 1–4 con la misma escena y cámara)

## Contexto

El GDD proponía un *low-poly* de sombreado plano con todos los modelos compartiendo un atlas de colores de
256×1 px. Al verlo en la prueba de estilo de M0 se veía demasiado simple y sin detalle. El objetivo pasó a
ser **más realismo aunque cueste algo de rendimiento**, sin perder la calidez de la paleta ni el tono *cozy*.

Se compararon cuatro estilos con la misma granja (casa, granero, campo de trigo, huerto, estanque, valla,
árboles, rocas y personaje), la misma cámara y la misma hora:

| # | Estilo | Resultado |
|---|---|---|
| 1 | *Low-poly* plano (el del GDD) | Barato, pero plano y sin detalle |
| 2 | Pintado a mano (luz horneada en la textura) | Más rico, pero pide pintar cada textura a mano |
| 3 | PBR estilizado con texturas CC0 de Poly Haven | Mucho más creíble; texturas ajenas a la paleta |
| 4 | **PBR estilizado con texturas propias (ComfyUI)** | **Elegido** |

## Decisión

**PBR estilizado** (materiales físicos de three.js: color, normales y rugosidad) con estas reglas:

1. **Texturas propias generadas con ComfyUI** (Qwen-Image 2512) siguiendo una **receta común**
   (`borrador/workflows/texturas/recetas.json`): mismo prompt base, la paleta del juego y una semilla
   fija por textura. Así todas parecen del mismo juego.
2. **Poly Haven (CC0) solo donde el relieve escaneado se nota**: piedra, roca y corteza, con un tinte
   cálido hacia la paleta.
3. **La paleta deja de ser un atlas de colores** y pasa a usarse como **tinte de materiales y gradación de
   color** (niebla, cielo, luz). Sigue viviendo en `data/`.
4. **Iluminación:** cielo físico (`Sky`) que también ilumina la escena (PMREM), sol con sombras suaves,
   mapeo de tonos ACES, niebla de altura suave y oclusión ambiental (GTAO) como opción de calidad.
5. **Vegetación con volumen:** hierba densa instanciada con viento, copas de árbol con tarjetas de hojas
   y viento, cultivos en tarjetas.
6. **Geometría con bordes biselados** (nada de aristas de caja perfectas).
7. **Personaje:** modelo «Farmer» de Grab3D (CC0), preparado para la web en Blender (ver ADR 0005).

## Alternativas descartadas

- ***Low-poly* plano:** demasiado simple; era el motivo del cambio.
- **Pintado a mano:** buen aspecto, pero producir y mantener texturas pintadas es lento y pide oficio.
- **Solo Poly Haven:** el mejor relieve, pero texturas genéricas que no siguen la paleta ni dan identidad.
- **Fotorrealista:** no es viable en el navegador con un mundo lleno de objetos y un equipo pequeño.
- **Personaje propio por script en Blender:** salía con aspecto de muñeco de trapo.
- **Personaje con Hunyuan3D desde el concepto:** la forma era buena, pero la textura proyectada dejaba
  manchas y zonas sin pintar; no llegaba al nivel del resto.
- **Generadores 3D de pago (Tripo, Meshy):** descartados por coste.

## Consecuencias

- **Rendimiento:** más caro que el *low-poly*. En la prueba, el estilo 4 mueve unos 2 millones de
  triángulos y unas 500 llamadas de dibujo (mucha hierba y hojas). Hay que medirlo en un PC medio con la
  ventana visible y ajustar: densidad de hierba, oclusión ambiental y resolución de sombras pasan a ser
  **opciones de calidad** (M8).
- **Memoria y descarga:** 11 texturas de 1K en JPG pesan unos 10 MB. Para el juego se comprimen a **KTX2**
  (Basis) y se empaquetan rugosidad y oclusión en una sola imagen (ADR 0005).
- **Materiales:** ya no hay un material único compartido; se agrupan por material y se usa
  `InstancedMesh` para todo lo que se repite.
- **M0-T04 y M0-T06 cambian:** la escena de muestra usa cielo físico, mapeo de tonos y materiales PBR; la
  paleta da tintes en lugar de un material plano.
- **Personalización del personaje** (GDD §7.8): con un modelo cerrado es más difícil; queda pendiente.
- **Límite conocido:** las normales y la rugosidad de las texturas de ComfyUI se deducen del color; en
  tejas y piedra de cerca se pierde algo de volumen.
