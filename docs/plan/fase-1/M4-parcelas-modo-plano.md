# M4 — Parcelas y Modo Plano

> **Rama:** `hito/M4-parcelas-modo-plano` (desde `fase/1-mvp`) · **Milestone:** `M4 — Parcelas y Modo Plano`
> Fase: [Fase 1](README.md) · GDD §5, §7.2 · Referencia: `borrador/visor/` (botón Modo Plano)

## Objetivo
La primera decisión económica y la segunda cámara: el jugador pulsa Tab, la cámara sube a la vista de plano, elige una parcela en venta y la compra.

## Criterios de aceptación del hito
- [ ] Tab alterna entre Modo Vida y Modo Plano con una transición de cámara fluida y reversible en cualquier momento.
- [ ] En Modo Plano el tiempo se pausa (si el ajuste está activo) y se ven la rejilla y las lindes de parcela.
- [ ] La primera parcela se compra libremente y las siguientes solo si son adyacentes; el dinero baja correctamente.

## Paralelismo
`T01` y `T04` en paralelo. `T02` y `T03` necesitan `T01`. `T05` necesita `T04`. `T06` y `T07` necesitan `T05`.

---

### M4-T01 · Modo Plano en el núcleo
- **Objetivo:** que el cambio de modo y la pausa automática sean reglas del núcleo.
- **Depende de:** M2 · **Archivos:** `src/core/comandos.ts`, `src/core/estado.ts` · **Crítico:** no

**Subtareas**
- M4-T01.1 `CambiarModo` (existente en Raíces): revisar que pausa al entrar en Plano si el ajuste lo pide y reanuda al salir con la velocidad anterior.
- M4-T01.2 Tecla Tab que envía el comando.

**Criterios de aceptación**
- [ ] Salir del Modo Plano devuelve la velocidad que había antes, no x1.

**Tests unitarios**
- `modo.test.ts`: "entrar en Plano pausa", "salir restaura la velocidad previa", "con el ajuste desactivado no pausa".

---

### M4-T02 · Transición de cámara
- **Objetivo:** el "momento mágico": la cámara sube de la espalda del granjero al cielo y baja de vuelta.
- **Depende de:** T01 · **Archivos:** `src/world/camaras/transicion.ts`, `src/world/camaras/plano.ts` · **Crítico:** no

**Subtareas**
- M4-T02.1 Cámara de plano orbital con zoom (rueda), giro (botón derecho) y límites de altura e inclinación.
- M4-T02.2 Interpolación de posición y objetivo con curva suave (≈ 0,8 s).
- M4-T02.3 Interrumpible: pulsar Tab a mitad invierte la transición desde donde está.

**Criterios de aceptación**
- [ ] No hay saltos de cámara al empezar, terminar o invertir la transición.

**Tests unitarios**
- `transicion.test.ts`: "t=0 da el origen y t=1 el destino", "la curva es monótona", "invertir a mitad parte de la posición actual".

---

### M4-T03 · Rejilla, lindes y desaturación
- **Objetivo:** que el Modo Plano se lea como un plano.
- **Depende de:** T01 · **Archivos:** `src/world/plano/rejilla.ts`, `src/world/plano/lindes.ts` · **Crítico:** no

**Subtareas**
- M4-T03.1 Rejilla de 1 m sobre las parcelas propias.
- M4-T03.2 Lindes de todas las parcelas siguiendo el terreno; las propias resaltadas.
- M4-T03.3 Mundo ligeramente desaturado en Modo Plano.

**Criterios de aceptación**
- [ ] La rejilla y las lindes solo se ven en Modo Plano.
- [ ] Las lindes no se hunden en el terreno.

**Tests unitarios:** sin tests (solo dibujo).

---

### M4-T04 · Seleccionar una parcela con el ratón
- **Objetivo:** saber qué parcela y casilla hay bajo el cursor.
- **Depende de:** M1 · **Archivos:** `src/world/plano/seleccion.ts`, `src/core/mapa.ts` · **Crítico:** no

**Subtareas**
- M4-T04.1 Rayo del cursor contra el terreno → punto en metros.
- M4-T04.2 `parcelaEn(x, z)` y `casillaEn(x, z)` puras.
- M4-T04.3 Resaltado de la parcela bajo el cursor.

**Criterios de aceptación**
- [ ] Un punto en la linde entre dos parcelas pertenece siempre a la misma (regla fija).
- [ ] Fuera del valle no se selecciona nada.

**Tests unitarios**
- `mapa.test.ts`: "parcelaEn en el centro de cada parcela", "regla en las lindes", "fuera del valle → null".

---

### M4-T05 · Panel de parcela y compra
- **Objetivo:** ver los atributos y el precio de una parcela y comprarla.
- **Depende de:** T04 · **Archivos:** `src/ui/plano/PanelParcela.tsx`, `src/core/parcelas.ts` · **Crítico:** **sí** (economía y parcelas)

**Subtareas**
- M4-T05.1 Clic en una parcela abre el panel: tipo, fertilidad, agua, precio y si se puede comprar.
- M4-T05.2 Botón Comprar con confirmación dentro del panel → `ComprarParcela`.
- M4-T05.3 Mensaje claro cuando no se puede (no adyacente, sin dinero).

**Criterios de aceptación**
- [ ] El precio mostrado es exactamente el que cobra el núcleo.
- [ ] Sin dinero suficiente el botón está desactivado y dice cuánto falta.
- [ ] No se puede comprar dos veces la misma parcela.

**Tests unitarios**
- `parcelas.test.ts`: "la primera compra es libre de adyacencia", "la segunda exige adyacencia", "en diagonal no es adyacente", "el dinero nunca queda negativo", "comprar dos veces se rechaza".

---

### M4-T06 · Mojones y carteles físicos
- **Objetivo:** que las parcelas en venta y las propias se vean en el mundo, también en Modo Vida.
- **Depende de:** T05 · **Archivos:** `src/world/parcelas/` · **Crítico:** no

**Subtareas**
- M4-T06.1 Cartel "Se vende" en las parcelas comprables (adyacentes a las propias).
- M4-T06.2 Mojones en las esquinas de las parcelas propias.
- M4-T06.3 Al comprar: el cartel desaparece y los mojones aparecen con una animación corta.

**Criterios de aceptación**
- [ ] Los carteles se actualizan al comprar (aparecen en las nuevas adyacentes).

**Tests unitarios**
- `carteles.test.ts`: "solo las parcelas comprables tienen cartel", "tras comprar, las nuevas adyacentes lo tienen".

---

### M4-T07 · Dinero en el HUD
- **Objetivo:** ver las monedas en todo momento.
- **Depende de:** T05 · **Archivos:** `src/ui/hud/Estado.tsx` · **Crítico:** no

**Subtareas**
- M4-T07.1 Monedas arriba a la derecha con separador de miles.
- M4-T07.2 Animación breve al cambiar (sube o baja).

**Criterios de aceptación**
- [ ] El número coincide siempre con el estado.

**Tests unitarios**
- `formato.test.ts`: "1240 → 1.240", "0 → 0".
