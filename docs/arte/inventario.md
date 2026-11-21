# Inventario de arte para el render del juego

> Estilo: [ADR 0003](../adr/0003-estilo-visual.md) · Cómo se produce: [ADR 0005](../adr/0005-pipeline-arte.md)
> · Prueba con todo lo hecho hasta ahora: [`borrador/prueba-estilo/`](../../borrador/prueba-estilo/)
> (estilo **4 · PBR + ComfyUI**).

Qué imágenes (texturas) y modelos necesita el juego, cuáles existen ya y en qué hito hacen falta.
Cada fila **hecha** tiene su ficha: la receta de ComfyUI, el identificador de Poly Haven o el script de Blender.

**Leyenda de origen:** **ComfyUI** = receta en `borrador/workflows/texturas/recetas.json` ·
**PH** = Poly Haven (CC0) · **G3D** = Grab3D (CC0) · **código** = generado en el navegador ·
**Blender** = modelo por script o a mano.

**Formato de cada textura de material:** `_diff` (color, sRGB) + `_nor_gl` (normales OpenGL) + `_rough`
(rugosidad); 1024 px salvo que se diga otra cosa. En el juego se convierten a KTX2.

---

## 1. Texturas de material

### Hechas (en `borrador/prueba-estilo/texturas-comfy/` o descargadas de Poly Haven)

| Nombre | Uso | Origen | Metros por repetición |
|---|---|---|---|
| `hierba` | Suelo de prado | ComfyUI (semilla 304) | 2,5 |
| `camino` | Caminos de tierra y grava (M6) | ComfyUI (415) | 2,5 |
| `surcos` | Tierra arada del campo y del huerto (M7) | ComfyUI (516) | 2,5 |
| `madera` | Paredes de tablas de la casa | ComfyUI (101) | 1,6 |
| `maderaOsc` | Porche, puertas, vigas, barriles | ComfyUI (607) | 2 |
| `tejas` | Tejado de teja árabe de la casa | ComfyUI (202) | 4 |
| `tejasGris` | Tejado de tejuelas del granero o cobertizo | ComfyUI (708) | 3 |
| `rojo` | Tablas pintadas de rojo del granero | ComfyUI (809) | 2,2 |
| `blanco` | Marcos, remates y ventanas pintadas de crema | ComfyUI (921) | 1,2 |
| `postigo` | Postigos y puertas pintadas de salvia | ComfyUI (1011) | 1,5 |
| `valla` | Postes y travesaños de valla (M6) | ComfyUI (1112) | 1,8 |
| `piedra` | Zócalos, chimeneas, muros | PH `rustic_stone_wall`, tinte `#efe0c6` | 1,5 |
| `roca` | Rocas del valle (M1, M3) | PH `mossy_rock`, tinte `#e2dccb` | 3 |
| `corteza` | Troncos de árbol y leña | PH `bark_brown_02`, tinte `#f2e6d6` | 1 |

### Pendientes, por hito

| Hito | Nombre | Uso | Origen previsto |
|---|---|---|---|
| M1 | `tierra_bosque` | Suelo de las parcelas de bosque (hojarasca) | ComfyUI |
| M1 | `rocoso` | Suelo de las parcelas rocosas (grava y lajas) | ComfyUI |
| M1 | `orilla` | Arena y barro de la orilla del río | ComfyUI |
| M1 | `montana` | Ladera de las montañas del límite (roca con hierba) | ComfyUI o PH |
| M1 | `agua_normal` | Ondas del río y el estanque (solo normales) | código (ya existe en la prueba) |
| M4 | `madera_pintada_cartel` | Cartel «Se vende» y mojones | ComfyUI |
| M5 | `lona` | Tienda de campaña y cobertizo de lona | ComfyUI |
| M5 | `madera_obra` | Andamios y madera sin tratar de las obras | ComfyUI |
| M5 | `cimiento` | Hormigón o piedra de los cimientos | ComfyUI o PH |
| M7 | `surcos_mojados` | Tierra regada, más oscura | variante de `surcos` (tinte) |
| M9 | `nieve` | Nieve en suelo y tejados | ComfyUI |
| M9 | `hojarasca_otono` | Suelo en otoño | ComfyUI |
| M10 | `adoquin`, `revoco`, `ladrillo` | Pueblo | ComfyUI |
| M11 | `ladrillo`, `metal_oxidado`, `heno` | Procesado y almacén | ComfyUI |

## 2. Texturas con transparencia (tarjetas)

| Nombre | Uso | Estado | Origen |
|---|---|---|---|
| `hojas` | Copas de árboles de hoja ancha | hecha (provisional) | código (la prueba la dibuja en un *canvas*) → pasar a ComfyUI |
| `trigo` | Espigas del campo | hecha (provisional) | código → ComfyUI |
| `agujas_pino` | Pinos de las colinas | pendiente (M1) | ComfyUI |
| `flores_prado` | Flores sueltas en la hierba | pendiente (M1) | ComfyUI |
| Cultivos de primavera | Patata, zanahoria, lechuga, rábano y fresa: brote, crecimiento y maduro (M7) | pendiente | ComfyUI (hojas) + Blender (frutos) |

## 3. Modelos

| Hito | Modelo | Estado | Origen |
|---|---|---|---|
| M2 | **Granjero** con Reposo, Andar y Correr | **hecho**: `public/modelos/granjero.glb` (45 000 triángulos, 3,4 MB; copia de `borrador/prueba-estilo/modelos/granjero.glb`) | G3D «Farmer» + `borrador/blender/preparar_granjero_grab3d.py` |
| M3 | Animaciones golpear (hacha, pico) | pendiente | Biblioteca gratuita compatible + Blender |
| M3 | Hacha, pico | pendiente | Blender |
| M1/M3 | Árboles (hoja ancha y pino), tocón, rocas y trozos de roca | provisional en la prueba (por código) | Blender + texturas de la tabla |
| M4 | Mojón, cartel «Se vende» | pendiente | Blender |
| M5 | Tienda de campaña, caja de envío, cobertizo, casa y sus 4 etapas de obra | pendiente (la casa y el granero de la prueba sirven de referencia) | Blender |
| M6 | Poste, travesaño y puerta de valla | provisional en la prueba | Blender |
| M7 | Azada, regadera, hoz; animaciones arar, regar, cosechar | pendiente | Blender + biblioteca |
| M7 | Cultivos (3 fases × 5) | pendiente | Blender |
| M8 | Cama o saco para dormir | pendiente | Blender |

## 4. Imágenes de interfaz

| Hito | Imágenes | Origen |
|---|---|---|
| M3 | Iconos de herramientas (hacha, pico; luego azada, regadera, hoz, semillas) | ComfyUI → PNG/WebP |
| M3 | Iconos de recursos (madera, piedra) | ComfyUI |
| M5 | Miniaturas del catálogo de edificios | render de los `.glb` en Blender |
| M7 | Iconos de semillas y cosechas | ComfyUI |
| M8 | Pantalla de título | ComfyUI (a partir del arte conceptual) |

## 5. Cielo e iluminación

No necesitan imágenes: el cielo es físico (`Sky` de three.js) y también genera la luz ambiental.
Si más adelante se quiere un cielo pintado o nubes, se añadiría aquí.
