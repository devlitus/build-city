# PROCESO — Cómo construimos Raíces 3D

> **Versión:** 0.1 · 2026-11-15
> Relacionado: [GDD](../GDD.md) · [ROADMAP](../ROADMAP.md) · [Planes](plan/) · [CLAUDE.md](../CLAUDE.md)

Este documento define **cómo** se trabaja: ramas, sesiones y worktrees, roles de los agentes, ciclo de cada tarea, issues de GitHub y calidad. Si el proceso no funciona, se cambia aquí primero.

---

## 1. Estructura del trabajo

```
Fase  (Fase 1 · MVP)                 → una rama fase/…, termina en PR a main
 └─ Hito  (M0 … M8)                  → una rama hito/…, se integra en la fase
     └─ Tarea  (M0-T01, M0-T02 …)    → una rama feat/…, se integra en el hito
         └─ Subtarea  (M0-T01.1 …)   → checklist dentro de la tarea (sin rama propia)
```

- **El plan de cada hito** vive en `docs/plan/fase-N/MX-nombre.md`. Es la fuente de verdad: objetivo, tareas, subtareas, criterios de aceptación y tests unitarios.
- **Cada tarea es un issue de GitHub** (se crean al empezar el hito, §6). El issue enlaza a su sección del plan y lleva los criterios como casillas que marca el Revisor.
- **Los planes de una fase se escriben al empezar la fase**: la Fase 1 ya está escrita; las fases 2 y 3 se planifican cuando les toque, con lo aprendido.

---

## 2. Ramas

```
main                                   ← estable; solo recibe fases terminadas
 └─ fase/1-mvp                           ← integración de los hitos de la fase
     ├─ hito/M0-cimientos                ← integración de las tareas del hito
     │   ├─ feat/M0-T01-proyecto-vite
     │   └─ feat/M0-T02-copia-nucleo
     └─ hito/M1-valle
```

| Rama | Se crea desde | Se integra en | Cómo | Quién decide |
|---|---|---|---|---|
| `fase/N-nombre` | `main` | `main` | PR, *merge commit* | **El humano**, tras jugar la versión |
| `hito/MX-nombre` | `fase/…` | `fase/…` | PR, *merge commit* | Orquestador de fase, con la CI en verde y todas las tareas aprobadas |
| `feat/MX-TNN-nombre` | `hito/…` | `hito/…` | PR, *squash* (un commit por tarea) | Orquestador del hito, con el Revisor en APROBADO y la CI en verde |
| `fix/MX-nombre` | `hito/…` | `hito/…` | PR, *squash* | Orquestador del hito |
| `deuda/NN-nombre` | la rama activa | la misma | PR, *squash* | Orquestador que la haya lanzado |
| `docs/…` (fuera de un hito) | `main` | `main` | PR, *squash* | Sesión principal, con la CI en verde |

- `main` solo se toca por PR. Nadie hace *push* directo.
- Al empezar un hito, su rama sale de la **última** `fase/…` (con los hitos anteriores ya integrados).
- **Versiones:** cada fase integrada en `main` lleva etiqueta (`v0.1.0` = Fase 1 · MVP). Los hitos integrados en la fase llevan etiqueta de hito (`v0.1.0-m3`).

### Commits
[Conventional Commits](https://www.conventionalcommits.org/): tipo en inglés, descripción en español, número de tarea en el cuerpo.
```
feat(parcelas): mojones físicos al comprar una parcela

Refs #12 (M4-T03)
```

---

## 3. Sesiones, worktrees y paralelismo

**Qué es un worktree:** una segunda (o tercera…) carpeta del mismo repositorio, cada una con su propia rama. Así dos agentes pueden trabajar a la vez sin pisarse los archivos: cada uno edita su carpeta y Git los junta después al integrar las ramas.

**Regla de la app de Claude:** una sesión, y los subagentes que lance, solo pueden editar dentro de **su propio** worktree. Por eso cada nivel de trabajo es una sesión distinta:

| Sesión | Modelo | Rama y worktree | Qué hace |
|---|---|---|---|
| **Principal** | Opus | Checkout principal (`main`) | Planifica fases, mantiene GDD/ROADMAP/PROCESO, lanza la sesión de fase y resume sus avisos al humano |
| **De fase** | Opus | Worktree propio en `fase/N-…` | Lanza las sesiones de hito en orden, integra cada PR de hito en la fase, mantiene el estado de la fase y abre la PR final a `main` |
| **De hito** (Orquestador) | Opus | Worktree propio en `hito/MX-…` | Crea los issues del hito, ejecuta el ciclo de cada tarea con los subagentes (§5), integra las tareas y abre la PR del hito hacia la fase |
| Subagente **Implementador** | Sonnet | Rama `feat/…`; worktree propio si trabaja en paralelo | Código + tests unitarios de una tarea |
| Subagente **Revisor** | Opus | Lee la rama de la tarea | Verifica criterios de aceptación, aprueba o pide cambios |
| Subagente **Rompedor** | Sonnet (Opus en sistemas críticos) | Lee el hito completo | Una pasada ligera al final del hito (§5.3) |

### Paralelismo
- **Hitos:** van **en orden** (cada uno depende del anterior). Solo se adelanta uno si el plan de la fase lo marca como independiente (p. ej. arte o una tarea de datos).
- **Tareas dentro de un hito:** el plan indica para cada tarea de qué depende y qué archivos toca. Las tareas **sin dependencias entre sí y sin archivos en común** se implementan **en paralelo**: el Orquestador lanza cada Implementador con `isolation: "worktree"` en la herramienta `Agent`, que le da un worktree propio. El resto va en secuencia en el worktree del hito.
- **Máximo 3 implementadores en paralelo** por hito, para que la revisión no se convierta en cuello de botella.

### Lanzar una sesión
La sesión nueva no ve la conversación de quien la lanza. El brief incluye siempre: rama de origen, rama a crear, ruta del plan, este documento y qué hacer al terminar (avisar con un resumen y el enlace a la PR).

---

## 4. Roles

### Humano · Product Owner
- Aprueba cambios en el GDD, el ROADMAP y este documento.
- Aprueba cada **fase** antes de integrarla en `main` (tras jugarla).
- Decide en empates de diseño y lleva el arte con ayuda de los agentes.

### Agentes
| Agente | Modelo | Puede | No puede |
|---|---|---|---|
| **Orquestador** (sesión de hito o de fase) | Opus | Crear ramas, issues y PRs; lanzar subagentes; integrar tareas en el hito y hitos en la fase con la CI en verde; editar `docs/plan/` | Integrar en `main`; cambiar el GDD sin aprobación |
| **Implementador** | Sonnet | Editar `src/`, `tests/`, `data/` y `public/` de su tarea | Tocar otras tareas; borrar, saltar ni debilitar tests (suyos o del Rompedor) |
| **Revisor** | Opus | Leer todo, ejecutar tests, marcar casillas del issue, aprobar o pedir cambios | Escribir código de juego |
| **Rompedor** | Sonnet · Opus en críticos | Escribir tests en `tests/` y un informe; abrir issues de `bug` o `deuda` | Modificar `src/` |

**Sistemas críticos:** economía y precios, guardado y migraciones, reglas de construcción y parcelas. Se marcan en el plan con **Crítico: sí**.

---

## 5. Ciclo de trabajo

### 5.1 Ciclo de un hito
```
1. Arranque       Orquestador crea hito/MX desde fase/…, lee el plan y crea los issues (§6)
2. Tareas         ciclo 5.2 por cada tarea (en paralelo cuando el plan lo permite)
3. Rompedor       una pasada ligera sobre las tareas críticas del hito (§5.3)
4. Cierre         npm run check en verde → PR hito → fase con el resumen del hito
5. Integración    la sesión de fase integra la PR con la CI en verde y avisa
```

### 5.2 Ciclo de una tarea
```
Orquestador ──► Implementador ──► Revisor ──┬── APROBADO ──► CI verde ──► squash en hito/MX
 (issue +        (código + tests   (criterio │
  plan)           en feat/…)        a criterio)└── CAMBIOS ──► Implementador corrige (máx. 3 rondas)
```
1. El **Orquestador** asigna la tarea: número de issue, sección del plan y rama.
2. El **Implementador** crea `feat/MX-TNN-…`, implementa las subtareas en orden y escribe los tests unitarios del plan. Termina cuando `npm run check` pasa. Hace *push* y abre la PR hacia `hito/MX-…` con `Closes #NN`.
3. El **Revisor** comprueba **cada criterio de aceptación de cada subtarea** (§5.4) y responde **APROBADO** o **CAMBIOS PEDIDOS**, con la lista de criterios que no se cumplen.
4. Si hay cambios, vuelve al paso 2. **Tras 3 rondas** sin aprobar, el Orquestador para y replantea la tarea (seguramente está mal definida) e informa en el issue.
5. Con APROBADO y la CI en verde, el Orquestador integra con *squash*; el issue se cierra solo.

### 5.3 Rompedor — intensidad ligera (4 de 10)
El Rompedor existe para encontrar fallos graves, no para frenar el avance.
- **Cuándo:** una sola vez por hito, al final, y **solo sobre las tareas marcadas como críticas**. Si un hito no tiene tareas críticas, no se lanza.
- **Alcance:** como máximo ~10 tests nuevos (casos límite y alguna propiedad con fast-check sobre `src/core/`) y un informe corto. Sin e2e.
- **Qué bloquea la PR del hito:** solo los fallos **S1** (el juego pierde la partida, el dinero o los recursos quedan mal, se puede romper una regla de construcción o de parcelas).
- **Qué no bloquea:** los fallos **S2 y S3** se convierten en issues con la etiqueta `bug` (y `deuda` si es de diseño del código) y se resuelven en un hito posterior. Sus tests se marcan `it.todo` con el número de issue.

### 5.4 Qué verifica el Revisor
Por cada subtarea, uno por uno:
1. **Criterios de aceptación:** cada casilla del plan se cumple. Si es de lógica, hay al menos un test unitario que lo demuestra. Si es visual (la escena 3D), lo comprueba leyendo el código y, si hace falta, pidiendo al Orquestador una captura del juego en marcha.
2. **Tests unitarios del plan:** existen, prueban lo que dicen y pasan.
3. **Reglas de arquitectura** (§7): `core/` puro, cambios por comandos, balance en `data/`.
4. **Alcance:** no hay cambios ajenos a la tarea.

Marca las casillas del issue que se cumplen y responde con **APROBADO** o **CAMBIOS PEDIDOS** (bloqueante / recomendable, con `archivo:línea`). Lo **recomendable** no bloquea: si no se arregla en la tarea, se apunta como issue de `deuda`.

---

## 6. Issues de GitHub

### Etiquetas
| Etiqueta | Para qué |
|---|---|
| `tarea` | Una tarea del plan de un hito |
| `critico` | Tarea de un sistema crítico (activa al Rompedor) |
| `deuda` | Deuda técnica: algo que funciona pero conviene rehacer |
| `bug` | Fallo encontrado (con severidad `S1`, `S2` o `S3`) |
| `S1` · `S2` · `S3` | Severidad del fallo (§8) |
| `arte` | Modelos, texturas y conceptos |
| `bloqueado` | Espera una decisión del humano o de otra tarea |
| `fase-1` · `fase-2` · `fase-3` | Fase a la que pertenece |

### Milestones
Un *milestone* de GitHub por hito: `M0 — Cimientos`, `M1 — El valle 3D`… Las tareas llevan el milestone de su hito. La deuda y los bugs no bloqueantes llevan el milestone del hito en el que se vayan a resolver, o ninguno si aún no se ha decidido.

### Creación
- Las issues de tarea las crea el **Orquestador del hito** al arrancarlo, una por tarea, con la plantilla `tarea` (título `[MX-TNN] Título`), las etiquetas `tarea` + fase (+ `critico`) y el milestone.
- El cuerpo enlaza a la sección del plan y copia sus criterios como casillas.
- Las issues de `deuda` y `bug` las puede abrir cualquier agente con su plantilla.

### Revisión de la deuda
Al planificar cada hito, el Orquestador revisa las issues de `deuda` abiertas y propone al humano cuáles entran en el hito (como tareas extra).

---

## 7. Calidad

### Tests
| Nivel | Herramienta | Qué cubre | Quién |
|---|---|---|---|
| **Unitarios** | Vitest | Toda la lógica de `src/core/` y las funciones puras de `src/world/` (generación del terreno, colocación, rutas) | Implementador |
| Propiedades | Vitest + fast-check | Invariantes de sistemas críticos | Rompedor (pasada ligera) |
| Manual | El humano | Que se vea bien y que sea divertido | Humano, al cerrar la fase |

- **Solo tests unitarios de lógica** por ahora. **Sin e2e** hasta que se decida lo contrario.
- La parte que solo dibuja (three.js, cámaras, sombras, animaciones) no lleva tests: se valida por los criterios visuales del plan y la revisión.
- Para que la lógica sea testeable, todo cálculo que no necesite three.js va en funciones puras (p. ej. `alturaTerreno(x, z)`, `encajarEnRejilla(...)`), separadas del código que crea mallas.

### Reglas de arquitectura (las vigila el Revisor)
- `src/core/` **no importa** three.js, el DOM ni el navegador. Es lógica pura y determinista, sin `Math.random` ni `Date` (usa el RNG con semilla del núcleo).
- Todo cambio de estado del juego pasa por un **comando** (`ComprarParcela`, `Construir`, `Talar`…). La escena 3D lee el estado y envía comandos; nunca modifica el estado directamente.
- El contenido y el balance viven en `data/` como JSON validado con esquema. Nada de números mágicos de balance en el código.
- La escena 3D (`src/world/`) no contiene reglas de juego.

### CI (GitHub Actions)
En cada *push* a `fase/**`, `hito/**` y en cada PR: `lint` → `format:check` → `typecheck` → `test` → `build`. Es lo mismo que `npm run check` en local.

### Definición de "hecho"
- **Tarea:** criterios aprobados por el Revisor, tests unitarios en verde, CI en verde, integrada en el hito.
- **Hito:** todas sus tareas integradas, pasada del Rompedor sin S1 abiertos, criterios del hito cumplidos, PR integrada en la fase.
- **Fase:** todos sus hitos integrados, el humano la ha jugado y aprobado, PR integrada en `main` con etiqueta de versión.

---

## 8. Bugs y severidad

| Severidad | Definición | Acción |
|---|---|---|
| **S1** | Pierde partida o datos, estado de juego incorrecto (dinero, recursos, reglas), no arranca | Bloquea el hito; se arregla antes de cerrarlo |
| **S2** | Funciona mal pero se puede seguir jugando | Issue `bug`; se planifica en un hito posterior |
| **S3** | Detalle menor, visual o de texto | Issue `bug`; cuando haya hueco |
