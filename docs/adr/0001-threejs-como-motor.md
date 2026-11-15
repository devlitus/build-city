# 0001 — three.js como motor de render

**Estado:** Aceptado
**Fecha:** 2026-11-15
**Relacionado:** [GDD §10](../../GDD.md#10-técnica-propuesta) · [GDD §12](../../GDD.md#12-decisiones-tomadas-2026-11-15) · [ADR 0004](0004-arquitectura-por-comandos.md)

## Contexto
Raíces 3D es el hermano en 3D de Raíces (que usa Phaser en 2D). Necesitamos un motor que corra en el navegador, con un ecosistema amplio y que se integre con TypeScript, Vite y Preact. El GDD fija la plataforma: **solo web, navegador de escritorio con teclado y ratón**.

## Decisión
- El render se hace con **three.js** (WebGL2). WebGPU queda como opción futura, no como requisito.
- Lenguaje y build: TypeScript + Vite. La interfaz es Preact superpuesta al lienzo.
- La plataforma objetivo es solo el navegador de escritorio; no se diseña para móvil ni táctil en el MVP.
- three.js solo se usa en `src/world/` (y lo imprescindible de `src/juego/`); `src/core/` no lo importa nunca.
- Las sombras en cascada (`three/addons/csm`) y los `InstancedMesh` son las herramientas para cumplir 60 fps en un PC medio.

## Alternativas descartadas
| Alternativa | Motivo del descarte |
|---|---|
| Babylon.js | Motor más completo pero más pesado; el GDD pide three.js por ecosistema y ligereza |
| Motor con editor (Unity/Godot exportando a web) | Descargas grandes, peor integración con Preact y con el núcleo TypeScript copiado de Raíces |
| Seguir con Phaser | Es un motor 2D; no sirve para el mundo 3D |
| Solo WebGPU | Soporte todavía irregular; no aporta nada necesario al MVP |

## Consecuencias
- **+** Gran ecosistema (addons, cargadores `.glb`, ejemplos) y control fino del rendimiento.
- **+** Mismo lenguaje y herramientas que Raíces: se reutilizan núcleo y componentes de UI.
- **−** three.js es una biblioteca, no un motor: bucle, entrada, colisiones y gestión de recursos los escribimos nosotros.
- **−** Sin soporte móvil ni táctil en el MVP.
- **Abierto:** si hará falta una librería de física (Rapier) o bastarán colisiones propias (cápsula contra cajas); el GDD lo deja para cuando se necesite.
