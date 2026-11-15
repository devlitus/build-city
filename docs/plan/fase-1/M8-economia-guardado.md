# M8 — Economía, guardado y publicación → v0.1

> **Rama:** `hito/M8-economia-guardado` (desde `fase/1-mvp`) · **Milestone:** `M8 — Economía, guardado y publicación`
> Fase: [Fase 1](README.md) · GDD §7.9, §10

## Objetivo
Cerrar el día y poder jugar varias sesiones: vender en la caja de envío, dormir con resumen, guardar en el navegador y publicar la versión para probarla.

## Criterios de aceptación del hito
- [ ] Se juega una partida de varios días, se cierra el navegador y se continúa donde se dejó.
- [ ] Lo vendido en la caja se cobra al día siguiente y aparece en el resumen.
- [ ] La versión está desplegada en una URL de pruebas desde la CI.

## Paralelismo
`T01`, `T03` y `T05` en paralelo. `T02` necesita `T01`. `T04` necesita `T03`. `T06` y `T07` al final.

---

### M8-T01 · Caja de envío
- **Objetivo:** vender productos desde la granja y cobrar al día siguiente.
- **Depende de:** M5 (la caja como edificio), M7 · **Archivos:** `src/core/venta.ts`, `src/core/comandos.ts`, `data/economia.json` · **Crítico:** **sí** (economía)

**Subtareas**
- M8-T01.1 Comando `DepositarEnCaja(objeto, cantidad)` desde el inventario; se puede retirar mientras no sea de noche.
- M8-T01.2 Al dormir se vende todo a precio base (y calidad si existe) y se cobra.
- M8-T01.3 Panel de la caja (E junto a ella) con lo depositado y el total previsto.

**Criterios de aceptación**
- [ ] El dinero cobrado es exactamente la suma de cantidad × precio de `economia.json`.
- [ ] No se puede depositar más de lo que hay en el inventario.
- [ ] Retirar devuelve los objetos al inventario sin pérdidas.

**Tests unitarios**
- `venta.test.ts`: "depositar resta del inventario", "no deposita más de lo que hay", "retirar devuelve", "al dormir cobra el total exacto", "la caja queda vacía tras cobrar", "el dinero nunca es negativo".

---

### M8-T02 · Dormir y resumen del día
- **Objetivo:** cerrar el día con una pausa agradable.
- **Depende de:** T01 · **Archivos:** `src/ui/ResumenDia.tsx`, `src/world/transiciones.ts` · **Crítico:** no

**Subtareas**
- M8-T02.1 E en la tienda o en la cama de la casa → `Dormir` (regla de Raíces).
- M8-T02.2 Fundido a negro, resumen (ventas, obras terminadas, cultivos listos) y amanecer.

**Criterios de aceptación**
- [ ] El resumen coincide con los eventos del núcleo de esa noche.

**Tests unitarios**
- `resumen.test.ts`: "agrupa los eventos de la noche en las líneas del resumen".

---

### M8-T03 · Guardado en el navegador
- **Objetivo:** que la partida no se pierda.
- **Depende de:** M0 · **Archivos:** `src/save/` (a partir del de Raíces, ADR 0001 de Raíces) · **Crítico:** **sí** (guardado)

**Subtareas**
- M8-T03.1 Copiar y adaptar `build-frame/src/save/`: documento JSON versionado en IndexedDB.
- M8-T03.2 Guardado automático al dormir, 3 copias rotativas y aviso si una está corrupta (se carga la anterior).
- M8-T03.3 Migración de la versión 1 a la siguiente como plantilla para el futuro.
- M8-T03.4 Continuar partida desde la pantalla de título.

**Criterios de aceptación**
- [ ] Guardar y cargar devuelve exactamente el mismo estado.
- [ ] Una copia corrupta no impide jugar: se usa la anterior y se avisa.
- [ ] El guardado no bloquea el juego de forma perceptible.

**Tests unitarios**
- `guardado.test.ts`: "guardar y cargar devuelve el mismo estado", "rota las 3 copias", "copia corrupta → carga la anterior", "migra de v1 a v2", "versión desconocida → error claro".

---

### M8-T04 · Exportar e importar partida
- **Objetivo:** mover la partida entre navegadores o guardar una copia.
- **Depende de:** T03 · **Archivos:** `src/save/archivo.ts`, `src/ui/Ajustes.tsx` · **Crítico:** no

**Subtareas**
- M8-T04.1 Exportar a un archivo `.json` desde Ajustes.
- M8-T04.2 Importar con validación y confirmación en pantalla.

**Criterios de aceptación**
- [ ] Un archivo inválido no sustituye la partida actual.

**Tests unitarios**
- `archivo.test.ts`: "exportar e importar devuelve el mismo estado", "archivo inválido se rechaza".

---

### M8-T05 · Pantalla de título y ajustes
- **Objetivo:** empezar, continuar y ajustar el juego.
- **Depende de:** M0 · **Archivos:** `src/ui/Titulo.tsx`, `src/ui/Ajustes.tsx`, `src/juego/ajustes.ts` · **Crítico:** no

**Subtareas**
- M8-T05.1 Título con Nueva partida y Continuar (si hay guardado).
- M8-T05.2 Ajustes: sensibilidad e inversión del ratón, calidad gráfica (sombras, distancia de dibujo, densidad de hierba), volumen, pausa automática en Modo Plano.
- M8-T05.3 Los ajustes se guardan aparte de la partida.

**Criterios de aceptación**
- [ ] Cambiar la calidad se aplica sin recargar.

**Tests unitarios**
- `ajustes.test.ts`: "cada nivel de calidad da su configuración", "valores fuera de rango se limitan", "ajustes por defecto si no hay nada guardado".

---

### M8-T06 · Despliegue
- **Objetivo:** una URL para probar la versión.
- **Depende de:** M0-T02 · **Archivos:** `.github/workflows/`, `docs/adr/0006-despliegue.md` · **Crítico:** no

**Subtareas**
- M8-T06.1 Elegir servicio (Vercel o GitHub Pages) y documentarlo en un ADR.
- M8-T06.2 Despliegue de la rama `fase/1-mvp` a la URL de pruebas y de `main` a la de producción.

**Criterios de aceptación**
- [ ] Cada *push* a `fase/1-mvp` actualiza la URL de pruebas.

**Tests unitarios:** sin tests (configuración).

---

### M8-T07 · Notas de versión
- **Objetivo:** que quien pruebe sepa qué hay, qué falta y qué probar.
- **Depende de:** T06 · **Archivos:** `CHANGELOG.md`, `docs/notas/v0.1.md` · **Crítico:** no

**Subtareas**
- M8-T07.1 Changelog de la fase a partir de las PRs integradas.
- M8-T07.2 Notas para amigos: novedades, problemas conocidos (issues abiertas) y controles.

**Criterios de aceptación**
- [ ] Las notas enlazan la URL de pruebas y listan los controles.

**Tests unitarios:** sin tests (documentación).
