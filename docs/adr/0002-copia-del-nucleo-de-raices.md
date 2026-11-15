# 0002 — Copia del núcleo de Raíces en lugar de paquete compartido

**Estado:** Aceptado
**Fecha:** 2026-11-15
**Relacionado:** [GDD §10](../../GDD.md#10-técnica-propuesta) · [GDD §12](../../GDD.md#12-decisiones-tomadas-2026-11-15) · [ADR 0004](0004-arquitectura-por-comandos.md)

## Contexto
Raíces ya tiene un núcleo (`src/core`) puro, determinista, dirigido por comandos y con sus tests. Raíces 3D quiere partir de esa lógica probada, pero adaptándola: las casillas 2D pasan a ser la cuadrícula de 1 m del suelo 3D. Había que decidir si compartir el código o copiarlo.

## Decisión
- Raíces 3D es un **proyecto nuevo e independiente** (`build-city`) que **copia** `src/core` de Raíces junto con sus tests.
- Desde la copia, el núcleo evoluciona libremente en este repositorio; no hay dependencia de código con Raíces.
- Si más adelante conviene, se podrá extraer un paquete común.
- Los tests copiados se mantienen y no se debilitan; si uno resulta incorrecto en 3D, se documenta y se corrige de forma explícita.

## Alternativas descartadas
| Alternativa | Motivo del descarte |
|---|---|
| Paquete compartido (npm/workspace) entre ambos juegos | Obliga a mantener una API estable y a coordinar versiones antes de saber qué comparten realmente |
| Monorepo con ambos juegos | Acopla ciclos de vida y CI de dos juegos que deben evolucionar por separado |
| Reescribir el núcleo desde cero | Tira lógica y tests ya probados |
| Submódulo de git | Complica el flujo de trabajo y sigue acoplando los dos repositorios |

## Consecuencias
- **+** Arranque rápido sobre código probado y libertad total para adaptarlo al 3D.
- **+** Ningún cambio en Raíces puede romper Raíces 3D, ni al revés.
- **−** Las correcciones de errores del núcleo no se propagan solas entre proyectos; habrá que portarlas a mano si procede.
- **−** Riesgo de divergencia y duplicación a largo plazo.
- **Abierto:** cuándo (y si) se extrae un paquete común; el GDD no fija criterio.
