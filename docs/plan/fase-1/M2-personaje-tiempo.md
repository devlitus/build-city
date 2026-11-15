# M2 — Personaje y tiempo

> **Rama:** `hito/M2-personaje-tiempo` (desde `fase/1-mvp`) · **Milestone:** `M2 — Personaje y tiempo`
> Fase: [Fase 1](README.md) · GDD §5, §7.1, §8

## Objetivo
El jugador controla al granjero en tercera persona por el valle mientras pasa el día: el sol se mueve, las sombras cambian, llega la noche y el tiempo se puede pausar y acelerar.

## Criterios de aceptación del hito
- [ ] El granjero se mueve con WASD y la cámara se orbita con el ratón, sin atravesar obstáculos ni salir del valle.
- [ ] Pasa un día completo (06:00 → 02:00) con el sol, la luz y las sombras cambiando de forma continua.
- [ ] Pausa y velocidades x1/x2/x3 funcionan y se ven en el HUD.

## Paralelismo
`T01` y `T06` primero, en paralelo. Después `T02`, `T03` y `T05`. `T04` necesita `T01` y `T03`. `T07` necesita `T06`. `T08` necesita `T05`.

---

### M2-T01 · Movimiento continuo y colisiones en el núcleo
- **Objetivo:** que la posición del personaje sea continua (en metros) y que el núcleo resuelva colisiones y límites.
- **Depende de:** M1 · **Archivos:** `src/core/personaje.ts`, `src/core/colision.ts`, `src/core/comandos.ts`, `data/personaje.json` · **Crítico:** no

**Subtareas**
- M2-T01.1 Comando `MoverPersonaje` con dirección (x, z), duración del paso y si corre.
- M2-T01.2 Velocidades de andar y correr en `data/personaje.json`.
- M2-T01.3 Colisión círculo (personaje) contra cajas (obstáculos y edificios) con deslizamiento por la pared.
- M2-T01.4 Límites del valle y del río (no se cruza el río salvo por los vados).

**Criterios de aceptación**
- [ ] El personaje nunca acaba dentro de un obstáculo, aunque el paso sea grande.
- [ ] Al chocar en diagonal contra una pared, se desliza a lo largo de ella.
- [ ] Correr es más rápido que andar según `personaje.json`.

**Tests unitarios**
- `colision.test.ts`: "no entra en un obstáculo", "se desliza en diagonal", "no sale del valle", "solo cruza el río por un vado", "un paso enorme no atraviesa obstáculos finos".
- `personaje.test.ts`: "andar y correr usan sus velocidades", "dirección cero no mueve".

---

### M2-T02 · Seguir la altura del terreno
- **Objetivo:** que el granjero pise el suelo en las pendientes.
- **Depende de:** T01 · **Archivos:** `src/world/personaje/altura.ts` · **Crítico:** no

**Subtareas**
- M2-T02.1 Altura del personaje = `alturaTerreno` en su posición, con suavizado vertical.

**Criterios de aceptación**
- [ ] Los pies no se hunden ni flotan en las colinas.

**Tests unitarios**
- `suavizado.test.ts`: "el suavizado converge a la altura objetivo", "no se pasa de largo".

---

### M2-T03 · Granjero provisional y animación
- **Objetivo:** un granjero low-poly reconocible (sombrero, peto) a 1,75 m, que anda y corre.
- **Depende de:** M1 · **Archivos:** `src/world/personaje/modelo.ts`, `src/world/personaje/animacion.ts` · **Crítico:** no

**Subtareas**
- M2-T03.1 Modelo por código como el del visor (piernas, brazos, cabeza, sombrero).
- M2-T03.2 Animación procedural de andar y correr (balanceo de piernas y brazos, rebote) según la velocidad.
- M2-T03.3 Giro suave hacia la dirección de movimiento.

**Criterios de aceptación**
- [ ] Parado no se balancea; andando y corriendo, la cadencia cambia.
- [ ] Mide 1,75 m en la escena.

**Tests unitarios**
- `animacion.test.ts`: "la fase del paso depende de la velocidad", "parado devuelve la pose neutra", "el giro toma el camino más corto".

---

### M2-T04 · Control en tercera persona
- **Objetivo:** cámara libre detrás del hombro y control relativo a la cámara.
- **Depende de:** T01, T03 · **Archivos:** `src/world/camaras/tercera-persona.ts`, `src/juego/entrada.ts` · **Crítico:** no

**Subtareas**
- M2-T04.1 Entrada de teclado (WASD, Mayús) convertida en dirección relativa a la orientación de la cámara.
- M2-T04.2 Órbita con el ratón usando *pointer lock* (clic para capturar, Esc para soltar), con límites de inclinación.
- M2-T04.3 Cámara que sigue con suavizado y no entra en el terreno.
- M2-T04.4 Sensibilidad del ratón en ajustes (valor en datos por ahora).

**Criterios de aceptación**
- [ ] "W" siempre mueve hacia donde mira la cámara.
- [ ] La cámara nunca queda por debajo del terreno.
- [ ] Sin *pointer lock* el juego sigue funcionando (orbitar arrastrando).

**Tests unitarios**
- `entrada.test.ts`: "W con la cámara girada 90° mueve en X", "diagonales normalizadas", "sin teclas → dirección cero".
- `orbita.test.ts`: "la inclinación se limita", "el giro horizontal da la vuelta sin saltos".

---

### M2-T05 · Reloj, pausa y velocidades
- **Objetivo:** conectar el tiempo del núcleo de Raíces al bucle y al teclado.
- **Depende de:** M0-T05 · **Archivos:** `src/juego/tiempo.ts`, `data/tiempo.json` · **Crítico:** no

**Subtareas**
- M2-T05.1 Teclas: Espacio para pausa, 1/2/3 con modificador para velocidades (para no chocar con las herramientas de M3).
- M2-T05.2 Revisar `data/tiempo.json`: un día ≈ 15 minutos reales a x1.

**Criterios de aceptación**
- [ ] En pausa no avanza ni el reloj ni el personaje.
- [ ] A x3 el día dura un tercio.

**Tests unitarios**
- `tiempo.test.ts` (núcleo): "x2 avanza el doble de minutos por paso", "en pausa no avanza", "a las 02:00 se dispara el desmayo".

---

### M2-T06 · Luz del día
- **Objetivo:** calcular color del cielo, sol, luz ambiente y luces de ventanas según la hora.
- **Depende de:** M0 · **Archivos:** `src/world/luz-dia.ts`, `data/luz.json` · **Crítico:** no

**Subtareas**
- M2-T06.1 Claves de luz en `data/luz.json` (como en el visor: amanecer, mañana, mediodía, tarde, atardecer, anochecer, noche).
- M2-T06.2 `luzDelDia(hora)`: interpolación entre claves, cíclica a las 24 h.
- M2-T06.3 Dirección del sol de este a oeste; de noche, luz de luna tenue.

**Criterios de aceptación**
- [ ] No hay saltos de luz al pasar de una clave a otra ni a medianoche.
- [ ] De noche se encienden las luces (intensidad > 0) y de día se apagan.

**Tests unitarios**
- `luz-dia.test.ts`: "en una clave devuelve exactamente sus valores", "es continua en 23:59 → 00:00", "el sol está sobre el horizonte entre el amanecer y el atardecer", "las luces se encienden de noche".

---

### M2-T07 · Sombras que siguen a la cámara
- **Objetivo:** sombras nítidas cerca del jugador sin coste alto.
- **Depende de:** T06 · **Archivos:** `src/world/sombras.ts` · **Crítico:** no

**Subtareas**
- M2-T07.1 La cámara de sombras del sol sigue al objetivo de la cámara principal, con paso redondeado para evitar parpadeo.
- M2-T07.2 Ajustar *bias* y tamaño del mapa (2048) para que no haya acné de sombra.

**Criterios de aceptación**
- [ ] Las sombras no parpadean al moverse.
- [ ] No hay franjas ni manchas en el suelo.

**Tests unitarios**
- `sombras.test.ts`: "el centro de la sombra se redondea al tamaño de texel".

---

### M2-T08 · HUD mínimo
- **Objetivo:** mostrar hora, día, estación, pausa y velocidad.
- **Depende de:** T05 · **Archivos:** `src/ui/hud/Reloj.tsx`, `src/ui/textos/` · **Crítico:** no

**Subtareas**
- M2-T08.1 Panel arriba a la izquierda con el estilo del visor.
- M2-T08.2 Textos externalizados en `src/ui/textos/`.

**Criterios de aceptación**
- [ ] El HUD no tapa al personaje ni el centro de la pantalla.
- [ ] Los textos no están escritos a mano en los componentes.

**Tests unitarios**
- `formato.test.ts`: "formatea 375 minutos como 06:15", "nombre de estación y día correctos".
