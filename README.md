# Raíces 3D

Juego web de granja y construcción en 3D (three.js + Preact + TypeScript). Requiere Node 22 o superior.

## Comandos

- `npm install` — instala las dependencias
- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción en `dist/`
- `npm run preview` — sirve el build
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier (escribe / comprueba)
- `npm run typecheck` — TypeScript (proyecto y núcleo sin DOM ni three.js)
- `npm test` / `npm run test:watch` — tests unitarios (Vitest)
- `npm run test:rendimiento` — pruebas con umbral absoluto de tiempo (`itRendimiento`, en `tests/rendimiento.ts`); se saltan en `npm test` porque dependen de la carga de la máquina. La CI las ejecuta como paso aparte. Ejecútalas con el PC en reposo.
- `npm run check` — lint, formato, tipos, tests y build (lo mismo que la CI)

Más información en [CLAUDE.md](CLAUDE.md), [GDD](GDD.md), [ROADMAP](ROADMAP.md) y `docs/`.
