# Fase 1 · MVP — v0.1 "Primera cosecha 3D"

> **Rama:** `fase/1-mvp` (desde `main`) · **Etiqueta al cerrar:** `v0.1.0`
> Proceso: [PROCESO.md](../../PROCESO.md) · Diseño: [GDD §11](../../../GDD.md) · [ROADMAP](../../../ROADMAP.md)

## Objetivo de la fase
Un jugador abre el juego en el navegador de escritorio, recorre el valle en tercera persona, tala y pica, compra parcelas, construye con el Modo Plano (edificios, vallas y caminos), cultiva, vende y guarda la partida para seguir otro día.

## Hitos

| Hito | Plan | Depende de | Tareas | Críticas | Se puede adelantar |
|---|---|---|---|---|---|
| **M0 — Cimientos** | [M0-cimientos.md](M0-cimientos.md) | — | 7 | — | — |
| **M1 — El valle 3D** | [M1-valle.md](M1-valle.md) | M0 | 9 | T01 | — |
| **M2 — Personaje y tiempo** | [M2-personaje-tiempo.md](M2-personaje-tiempo.md) | M1 | 8 | — | — |
| **M3 — Recolección** | [M3-recoleccion.md](M3-recoleccion.md) | M2 | 7 | T03 | — |
| **M4 — Parcelas y Modo Plano** | [M4-parcelas-modo-plano.md](M4-parcelas-modo-plano.md) | M2 | 7 | T05 | Puede ir en paralelo con M3 |
| **M5 — Zonas y construcción** | [M5-zonas-construccion.md](M5-zonas-construccion.md) | M3, M4 | 7 | T03 | T07 (arte) desde M2 |
| **M6 — Vallas y caminos** | [M6-vallas-caminos.md](M6-vallas-caminos.md) | M5 | 6 | T01, T04 | — |
| **M7 — Cultivos** | [M7-cultivos.md](M7-cultivos.md) | M3, M4 | 6 | — | Puede ir en paralelo con M5–M6 |
| **M8 — Economía, guardado y publicación** | [M8-economia-guardado.md](M8-economia-guardado.md) | M5, M6, M7 | 7 | T01, T03 | — |

```
M0 ─► M1 ─► M2 ─┬─► M3 ─┬─► M5 ─► M6 ─┐
                └─► M4 ─┤             ├─► M8
                        └─► M7 ───────┘
```

**Paralelismo entre hitos:** la sesión de fase puede lanzar M3 y M4 a la vez, y M7 a la vez que M5–M6, porque tocan sistemas distintos. Si dos hitos en paralelo necesitan cambiar el mismo archivo del núcleo (p. ej. `comandos.ts`), el segundo en integrarse resuelve el conflicto en su rama antes de su PR.

## Cómo leer un plan de hito

Cada tarea tiene:
- **Objetivo:** qué consigue la tarea, en una o dos frases.
- **Ficha:** de qué depende, qué archivos toca (para decidir el paralelismo) y si es crítica.
- **Subtareas:** pasos con número (`M1-T02.1`). Se hacen en orden dentro de la rama de la tarea.
- **Criterios de aceptación:** lo que verifica el Revisor, uno a uno.
- **Tests unitarios:** los que el Implementador debe escribir como mínimo. "Sin tests" significa que la tarea solo dibuja; se valida por sus criterios visuales.

## Criterios de aceptación de la fase
- [ ] Los 9 hitos están integrados en `fase/1-mvp` y la CI está en verde.
- [ ] Se juega una partida de al menos 7 días de juego sin errores en la consola.
- [ ] 60 fps en un PC medio con la granja del día 7 (edificios, vallas, caminos y cultivos).
- [ ] La partida se guarda al dormir y se recupera al volver a abrir el navegador.
- [ ] El humano ha jugado la versión desplegada y la aprueba.
- [ ] No hay issues `S1` abiertas.

## Fuera de la fase
Animales, vecinos, procesado, decoración libre, estaciones completas, clima avanzado, carro, controles táctiles, e2e y online.
