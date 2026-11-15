# M5 — Zonas y construcción

> **Rama:** `hito/M5-zonas-construccion` (desde `fase/1-mvp`) · **Milestone:** `M5 — Zonas y construcción`
> Fase: [Fase 1](README.md) · GDD §7.3, §7.4 · Referencia: `borrador/concept/05-edificios-niveles.png`, `borrador/blender/escala.png`

## Objetivo
Organizar la granja: pintar zonas y levantar los primeros edificios con un fantasma que indica si caben, y ver cómo la obra avanza día a día.

## Criterios de aceptación del hito
- [ ] Se pintan zonas y se colocan tienda, caja de envío, cobertizo y casa, con rotación y validación.
- [ ] Las obras avanzan al dormir y se ven por etapas hasta terminar.
- [ ] Se puede mover y demoler, con reembolso parcial.
- [ ] Las reglas de colocación tienen tests y el Rompedor no encuentra fallos S1.

## Paralelismo
`T01`, `T02` y `T07` en paralelo. `T03` necesita `T02`. `T04`, `T05` y `T06` necesitan `T03`. `T07` (arte) puede adelantarse desde M2 en una rama `arte/…`.

---

### M5-T01 · Pintar zonas
- **Objetivo:** marcar para qué sirve cada parte de la granja.
- **Depende de:** M4 · **Archivos:** `src/ui/plano/Zonas.tsx`, `src/world/plano/zonas.ts`, `src/core/zonas.ts` · **Crítico:** no

**Subtareas**
- M5-T01.1 Herramienta Zonas (Z) con selector: Cultivo, Huerto, Vivienda, Almacén y Borrar.
- M5-T01.2 Arrastrar pinta un rectángulo de casillas → `PintarZona` (gratis e instantáneo, regla de Raíces).
- M5-T01.3 Capa translucida de color por zona, solo en Modo Plano.

**Criterios de aceptación**
- [ ] Solo se pinta en parcelas propias; lo que cae fuera se ignora.
- [ ] Bajo un edificio la zona sigue siendo compatible (regla de Raíces).

**Tests unitarios**
- `rectangulo.test.ts`: "arrastre de A a B da todas las casillas del rectángulo", "funciona arrastrando en cualquier dirección".
- `zonas.test.ts` (núcleo): "fuera de parcela propia se ignora".

---

### M5-T02 · Catálogo de edificios 3D
- **Objetivo:** definir en datos los edificios del MVP con sus medidas reales.
- **Depende de:** M4 · **Archivos:** `data/edificios.json`, `src/core/catalogo.ts` · **Crítico:** no

**Subtareas**
- M5-T02.1 Tienda (3×3), caja de envío (2×1), cobertizo (4×3), casa (7×5) con coste, materiales, zona y días de obra (GDD §7.4).
- M5-T02.2 Niveles de mejora previstos (sin implementar la mejora aún).
- M5-T02.3 Catálogo en el panel lateral del Modo Plano (como en el visor), con costes y materiales que faltan.

**Criterios de aceptación**
- [ ] Las huellas coinciden con la tabla de escala del GDD.
- [ ] El panel marca en rojo el material que falta y cuánto.

**Tests unitarios**
- `catalogo.test.ts`: "los datos cumplen el esquema", "las huellas son las del GDD", "materialesQueFaltan con inventario parcial".

---

### M5-T03 · Fantasma, rotación y validación
- **Objetivo:** colocar un edificio con vista previa válida o inválida.
- **Depende de:** T02 · **Archivos:** `src/core/construccion.ts`, `src/world/plano/fantasma.ts` · **Crítico:** **sí** (reglas de construcción)

**Subtareas**
- M5-T03.1 Fantasma azul (válido) o rojo (inválido) que sigue al cursor encajado en la rejilla.
- M5-T03.2 R gira 90°: la huella intercambia ancho y fondo.
- M5-T03.3 Validación del núcleo: parcela propia, zona compatible, sin solapes con edificios, obstáculos ni río, dinero y materiales.
- M5-T03.4 Clic confirma → `Construir` (con rotación).

**Criterios de aceptación**
- [ ] El fantasma y el núcleo dan siempre el mismo veredicto.
- [ ] El motivo de rechazo se muestra ("Falta: 10 metal", "Zona no compatible").
- [ ] Ninguna casilla queda ocupada por dos cosas.

**Tests unitarios**
- `construccion.test.ts`: "girar intercambia la huella", "solape con edificio se rechaza", "solape con obstáculo se rechaza", "zona incompatible se rechaza", "sin materiales se rechaza y no cobra", "colocación válida cobra exactamente el coste".

---

### M5-T04 · Suelo bajo los edificios
- **Objetivo:** que los edificios asienten bien en el terreno.
- **Depende de:** T03 · **Archivos:** `src/world/terreno/aplanar.ts` · **Crítico:** no

**Subtareas**
- M5-T04.1 Base o zócalo que tapa la pequeña pendiente bajo el edificio.
- M5-T04.2 Altura del edificio = altura media de su huella.

**Criterios de aceptación**
- [ ] Ningún edificio flota ni se hunde de forma visible.

**Tests unitarios**
- `aplanar.test.ts`: "la altura de asiento es la media de la huella", "el zócalo cubre la diferencia máxima".

---

### M5-T05 · Obra visible por etapas
- **Objetivo:** ver la construcción avanzar (cimientos → andamios → paredes → tejado).
- **Depende de:** T03 · **Archivos:** `src/world/edificios/obra.ts` · **Crítico:** no

**Subtareas**
- M5-T05.1 `etapaObra(progreso)` devuelve la etapa según el avance del núcleo.
- M5-T05.2 Modelo por etapa (provisional por código hasta tener los de T07).
- M5-T05.3 Al terminar, el edificio aparece con una animación corta.

**Criterios de aceptación**
- [ ] La etapa visible corresponde al progreso de la obra en el núcleo.

**Tests unitarios**
- `obra.test.ts`: "0 % → cimientos", "100 % → terminado", "los umbrales de etapa son crecientes".

---

### M5-T06 · Mover y demoler
- **Objetivo:** corregir la distribución sin castigo grande.
- **Depende de:** T03 · **Archivos:** `src/ui/plano/Acciones.tsx`, `src/world/plano/` · **Crítico:** no (reglas ya probadas en Raíces)

**Subtareas**
- M5-T06.1 M (mover): coge el edificio como fantasma y lo recoloca gratis.
- M5-T06.2 X (demoler) con confirmación en el panel y reembolso parcial del núcleo.

**Criterios de aceptación**
- [ ] Al mover, el edificio no se puede soltar en un sitio inválido.
- [ ] El reembolso mostrado es el que aplica el núcleo.

**Tests unitarios**
- `mover-demoler.test.ts` (núcleo): ya existen en Raíces; añadir "mover con rotación".

---

### M5-T07 · Modelos de los edificios (arte)
- **Objetivo:** sustituir las formas por código por modelos `.glb` en estilo low-poly.
- **Depende de:** M0-T06 · **Archivos:** `assets-src/edificios/`, `public/modelos/`, `src/world/edificios/carga.ts` · **Crítico:** no · **Etiqueta:** `arte`

**Subtareas**
- M5-T07.1 Script de Blender que genera tienda, caja de envío, cobertizo y casa, y sus 4 etapas de obra, con la paleta.
- M5-T07.2 Exportar a `.glb` con meshopt.
- M5-T07.3 Cargador con caché; mientras carga, la forma por código.
- M5-T07.4 Ficha de cada modelo en `assets-src/fichas/`.

**Criterios de aceptación**
- [ ] Cada `.glb` pesa menos de 200 KB.
- [ ] Las medidas coinciden con la huella del catálogo.

**Tests unitarios**
- `carga.test.ts`: "pedir dos veces el mismo modelo carga una sola vez".
