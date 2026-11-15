# Raíces 3D — guía para agentes

Juego web de granja y construcción en 3D (three.js + Preact + TypeScript), hermano en 3D de [Raíces (build-frame)](https://github.com/devlitus/build-frame). Solo navegador de escritorio, teclado y ratón.

**Lee primero:** [GDD](GDD.md) · [ROADMAP](ROADMAP.md) · [PROCESO](docs/PROCESO.md) · [Planes](docs/plan/) · [ADRs](docs/adr/)

## Comandos
- `npm run dev` — servidor de desarrollo
- `npm run check` — lint, formato, tipos, tests y build (lo mismo que la CI). Debe pasar antes de cualquier PR.
- `npm test` — tests unitarios (Vitest)

## Estructura
- `src/core/` — lógica pura y determinista por comandos (copiada de Raíces). Sin three.js, DOM, `Math.random` ni `Date`.
- `src/juego/` — bucle, almacén del estado, entrada de teclado y ratón; une el núcleo con la escena.
- `src/world/` — escena three.js: solo dibuja el estado y envía comandos. Sin reglas de juego.
- `src/ui/` — interfaz Preact sobre el lienzo (textos en `src/ui/textos/`).
- `src/save/` — guardado en IndexedDB.
- `data/` — contenido, balance y paleta en JSON validado con esquema.
- `docs/plan/fase-N/` — plan de cada hito: objetivo, tareas, criterios de aceptación y tests.
- `borrador/` — material de diseño previo (arte conceptual, bocetos, visor). No se importa desde `src/`.

## Reglas de código
- Todo cambio de estado pasa por un **comando** del núcleo. La escena y la UI nunca modifican el estado directamente.
- Los números de balance y los colores van en `data/`, nunca escritos a mano en el código.
- Todo cálculo que no necesite three.js va en una función pura con su test (alturas, rejilla, rutas, colisiones).
- Solo **tests unitarios** (Vitest). Sin e2e por ahora. Lo que solo dibuja no lleva test.
- Nombres de código, comentarios y textos en **español**.
- Rendimiento: `InstancedMesh` para todo lo que se repite; objetivo 60 fps en un PC medio.

## Ramas y trabajo
- Ramas: `main` ← `fase/N-…` ← `hito/MX-…` ← `feat/MX-TNN-…` (detalle en PROCESO §2).
- Cada tarea es un issue de GitHub `[MX-TNN]` con su milestone. La PR de la tarea lleva `Closes #NN`.
- Commits: Conventional Commits, tipo en inglés y descripción en español (`feat(parcelas): …`), con `Refs #NN (MX-TNN)` en el cuerpo.
- La deuda técnica y los fallos no bloqueantes van a issues con la etiqueta `deuda` o `bug`, no se arreglan "de paso" fuera de la tarea.

## Agentes
| Agente | Modelo | Rol |
|---|---|---|
| Orquestador | Opus (la sesión del hito o de la fase) | Planifica, crea issues, lanza subagentes, integra |
| `implementador` | Sonnet | Código y tests unitarios de una tarea |
| `revisor` | Opus | Verifica los criterios de aceptación de cada subtarea |
| `rompedor` | Sonnet (Opus en críticos) | Pasada ligera al final del hito sobre las tareas críticas |

## Límites
- **Nunca** integrar en `main` sin la aprobación del humano.
- **Nunca** hacer *push* directo a `main`, `fase/…` ni `hito/…`: siempre por PR.
- **Nunca** borrar, saltar ni debilitar tests para que pase la CI.
- No cambiar el GDD, el ROADMAP ni el PROCESO sin aprobación del humano.
- Una sesión solo edita dentro de su propio worktree (PROCESO §3).
