# M7 — Cultivos

> **Rama:** `hito/M7-cultivos` (desde `fase/1-mvp`) · **Milestone:** `M7 — Cultivos`
> Fase: [Fase 1](README.md) · GDD §7.6

## Objetivo
El bucle de granja completo en 3D: arar, plantar, regar y cosechar los cinco cultivos de primavera, viendo cada planta crecer y mecerse con el viento.

## Criterios de aceptación del hito
- [ ] Un cultivo pasa de semilla a cosecha en los días de `data/cultivos.json`, en el mundo 3D.
- [ ] La tierra arada y la regada se distinguen a simple vista.
- [ ] 2.000 plantas en pantalla mantienen 60 fps.

## Paralelismo
`T01` y `T02` en paralelo. `T03` y `T04` necesitan `T01`. `T05` necesita `T01`. `T06` al final.

---

### M7-T01 · Herramientas de cultivo en 3D
- **Objetivo:** usar azada, semillas, regadera y hoz sobre la casilla delante del granjero con las reglas del núcleo de Raíces.
- **Depende de:** M3 (apuntar), M4 · **Archivos:** `src/juego/acciones.ts`, `src/core/objetivo.ts` · **Crítico:** no (reglas ya probadas en Raíces)

**Subtareas**
- M7-T01.1 `objetivoDelante` devuelve la casilla de suelo cuando la herramienta es de cultivo.
- M7-T01.2 Indicador en el suelo de la casilla objetivo (cuadro de 1 m).
- M7-T01.3 Aviso contextual: "E — Arar", "E — Plantar zanahoria", "E — Regar", "E — Cosechar".

**Criterios de aceptación**
- [ ] El indicador marca exactamente la casilla que cambiará.
- [ ] Solo se ara en zona de Cultivo o Huerto de parcela propia (regla de Raíces).

**Tests unitarios**
- `objetivo.test.ts`: "con la azada devuelve la casilla delante", "la casilla delante en las cuatro direcciones y en diagonal".
- `aviso.test.ts`: "semillas sobre tierra arada → Plantar", "hoz sobre cultivo maduro → Cosechar".

---

### M7-T02 · Modelos por fase de crecimiento
- **Objetivo:** un modelo low-poly por fase de cada cultivo.
- **Depende de:** M0-T06 · **Archivos:** `src/world/cultivos/modelos.ts`, `data/cultivos.json` · **Crítico:** no

**Subtareas**
- M7-T02.1 Patata, zanahoria, lechuga, rábano y fresa: brote, crecimiento y maduro, por código con la paleta.
- M7-T02.2 Fase "marchito" común para cultivos sin regar.

**Criterios de aceptación**
- [ ] Cada cultivo maduro se distingue de los demás a 10 m de distancia.

**Tests unitarios:** sin tests (solo dibujo).

---

### M7-T03 · Plantas instanciadas
- **Objetivo:** dibujar miles de plantas con pocas llamadas de dibujo.
- **Depende de:** T01 · **Archivos:** `src/world/cultivos/instancias.ts` · **Crítico:** no

**Subtareas**
- M7-T03.1 Un `InstancedMesh` por cultivo y fase; agrupar las casillas del estado por (cultivo, fase).
- M7-T03.2 Viento en el *shader* (como en el visor).
- M7-T03.3 Actualizar solo las casillas que cambian al pasar el día o al usar una herramienta.

**Criterios de aceptación**
- [ ] Lo dibujado coincide con el estado del núcleo tras cada acción y cada noche.

**Tests unitarios**
- `instancias.test.ts`: "agrupa por cultivo y fase", "un cambio en una casilla solo cambia su grupo", "un grupo vacío no crea malla".

---

### M7-T04 · Tierra arada y regada
- **Objetivo:** que el estado del suelo se lea de un vistazo.
- **Depende de:** T01 · **Archivos:** `src/world/cultivos/suelo.ts` · **Crítico:** no

**Subtareas**
- M7-T04.1 Surcos de tierra en las casillas aradas.
- M7-T04.2 Tierra más oscura cuando está regada hoy.
- M7-T04.3 Partículas de agua al regar.

**Criterios de aceptación**
- [ ] Al amanecer, la tierra vuelve a verse seca (regla del núcleo).

**Tests unitarios:** sin tests (solo dibujo).

---

### M7-T05 · Regadera mejorada (3×3)
- **Objetivo:** quitar la repetición del riego pronto (lección de Lightyear Frontier).
- **Depende de:** T01 · **Archivos:** `src/core/riego.ts`, `src/core/herramientas.ts`, `data/herramientas.json` · **Crítico:** no

**Subtareas**
- M7-T05.1 Nivel 2 de regadera que riega 3×3 casillas con un gasto de energía en datos.
- M7-T05.2 Cómo se consigue (comprar en el pueblo) queda provisionalmente como un botón de depuración hasta M8.

**Criterios de aceptación**
- [ ] El 3×3 solo riega casillas aradas de parcelas propias.

**Tests unitarios**
- `riego.test.ts`: "nivel 2 riega 9 casillas", "en el borde de la parcela riega solo las propias", "gasta la energía del dato".

---

### M7-T06 · Prueba de rendimiento
- **Objetivo:** asegurar los 60 fps con una granja grande.
- **Depende de:** T03, T04 · **Archivos:** `src/juego/depuracion.ts` · **Crítico:** no

**Subtareas**
- M7-T06.1 Atajo de desarrollo que llena las parcelas propias con 2.000 cultivos variados.
- M7-T06.2 Medir y anotar fps y llamadas de dibujo en la PR del hito.

**Criterios de aceptación**
- [ ] 60 fps y menos de 300 llamadas de dibujo con 2.000 plantas.

**Tests unitarios:** sin tests.
