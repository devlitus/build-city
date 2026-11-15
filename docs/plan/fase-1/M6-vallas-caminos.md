# M6 — Vallas y caminos

> **Rama:** `hito/M6-vallas-caminos` (desde `fase/1-mvp`) · **Milestone:** `M6 — Vallas y caminos`
> Fase: [Fase 1](README.md) · GDD §7.4 b

## Objetivo
Dar forma a la granja a mano: dibujar vallas que se adaptan solas (esquinas y puertas) y caminos de grava que aceleran al granjero.

## Criterios de aceptación del hito
- [ ] Se cierra una parcela con una valla con puerta y se traza un camino de la casa a la caja de envío.
- [ ] Las vallas bloquean el paso y las puertas se abren al pasar; los caminos no bloquean y aceleran.
- [ ] Costes y reembolsos coinciden con los datos; las reglas tienen tests.

## Paralelismo
`T01`, `T02`, `T03` y `T04` en paralelo (archivos distintos). `T05` necesita `T01`, `T02` y `T04`. `T06` necesita `T01`.

---

### M6-T01 · Vallas en el núcleo
- **Objetivo:** que las vallas sean estado del juego con reglas y coste.
- **Depende de:** M5 · **Archivos:** `src/core/vallas.ts`, `src/core/comandos.ts`, `data/vallas.json` · **Crítico:** **sí** (reglas de construcción)

**Subtareas**
- M6-T01.1 La valla ocupa casillas; cada casilla puede ser valla o puerta.
- M6-T01.2 Comandos `ColocarVallas(casillas, tipo)` y `QuitarVallas(casillas)`.
- M6-T01.3 Coste en madera por casilla y reembolso al quitar (en datos).
- M6-T01.4 Validación: parcela propia, casilla libre (sin edificio, obstáculo, río ni cultivo).

**Criterios de aceptación**
- [ ] Colocar una línea parcialmente inválida coloca solo las casillas válidas y cobra solo esas (o rechaza toda la línea; se decide en la tarea y se documenta).
- [ ] Sin madera suficiente no se coloca nada ni se cobra.
- [ ] Quitar devuelve el reembolso de `vallas.json`.

**Tests unitarios**
- `vallas.test.ts`: "coloca y cobra por casilla", "sin madera no coloca", "no coloca sobre edificio, obstáculo ni río", "quitar reembolsa", "puerta ocupa casilla igual que valla".

---

### M6-T02 · Forma automática de la valla
- **Objetivo:** que cada tramo elija su pieza según sus vecinos.
- **Depende de:** M5 · **Archivos:** `src/world/vallas/forma.ts` · **Crítico:** no

**Subtareas**
- M6-T02.1 `formaValla(vecinos)` con máscara N/E/S/O → recta, esquina, T, cruz, extremo o poste suelto (y su giro).

**Criterios de aceptación**
- [ ] Las 16 combinaciones de vecinos dan una pieza correcta.

**Tests unitarios**
- `forma.test.ts`: las 16 máscaras, una por caso.

---

### M6-T03 · Dibujar arrastrando
- **Objetivo:** trazar vallas y caminos con el ratón en Modo Plano.
- **Depende de:** M5 · **Archivos:** `src/world/plano/trazo.ts`, `src/ui/plano/` · **Crítico:** no

**Subtareas**
- M6-T03.1 Herramientas V (valla), P (puerta) y C (camino) en la barra del Modo Plano.
- M6-T03.2 Arrastre de A a B → casillas en L (primero el eje más largo), con vista previa y coste total.
- M6-T03.3 Clic derecho o Esc cancela el trazo.

**Criterios de aceptación**
- [ ] La vista previa muestra en rojo las casillas que no se pueden colocar.
- [ ] El coste total se ve antes de soltar.

**Tests unitarios**
- `trazo.test.ts`: "A = B da una casilla", "línea recta horizontal y vertical", "L con el eje largo primero", "no repite casillas".

---

### M6-T04 · Caminos en el núcleo
- **Objetivo:** caminos de grava con coste que aceleran al personaje.
- **Depende de:** M5 · **Archivos:** `src/core/caminos.ts`, `data/caminos.json`, `src/core/personaje.ts` · **Crítico:** **sí** (economía)

**Subtareas**
- M6-T04.1 Comandos `ColocarCamino(casillas)` y `QuitarCamino(casillas)`; coste en piedra y reembolso.
- M6-T04.2 Se puede pintar bajo puertas y entre edificios, no sobre cultivos ni río.
- M6-T04.3 `MoverPersonaje` aplica el multiplicador de velocidad sobre camino (en datos, +30 %).

**Criterios de aceptación**
- [ ] Sobre camino el personaje va un 30 % más rápido (o lo que diga el dato).
- [ ] Sin piedra no se coloca nada ni se cobra.

**Tests unitarios**
- `caminos.test.ts`: "coloca y cobra", "sin piedra no coloca", "no sobre cultivo ni río", "quitar reembolsa".
- `personaje.test.ts`: "velocidad sobre camino × multiplicador".

---

### M6-T05 · Dibujo de vallas y caminos
- **Objetivo:** verlos en el mundo con buen rendimiento.
- **Depende de:** T01, T02, T04 · **Archivos:** `src/world/vallas/`, `src/world/caminos.ts` · **Crítico:** no

**Subtareas**
- M6-T05.1 Postes y tablas instanciados según la forma de cada casilla.
- M6-T05.2 Caminos como losas de grava con bordes irregulares y piedras sueltas.
- M6-T05.3 Actualización incremental al colocar o quitar (sin rehacer todo).

**Criterios de aceptación**
- [ ] 400 casillas de valla y 400 de camino no bajan de 60 fps.

**Tests unitarios:** sin tests (solo dibujo).

---

### M6-T06 · Colisión con vallas y puertas
- **Objetivo:** que las vallas cierren el paso y las puertas dejen pasar.
- **Depende de:** T01 · **Archivos:** `src/core/colision.ts`, `src/world/vallas/puerta.ts` · **Crítico:** no

**Subtareas**
- M6-T06.1 Las casillas de valla son obstáculos para `MoverPersonaje`; las de puerta no.
- M6-T06.2 La puerta se abre con animación cuando el granjero está cerca y se cierra al alejarse.

**Criterios de aceptación**
- [ ] No se puede atravesar una valla en diagonal entre dos postes.

**Tests unitarios**
- `colision.test.ts`: "la valla bloquea", "la puerta deja pasar", "no se cuela en diagonal entre dos vallas".
