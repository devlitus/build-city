# M1 — El valle 3D

> **Rama:** `hito/M1-valle` (desde `fase/1-mvp`) · **Milestone:** `M1 — El valle 3D`
> Fase: [Fase 1](README.md) · GDD §4 · Referencia visual: `borrador/blender/valle.png`, `borrador/visor/`

## Objetivo
Ver y recorrer el valle completo: terreno con relieve, parcelas, río, árboles, rocas, montañas y el pueblo como bloques, todo a 60 fps.

## Criterios de aceptación del hito
- [ ] El valle de 8×8 parcelas de 20×20 m se genera desde el núcleo con una semilla y se dibuja completo.
- [ ] Con la misma semilla, el valle es idéntico en dos cargas.
- [ ] Se recorre entero con la cámara libre a 60 fps con todos los árboles y rocas visibles.
- [ ] La distribución se parece al boceto `borrador/blender/valle.png` (prado, bosque, rocoso, río, pueblo al sur).
- [ ] La escena sigue el estilo del ADR 0003 (M1-T09): cielo físico, mapeo de tonos y terreno con textura.

## Paralelismo
`T01` y `T02` primero (en paralelo). Luego `T03`, `T04` y `T05` en paralelo. `T06`, `T07` y `T08` en paralelo en cualquier momento tras `T02`. `T09` al final, tras `T03`, `T05` y `T06`.

---

### M1-T01 · Datos del valle a escala 3D
- **Objetivo:** pasar el valle del núcleo de 6×6 parcelas de 16 casillas a 8×8 parcelas de 20 casillas de 1 m.
- **Depende de:** M0 · **Archivos:** `data/valle.json`, `src/core/valle.ts`, `src/core/parcelas.ts` y sus tests · **Crítico:** **sí** (parcelas)

**Subtareas**
- M1-T01.1 `valle.json`: `parcelasPorLado: 8`, `casillasPorParcela: 20`; revisar anchos del río, vados y densidades de árboles y rocas para la nueva escala.
- M1-T01.2 Ajustar los tests del núcleo que dependan del tamaño (sin cambiar las reglas).
- M1-T01.3 Revisar la fórmula de precios de parcela para 64 parcelas (subida progresiva) y dejar los valores en datos.

**Criterios de aceptación**
- [ ] El núcleo genera 64 parcelas de 20×20 casillas.
- [ ] El río es continuo de un borde a otro del valle y tiene entre 1 y 2 vados.
- [ ] Las reglas de compra (adyacencia, precio) siguen pasando sus tests.

**Tests unitarios**
- `valle.test.ts`: "genera 64 parcelas de 20×20", "misma semilla → mismo valle", "el río conecta dos bordes opuestos", "hay al menos una parcela de cada tipo".
- `parcelas.test.ts`: "el precio sube con cada compra según `valle.json`".

---

### M1-T02 · Altura del terreno
- **Objetivo:** una función pura que da la altura de cualquier punto del mundo, base del terreno, la vegetación y el personaje.
- **Depende de:** M0 · **Archivos:** `src/world/terreno/altura.ts`, `data/terreno.json` · **Crítico:** no

**Subtareas**
- M1-T02.1 `alturaTerreno(x, z, valle)`: valle central casi llano, colinas en el anillo exterior, cauce del río por debajo del nivel del agua.
- M1-T02.2 Ruido determinista con la semilla del valle (sin `Math.random`).
- M1-T02.3 Parámetros (radio llano, altura de colinas, profundidad del cauce) en `data/terreno.json`.

**Criterios de aceptación**
- [ ] Dentro de las parcelas, la diferencia de altura entre dos puntos a 1 m no supera 0,15 m (se puede construir).
- [ ] Todos los puntos del río quedan por debajo del nivel del agua.
- [ ] La función no depende de three.js.

**Tests unitarios**
- `altura.test.ts`: "las parcelas son casi llanas (pendiente máxima)", "el cauce está por debajo del agua", "es continua (sin saltos entre puntos vecinos)", "misma semilla → mismas alturas", "las colinas superan una altura mínima en el borde".

---

### M1-T03 · Malla del terreno por trozos
- **Objetivo:** dibujar el terreno con sombreado plano en trozos de 20×20 m para poder ocultar lo que no se ve.
- **Depende de:** T02 · **Archivos:** `src/world/terreno/malla.ts`, `src/world/terreno/trozos.ts` · **Crítico:** no

**Subtareas**
- M1-T03.1 Un trozo por parcela (y trozos extra para las colinas), con caras planas y color por vértice.
- M1-T03.2 Color de cada cara según tipo de parcela y altura (prado, bosque, roca, nieve, arena del río), con una pequeña variación por cara.
- M1-T03.3 Funciones de conversión entre metros, casillas y trozos.

**Criterios de aceptación**
- [ ] No se ven costuras ni huecos entre trozos.
- [ ] Cada tipo de parcela se distingue por su color, como en el visor.

**Tests unitarios**
- `trozos.test.ts`: "metros → casilla → metros es coherente", "un punto del borde pertenece a un solo trozo", "trozosVisibles devuelve solo los del rango pedido".
- `colores.test.ts`: "el color de cara depende del tipo y la altura", "la variación queda dentro del margen".

---

### M1-T04 · Río
- **Objetivo:** agua visible en el cauce generado por el núcleo.
- **Depende de:** T02 · **Archivos:** `src/world/agua.ts` · **Crítico:** no

**Subtareas**
- M1-T04.1 Plano de agua al nivel definido en `data/terreno.json`, semitransparente y con brillo suave.
- M1-T04.2 Movimiento leve (ondulación en el *shader* o desplazamiento de color).

**Criterios de aceptación**
- [ ] El agua solo se ve en el cauce del río (no aparece en las parcelas).
- [ ] El movimiento del agua no baja los fps.

**Tests unitarios:** sin tests (solo dibujo).

---

### M1-T05 · Árboles, rocas y hierba instanciados
- **Objetivo:** dibujar los obstáculos del núcleo y la vegetación decorativa con `InstancedMesh`, sin coste de rendimiento.
- **Depende de:** T01, T02 · **Archivos:** `src/world/vegetacion.ts`, `src/world/dispersion.ts` · **Crítico:** no

**Subtareas**
- M1-T05.1 Árboles (pino y redondo) y rocas en la posición exacta de cada obstáculo del núcleo, con escala, giro y tono variables por semilla.
- M1-T05.2 Bosque denso en las colinas (decorativo, fuera de las parcelas).
- M1-T05.3 Matas de hierba decorativas que se mecen con el viento (*shader*).
- M1-T05.4 Ocultación por trozos (no dibujar trozos lejanos de hierba).

**Criterios de aceptación**
- [ ] Cada árbol y roca del núcleo tiene su modelo en la casilla correcta.
- [ ] No hay vegetación decorativa dentro del río ni encima de obstáculos.
- [ ] 60 fps con todo el valle a la vista.

**Tests unitarios**
- `dispersion.test.ts`: "misma semilla → mismas posiciones", "no coloca nada en el río", "respeta la densidad de `valle.json`", "la posición en metros de un obstáculo es el centro de su casilla".

---

### M1-T06 · Montañas, cielo y niebla
- **Objetivo:** cerrar el horizonte del valle.
- **Depende de:** T02 · **Archivos:** `src/world/horizonte.ts` · **Crítico:** no

**Subtareas**
- M1-T06.1 Anillo de montañas low-poly con nieve en las cimas.
- M1-T06.2 Niebla de distancia con el color del cielo.
- M1-T06.3 Nubes sencillas que se desplazan.

**Criterios de aceptación**
- [ ] Desde cualquier punto del valle no se ve el borde del mundo.

**Tests unitarios:** sin tests (solo dibujo).

---

### M1-T07 · Pueblo (bloques provisionales)
- **Objetivo:** situar el pueblo al sur para dar referencia de escala y distancia.
- **Depende de:** T02 · **Archivos:** `src/world/pueblo.ts`, `data/pueblo.json` · **Crítico:** no

**Subtareas**
- M1-T07.1 Posiciones de casas, campanario y plaza en `data/pueblo.json`.
- M1-T07.2 Casas simples (caja y tejado) y campanario.
- M1-T07.3 Camino de tierra del valle al pueblo.

**Criterios de aceptación**
- [ ] El pueblo está a menos de 1 minuto andando (≈ 80 m) del centro del valle.

**Tests unitarios**
- `pueblo.test.ts`: "los datos del pueblo cumplen el esquema", "ningún edificio del pueblo cae dentro de una parcela".

---

### M1-T08 · Cámara libre de depuración
- **Objetivo:** recorrer el valle mientras no exista el personaje.
- **Depende de:** M0 · **Archivos:** `src/world/camaras/depuracion.ts` · **Crítico:** no

**Subtareas**
- M1-T08.1 Cámara orbital/vuelo con ratón y teclado, solo en desarrollo.
- M1-T08.2 Tecla para activarla y desactivarla.

**Criterios de aceptación**
- [ ] No existe en la build de producción.

**Tests unitarios:** sin tests.

---

### M1-T09 · Escena y terreno al estilo PBR (ADR 0003)
- **Objetivo:** pasar al estilo visual aprobado (PBR estilizado con texturas propias) lo que M0 y M1 hicieron en *low-poly* plano: cielo que ilumina, mapeo de tonos, catálogo de materiales en datos y terreno con textura. Incluye las subtareas revisadas de M0-T04 y M0-T06 que quedaron sin implementar.
- **Depende de:** T03, T05, T06 · **Archivos:** `src/world/escena.ts`, `src/world/luces.ts`, `src/world/materiales.ts`, `src/world/terreno/`, `src/world/horizonte.ts`, `data/materiales.json`, `public/texturas/` · **Crítico:** no
- **Referencia:** `borrador/prueba-estilo/` (estilo 4), `docs/adr/0003-estilo-visual.md`, `docs/arte/inventario.md`

**Subtareas**
- M1-T09.1 Cielo físico (`Sky`) que también ilumina la escena mediante un entorno PMREM, con el sol de la escena en la misma dirección; mapeo de tonos ACES y niebla suave con el color del cielo (M0-T04.2 revisado).
- M1-T09.2 `data/materiales.json` con esquema: por material, sus texturas (`_diff`, `_nor_gl`, `_rough`), metros por repetición y tinte de la paleta, con los valores de `docs/arte/inventario.md`. Fábrica de materiales `MeshStandardMaterial` con caché por nombre (M0-T06.3 y T06.4 revisados).
- M1-T09.3 Copiar a `public/texturas/` las texturas que usa el terreno (`hierba`, `surcos`, `camino`) desde `borrador/prueba-estilo/texturas-comfy/`. JPG por ahora; la conversión a KTX2 queda para cuando haya más texturas.
- M1-T09.4 Terreno con UV en metros, continuas entre trozos, y material por tipo de parcela: `hierba` con el tinte del tipo (prado, bosque, rocoso) hasta que existan sus texturas propias (pendientes en el inventario); arena de orilla, roca y nieve de las colinas con el tinte de la paleta.
- M1-T09.5 Quitar el sombreado plano de la escena de muestra, el terreno, el horizonte y el pueblo; los objetos que sigan siendo provisionales usan materiales del catálogo.
- M1-T09.6 Medir los fps con el valle completo a la vista y anotarlos en la PR.

**Criterios de aceptación**
- [ ] La escena usa cielo físico que ilumina y mapeo de tonos ACES; no queda `flatShading` en el terreno, el horizonte, el pueblo ni la escena de muestra.
- [ ] Ningún color, textura ni escala de textura está escrito a mano en `src/world/`: salen de `data/paleta.json` y `data/materiales.json`.
- [ ] No se ven costuras de textura entre trozos del terreno.
- [ ] Cada tipo de parcela se sigue distinguiendo a simple vista.
- [ ] Con el valle completo a la vista, 60 fps en el equipo de desarrollo. Si no se llega, se abre un issue `deuda` con la medida y las opciones de calidad propuestas (hierba, sombras, oclusión), y la tarea no se bloquea.

**Tests unitarios**
- `materiales.test.ts`: "el catálogo cumple el esquema", "todo tinte existe en la paleta", "los metros por repetición son positivos", "pedir dos veces el mismo material devuelve el mismo objeto", "la escala de repetición es 1 / metros".
- `uv-terreno.test.ts`: "la UV de un punto es la misma calculada desde dos trozos vecinos", "UV = metros / metros por repetición".
