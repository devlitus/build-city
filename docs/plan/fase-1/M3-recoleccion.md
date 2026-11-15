# M3 — Recolección

> **Rama:** `hito/M3-recoleccion` (desde `fase/1-mvp`) · **Milestone:** `M3 — Recolección`
> Fase: [Fase 1](README.md) · GDD §7.5, §7.8

## Objetivo
Los primeros recursos salen del mundo: el granjero tala árboles y pica rocas, que caen y se rompen; la madera y la piedra van al inventario y cada golpe gasta energía.

## Criterios de aceptación del hito
- [ ] Se tala un árbol y se pica una roca con sus herramientas; el inventario y la energía cambian según el núcleo.
- [ ] El estado del mundo 3D coincide siempre con el del núcleo (lo que se ve existe en el núcleo y al revés).
- [ ] Sin energía, el granjero no puede golpear y a las 02:00 se desmaya.

## Paralelismo
`T01` y `T02` en paralelo. `T03` necesita `T01`. `T04`, `T05` y `T07` necesitan `T03` (pueden ir en paralelo entre sí). `T06` necesita `T03`.

---

### M3-T01 · Apuntar al objetivo
- **Objetivo:** saber qué obstáculo o casilla tiene delante el granjero.
- **Depende de:** M2 · **Archivos:** `src/core/objetivo.ts` · **Crítico:** no

**Subtareas**
- M3-T01.1 `objetivoDelante(posicion, direccion, estado, alcance)`: el obstáculo más cercano dentro de un cono frontal; si no hay, la casilla delante.
- M3-T01.2 Alcance y ángulo del cono en `data/herramientas.json`.

**Criterios de aceptación**
- [ ] Con dos obstáculos en el cono, elige el más cercano.
- [ ] Un obstáculo detrás del granjero nunca es objetivo.

**Tests unitarios**
- `objetivo.test.ts`: "elige el más cercano", "ignora lo que está detrás", "ignora lo que está fuera de alcance", "sin obstáculos devuelve la casilla delante".

---

### M3-T02 · Barra de herramientas
- **Objetivo:** elegir herramienta con las teclas 1–9 o la rueda.
- **Depende de:** M2 · **Archivos:** `src/ui/hud/Herramientas.tsx`, `src/juego/entrada.ts` · **Crítico:** no

**Subtareas**
- M3-T02.1 Barra abajo en el centro con la herramienta activa resaltada.
- M3-T02.2 Teclas 1–9 y rueda del ratón envían `ElegirHerramienta`.

**Criterios de aceptación**
- [ ] La herramienta activa del HUD siempre coincide con la del estado.

**Tests unitarios**
- `entrada.test.ts`: "la tecla 3 elige la tercera herramienta", "la rueda pasa a la siguiente y da la vuelta".

---

### M3-T03 · Talar y picar
- **Objetivo:** usar el hacha y el pico en el mundo 3D con las reglas del núcleo de Raíces.
- **Depende de:** T01 · **Archivos:** `src/core/herramientas.ts`, `src/core/recursos.ts`, `data/recursos.json` · **Crítico:** **sí** (recursos e inventario)

**Subtareas**
- M3-T03.1 Clic o E usa la herramienta sobre `objetivoDelante`: `UsarHerramienta` con la casilla del objetivo.
- M3-T03.2 Golpes necesarios por tipo de árbol y roca en datos; el obstáculo guarda su vida restante.
- M3-T03.3 Árbol talado → tocón (obstáculo pequeño) + madera; roca rota → desaparece + piedra.
- M3-T03.4 Cada golpe gasta energía; sin energía el golpe se rechaza.

**Criterios de aceptación**
- [ ] El botín coincide con `data/recursos.json` según el tipo de parcela.
- [ ] El inventario nunca supera su capacidad: lo que no cabe no se pierde en silencio (se avisa).
- [ ] Un golpe sin energía no cambia nada.
- [ ] Las reglas de propiedad de Raíces se mantienen (no se tala en parcelas ajenas).

**Tests unitarios**
- `herramientas.test.ts`: "N golpes talan el árbol", "el tocón queda en la misma casilla", "sin energía se rechaza", "en parcela ajena se rechaza", "inventario lleno avisa y no pierde recursos".

---

### M3-T04 · Efectos de golpe, caída y rotura
- **Objetivo:** que golpear se sienta bien.
- **Depende de:** T03 · **Archivos:** `src/world/efectos/` · **Crítico:** no

**Subtareas**
- M3-T04.1 Sacudida del árbol al golpear; caída animada en la dirección contraria al granjero.
- M3-T04.2 Partículas de astillas y de piedra.
- M3-T04.3 Animación de golpe del granjero.
- M3-T04.4 Sonidos provisionales (CC0) de golpe, caída y rotura.

**Criterios de aceptación**
- [ ] El árbol cae siempre lejos del granjero.
- [ ] Los efectos no dejan objetos en la escena al terminar (sin fugas).

**Tests unitarios**
- `caida.test.ts`: "la dirección de caída es opuesta al granjero".

---

### M3-T05 · Energía en el HUD y desmayo
- **Objetivo:** ver la energía y sufrir el desmayo de las 02:00.
- **Depende de:** T03 · **Archivos:** `src/ui/hud/Estado.tsx` · **Crítico:** no

**Subtareas**
- M3-T05.1 Barra de energía arriba a la derecha.
- M3-T05.2 Desmayo: fundido a negro y despertar en la tienda con menos energía (regla del núcleo).

**Criterios de aceptación**
- [ ] La barra coincide con el estado del núcleo.
- [ ] Tras el desmayo el granjero aparece en su tienda o casa.

**Tests unitarios**
- `energia.test.ts` (núcleo, si falta): "el desmayo reduce la energía inicial del día siguiente".

---

### M3-T06 · Plantones y replantar
- **Objetivo:** que la madera sea renovable.
- **Depende de:** T03 · **Archivos:** `src/core/recursos.ts`, `src/world/vegetacion.ts` · **Crítico:** no

**Subtareas**
- M3-T06.1 Talar puede dar un plantón (probabilidad en datos, regla de Raíces).
- M3-T06.2 Plantar un plantón en casilla libre de parcela propia; crece en días hasta árbol.
- M3-T06.3 Modelo pequeño para cada fase de crecimiento.

**Criterios de aceptación**
- [ ] Un plantón se convierte en árbol tras los días de `recursos.json`.

**Tests unitarios**
- `plantones.test.ts`: "crece en N días", "no se planta en casilla ocupada", "no se planta en parcela ajena".

---

### M3-T07 · Aviso contextual
- **Objetivo:** que el jugador sepa qué hará su clic.
- **Depende de:** T03 · **Archivos:** `src/ui/hud/Aviso.tsx` · **Crítico:** no

**Subtareas**
- M3-T07.1 "E — Talar pino · 3 golpes", "E — Picar roca", o nada si no hay acción posible.
- M3-T07.2 Mensaje flotante al recoger: "+4 madera".

**Criterios de aceptación**
- [ ] El aviso solo aparece cuando la acción es posible con la herramienta activa.

**Tests unitarios**
- `aviso.test.ts`: "hacha + árbol → Talar", "pico + árbol → sin aviso", "sin energía → aviso de cansancio".
