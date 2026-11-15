# 0005 — Pipeline de arte: Blender a `.glb` con meshopt

**Estado:** Aceptado
**Fecha:** 2026-11-15
**Relacionado:** [GDD §9.2](../../GDD.md#92-pipeline) · [GDD §10](../../GDD.md#10-técnica-propuesta) · [ADR 0003](0003-low-poly-sombreado-plano-paleta-en-datos.md)

## Contexto
El juego necesita edificios, props, cultivos y un personaje animado en low-poly. El GDD fija Blender como herramienta de modelado y `.glb` comprimido como salida. Mientras no haya modelos, el desarrollo no debe quedar bloqueado.

## Decisión
- Edificios, props, cultivos y personaje se modelan en **Blender** (por script o a mano) y se exportan a **`.glb` con compresión meshopt**. El personaje incluye animaciones (andar, correr, golpear, regar, sentarse).
- Todos los modelos usan la paleta compartida del [ADR 0003](0003-low-poly-sombreado-plano-paleta-en-datos.md).
- **Mientras no existan modelos**, las formas se generan **por código** (primitivas de three.js con los colores de `data/`), de modo que se puedan sustituir por `.glb` sin cambiar la lógica.
- El terreno no es un modelo: se genera en ejecución a partir de un heightmap con pintura de vértices.
- Todo recurso tiene una ficha (prompt, semilla, modelo o `.blend`) para poder regenerarlo.
- Arte conceptual e iconos de UI salen de ComfyUI; los modelos desde concepto (Hunyuan3D) son solo prototipos que se rehacen en Blender.

## Alternativas descartadas
| Alternativa | Motivo del descarte |
|---|---|
| Draco como compresión estándar | El GDD cita «meshopt/Draco»; se elige meshopt como única vía para simplificar pipeline y cargador |
| Modelos sin comprimir | Descargas más pesadas en una web |
| Modelos generados por IA usados tal cual | Topología irregular; el GDD exige retopología en Blender |
| Esperar a tener los modelos para programar | Bloquea el avance; las formas por código permiten seguir |

## Consecuencias
- **+** Un formato único (`.glb`) con buen soporte en three.js y descargas ligeras.
- **+** Las formas por código permiten desarrollar y probar sin arte final.
- **−** Hay que mantener el cargador con soporte meshopt y un paso de exportación/compresión.
- **−** Las formas provisionales deben ser reemplazables mediante una interfaz común, o habrá retrabajo.
- **Abierto:** la herramienta concreta de compresión y la convención de las fichas; el GDD no los fija.
