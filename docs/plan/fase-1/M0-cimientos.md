# M0 — Cimientos

> **Rama:** `hito/M0-cimientos` (desde `fase/1-mvp`) · **Milestone:** `M0 — Cimientos`
> Fase: [Fase 1](README.md) · Proceso: [PROCESO](../../PROCESO.md)

## Objetivo
El proyecto existe, se construye y se testea solo, contiene el núcleo lógico de Raíces funcionando y pinta una escena 3D mínima con el estilo low-poly de la paleta del juego.

## Criterios de aceptación del hito
- [ ] `npm run check` pasa en local y la CI pasa en verde en la PR del hito.
- [ ] Todos los tests del núcleo copiado de Raíces pasan sin modificar su lógica.
- [ ] `npm run dev` muestra la escena de muestra a 60 fps con la paleta del juego.
- [ ] Los ADRs 0001–0005 están escritos.

## Paralelismo
`T01` va primero (crea el proyecto). Después, `T02`, `T03` y `T04` en paralelo (no comparten archivos). `T05` necesita `T03` y `T04`. `T06` necesita `T04`. `T07` en cualquier momento tras `T01`.

---

### M0-T01 · Proyecto base
- **Objetivo:** crear el proyecto con las herramientas de calidad para que todo lo demás tenga dónde vivir.
- **Depende de:** — · **Archivos:** raíz del repo (`package.json`, configs), `src/main.ts`, `index.html` · **Crítico:** no

**Subtareas**
- M0-T01.1 Vite + TypeScript estricto + three.js + Preact (`@preact/preset-vite`). Node ≥ 22.
- M0-T01.2 Estructura de carpetas: `src/core/`, `src/world/`, `src/ui/`, `src/juego/`, `src/save/`, `data/`, `tests/`, `assets-src/`, `public/`.
- M0-T01.3 ESLint (con `typescript-eslint`) y Prettier, con la misma configuración que Raíces.
- M0-T01.4 Vitest configurado.
- M0-T01.5 `tsconfig.core.json` que compila `src/core/` **sin** `lib: dom` ni tipos de three.js, para que el compilador impida importar el navegador desde el núcleo.
- M0-T01.6 Scripts: `dev`, `build`, `preview`, `lint`, `format`, `format:check`, `typecheck`, `test`, `test:watch`, `check`.
- M0-T01.7 `.gitignore`, `.editorconfig`, `.prettierrc.json`, `README.md` con los comandos.

**Criterios de aceptación**
- [ ] `npm install` y `npm run check` terminan sin errores.
- [ ] `npm run dev` abre una página con el título del juego.
- [ ] Importar `three` o usar `document` en un archivo de `src/core/` hace fallar `npm run typecheck`.
- [ ] La estructura de carpetas coincide con la de M0-T01.2.

**Tests unitarios**
- `tests/humo.test.ts`: "Vitest está configurado" (un test trivial que debe pasar).

---

### M0-T02 · Integración continua
- **Objetivo:** que GitHub compruebe cada rama y cada PR automáticamente.
- **Depende de:** T01 · **Archivos:** `.github/workflows/ci.yml` · **Crítico:** no

**Subtareas**
- M0-T02.1 Workflow `CI` en *push* a `fase/**` y `hito/**`, y en cada `pull_request`.
- M0-T02.2 Pasos: `npm ci` → `lint` → `format:check` → `typecheck` → `test` → `build`, con Node 24 y caché de npm.
- M0-T02.3 `concurrency` para cancelar ejecuciones viejas de la misma rama.

**Criterios de aceptación**
- [ ] La PR de esta tarea muestra el check `CI` en verde.
- [ ] Un error de formato introducido a propósito en una rama de prueba hace fallar la CI (se comprueba y se descarta la rama).

**Tests unitarios:** sin tests (configuración).

---

### M0-T03 · Copia del núcleo de Raíces
- **Objetivo:** traer la lógica de juego ya probada de Raíces (parcelas, zonas, construcción, obras, recursos, herramientas, cultivos, energía, inventario, tiempo, dormir) para no reescribirla.
- **Depende de:** T01 · **Archivos:** `src/core/**`, `data/**`, tests del núcleo · **Crítico:** no (se copia sin cambiar reglas)

**Subtareas**
- M0-T03.1 Copiar `build-frame/src/core/` (código y tests) y `build-frame/data/*.json` con sus esquemas.
- M0-T03.2 Ajustar rutas de importación y cualquier dependencia (p. ej. `valibot`) al nuevo proyecto.
- M0-T03.3 Quitar lo que dependa de Phaser o del 2D si existe (no debería: el núcleo es puro). Anotar en el informe lo que se haya quitado.
- M0-T03.4 Añadir `data/README.md` con el origen de los datos y la fecha de la copia (commit de Raíces).

**Criterios de aceptación**
- [ ] Todos los tests copiados pasan sin cambiar su lógica (solo rutas de importación).
- [ ] `src/core/` no importa nada fuera de `src/core/` y `data/`.
- [ ] El commit de Raíces de origen queda anotado en `data/README.md`.

**Tests unitarios:** los del núcleo de Raíces, copiados.

---

### M0-T04 · Escena 3D mínima
- **Objetivo:** tener el lienzo three.js con la iluminación base del juego, sobre la que se construirán todos los hitos.
- **Depende de:** T01 · **Archivos:** `src/world/escena.ts`, `src/world/luces.ts`, `src/main.ts` · **Crítico:** no

**Subtareas**
- M0-T04.1 `WebGLRenderer` con antialias, sombras `PCFSoftShadowMap` y *pixel ratio* limitado a 2.
- M0-T04.2 Luz de sol direccional con sombras, luz de hemisferio (cielo/suelo), color de cielo y niebla.
- M0-T04.3 Suelo de prueba y unos objetos low-poly (caja, cono, icosaedro) para ver el sombreado plano.
- M0-T04.4 Redimensionado con `ResizeObserver`.
- M0-T04.5 Contador de fps visible solo en desarrollo.

**Criterios de aceptación**
- [ ] La escena se ve con sombreado plano y sombras suaves, sin errores en la consola.
- [ ] Al redimensionar la ventana la imagen no se deforma.
- [ ] 60 fps en un PC medio.
- [ ] El contador de fps no aparece en `npm run build`.

**Tests unitarios:** sin tests (solo dibujo).

---

### M0-T05 · Bucle de juego y puente núcleo ↔ escena
- **Objetivo:** que el estado del juego viva en el núcleo y la escena solo lo lea y envíe comandos, con un paso de tiempo fijo.
- **Depende de:** T03, T04 · **Archivos:** `src/juego/bucle.ts`, `src/juego/almacen.ts` · **Crítico:** no

**Subtareas**
- M0-T05.1 `Almacen`: guarda el estado del núcleo, aplica comandos (`despachar(comando)`) y avisa a los suscriptores con los eventos.
- M0-T05.2 Bucle con paso fijo (acumulador): el tiempo real se convierte en pasos de simulación fijos; el dibujado va a la frecuencia del navegador.
- M0-T05.3 El bucle envía `AvanzarTiempo` según la velocidad y la pausa del estado.

**Criterios de aceptación**
- [ ] La escena nunca modifica el estado: solo llama a `despachar`.
- [ ] Con la pestaña en segundo plano y al volver, el bucle no ejecuta más de un máximo de pasos (sin "espiral de la muerte").
- [ ] Un comando rechazado por el núcleo no cambia el estado y se notifica como error.

**Tests unitarios**
- `bucle.test.ts`: "el acumulador da N pasos para N × dt", "no supera el máximo de pasos por fotograma", "el resto se conserva para el siguiente fotograma".
- `almacen.test.ts`: "despachar aplica el comando y notifica los eventos", "un comando rechazado no cambia el estado", "cancelar la suscripción deja de notificar".

---

### M0-T06 · Paleta y material compartido
- **Objetivo:** fijar los colores del juego en datos y un único material low-poly, para que todo combine y se dibuje rápido.
- **Depende de:** T04 · **Archivos:** `data/paleta.json`, `src/world/materiales.ts` · **Crítico:** no

**Subtareas**
- M0-T06.1 `data/paleta.json` con los colores con nombre (prado, bosque, roca, nieve, arena, tierra, madera, teja, granero, crema, piedra, agua…) tomados del visor (`borrador/visor/`).
- M0-T06.2 Esquema de validación de la paleta.
- M0-T06.3 Fábrica de materiales con caché: sombreado plano, sin brillo, por nombre de color.
- M0-T06.4 La escena de muestra usa solo colores de la paleta.

**Criterios de aceptación**
- [ ] Ningún color de la escena está escrito a mano en `src/world/`: todos salen de la paleta.
- [ ] Pedir dos veces el mismo color devuelve el mismo material (caché).

**Tests unitarios**
- `paleta.test.ts`: "la paleta cumple el esquema", "todos los colores son hexadecimales válidos", "un nombre inexistente lanza un error claro".

---

### M0-T07 · ADRs iniciales
- **Objetivo:** dejar escritas las decisiones de base para que cualquier agente las respete.
- **Depende de:** T01 · **Archivos:** `docs/adr/0001…0005` · **Crítico:** no

**Subtareas**
- M0-T07.1 ADR 0001 — three.js como motor (solo web de escritorio).
- M0-T07.2 ADR 0002 — Copia del núcleo de Raíces en lugar de paquete compartido.
- M0-T07.3 ADR 0003 — Estilo low-poly con sombreado plano y paleta en datos.
- M0-T07.4 ADR 0004 — Arquitectura `core` / `juego` / `world` / `ui` dirigida por comandos.
- M0-T07.5 ADR 0005 — Pipeline de arte: Blender → `.glb` con meshopt; formas por código mientras tanto.

**Criterios de aceptación**
- [ ] Cada ADR tiene contexto, decisión, alternativas descartadas y consecuencias.
- [ ] Coinciden con el GDD §10 y §12.

**Tests unitarios:** sin tests (documentación).
