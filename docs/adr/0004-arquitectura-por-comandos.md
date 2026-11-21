# 0004 — Arquitectura `core` / `juego` / `world` / `ui` dirigida por comandos

**Estado:** Aceptado
**Fecha:** 2026-11-15
**Relacionado:** [GDD §10](../../GDD.md#10-técnica-propuesta) · [PROCESO §5](../PROCESO.md) · [ADR 0002](0002-copia-del-nucleo-de-raices.md) · ADR 0004 de Raíces («Núcleo determinista dirigido por comandos»)

## Contexto
Queremos tests rápidos, guardado fiable y lógica independiente del render. El núcleo copiado de Raíces ya sigue ese modelo; hay que mantenerlo y definir cómo se conectan con él la escena 3D y la interfaz.

## Decisión
- `src/core/`: toda la lógica, **pura y determinista**, sobre un estado serializable. Sin three.js, DOM, `Math.random` ni `Date`; la aleatoriedad usa el RNG del núcleo y el tiempo avanza por comandos.
- **Todo cambio de estado pasa por un comando** del núcleo. Un comando inválido devuelve error y deja el estado intacto.
- `src/juego/`: bucle, almacén del estado y entrada de teclado y ratón; une el núcleo con la escena traduciendo fotogramas e input en comandos.
- `src/world/`: escena three.js; solo dibuja el estado y envía comandos, sin reglas de juego.
- `src/ui/`: interfaz Preact; lee el estado y emite comandos (textos en `src/ui/textos/`).
- `src/save/`: guardado en IndexedDB.
- Dirección de dependencias: `core` no importa nada de las demás capas; `world` y `ui` no modifican el estado directamente.
- Todo cálculo que no necesite three.js (alturas, rejilla, rutas, colisiones) va en una función pura con test. Los números de balance van en `data/`.
- Solo tests unitarios (Vitest); lo que únicamente dibuja no lleva test.

## Alternativas descartadas
| Alternativa | Motivo del descarte |
|---|---|
| Lógica dentro de la escena three.js | No se puede testear sin render y acopla reglas y motor |
| Estado mutable modificado desde escena y UI | Difícil de reproducir, guardar y depurar |
| ECS completo | Exceso de complejidad para un juego de gestión con pocas entidades activas |
| Gestor de estado de UI independiente del núcleo | Duplicaría el estado y crearía dos fuentes de verdad |

## Consecuencias
- **+** Tests unitarios en milisegundos; la lógica se verifica sin navegador ni GPU.
- **+** Guardado = serializar el estado; la escena es intercambiable.
- **−** Más ceremonia por cada acción nueva (comando, validación y tests).
- **−** Copiar estado inmutable tiene coste; se medirá y se optimizará si hace falta.
- **−** Sin e2e, la unión `juego`/`world` solo se comprueba a mano por ahora.
- **Abierto:** cómo se hace cumplir la pureza de `core` (ESLint y `tsconfig`, como en Raíces); lo concretan las tareas de configuración.
