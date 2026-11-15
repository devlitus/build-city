# ROADMAP — Raíces 3D

> **Versión:** 0.1 · 2026-11-15
> Referencia de diseño: [GDD.md](GDD.md) · Material visual: [borrador/](borrador/)
> Basado en el ROADMAP de [Raíces 2D](../build-frame/ROADMAP.md), adaptado a three.js y a las decisiones del GDD §12.

## Principios

- **Incremental:** cada hito termina en algo **jugable** en el navegador.
- **Vertical:** mejor un sistema pequeño completo (lógica + escena 3D + UI + tests) que muchos a medias.
- **Primero los *placeholders*:** cajas, conos y colores planos (como los bocetos de Blender). El arte final nunca bloquea un hito.
- **El núcleo manda:** toda regla de juego vive en `src/core` (copiado de Raíces), puro y determinista. La escena 3D solo dibuja el estado y envía comandos.
- **Definición de "hecho" (DoD)**, válida para todos los hitos:
  1. Los criterios de aceptación del hito se cumplen.
  2. La lógica del núcleo tiene tests en verde y la CI pasa (lint, tipos, tests y build).
  3. Se juega en un navegador de escritorio (Chrome, Firefox y Edge actuales) a **60 fps en un PC medio**.
  4. Hasta M8: se juega con `npm run preview` en local. Desde M8: está desplegado en la URL de pruebas.
  5. GDD/ROADMAP/ADRs están actualizados si algo cambió.

## Visión general

```
Fase 1 · MVP             M0 → M8   → v0.1 "Primera cosecha 3D"
Fase 2 · Profundidad     M9 → M15  → v0.2 … v0.5
Fase 3 · Online          M16 → M18 → v0.6 … v1.0
Transversal              Arte, audio, rendimiento, accesibilidad
```

---

## Fase 1 · MVP

### M0 — Cimientos
**Objetivo:** el proyecto existe, se construye, se testea y pinta una escena 3D.
- Repositorio Git y estructura: `src/core/`, `src/world/` (three.js), `src/ui/` (Preact), `src/save/`, `data/`, `assets-src/`.
- Vite + TypeScript estricto + three.js + Preact.
- **Copia del núcleo de Raíces** (`src/core`, `data/*.json`) con sus tests pasando tal cual.
- ESLint, Prettier, Vitest y Playwright configurados. CI en GitHub Actions: lint → formato → tipos → tests → build.
- Escena mínima: suelo, luz de sol y de hemisferio, cielo, niebla, contador de fps en desarrollo.
- **Prueba de estilo visual:** la misma escena de muestra en *low-poly* plano, *toon* y pintado; se elige uno y se registra en un ADR.
- ADRs iniciales: three.js como motor, copia del núcleo, estilo visual, pipeline de arte (Blender → `.glb`).

**Aceptación:** la CI pasa en verde, los tests del núcleo copiado siguen en verde y la escena de muestra se ve a 60 fps.

### M1 — El valle 3D
**Objetivo:** ver y recorrer el terreno.
- Terreno por *heightmap* con el valle central llano, colinas y montañas alrededor.
- Parcelas de 20×20 m generadas desde `data/valle.json` (prado, bosque, rocosa, río) con su color y relleno.
- Río con material de agua sencillo.
- Árboles, rocas y hierba con `InstancedMesh`; chunks de 20×20 m y LOD de árboles.
- Cámara libre de depuración (vuelo) para recorrer el valle.
- Pueblo como bloques *placeholder* al sur.

**Aceptación:** se recorre todo el valle a 60 fps con todos los árboles y rocas visibles; el valle generado coincide con el boceto `borrador/blender/valle.png`.

### M2 — Personaje y tiempo
**Objetivo:** el mundo vive y el jugador está en él.
- Granjero *placeholder* (cápsula con sombrero) a escala de 1,75 m.
- Control en tercera persona libre: WASD, Mayús para correr, ratón para orbitar (*pointer lock*).
- Colisión cápsula contra árboles, rocas, edificios y límites del valle; el personaje sigue la altura del terreno.
- Reloj de juego, ciclo de día y noche con el sol moviéndose y sombras en cascada cerca de la cámara.
- Pausa y velocidades x1/x2/x3.
- HUD mínimo: hora, día y estación.

**Aceptación:** pasa un día completo con el sol y las sombras moviéndose; el personaje no atraviesa obstáculos ni se sale del valle.

### M3 — Recolección
**Objetivo:** los primeros recursos salen del mundo.
- Hacha y pico; apuntar al objeto delante del personaje y aviso contextual ("E — Talar").
- Árboles que caen y dejan tocón; rocas que se rompen. Partículas y sonido *placeholder*.
- Madera y piedra al inventario (comandos del núcleo existentes).
- Energía: cada golpe la consume; barra en el HUD.
- Barra de herramientas 1–9.
- Plantones para replantar árboles (regla de Raíces).

**Aceptación:** se talan y pican obstáculos, el inventario y la energía cambian según los tests del núcleo y el estado del mundo 3D coincide siempre con el del núcleo.

### M4 — Parcelas y Modo Plano
**Objetivo:** la primera decisión económica y la segunda cámara.
- **Modo Plano** (Tab): transición animada de la cámara desde la espalda del granjero a la vista cenital orbital; el mundo se desatura y aparece la cuadrícula de 1 m. Pausa automática.
- Mojones y carteles "Se vende" físicos en las parcelas en venta.
- Seleccionar una parcela: panel con atributos y precio. Compra con regla de adyacencia.
- Dinero inicial y animación de mojones al comprar.

**Aceptación:** se compra la primera parcela libremente y las siguientes solo si son adyacentes; la transición entre cámaras es fluida y reversible en cualquier momento.

### M5 — Zonas y construcción
**Objetivo:** organizar la granja y levantar los primeros edificios.
- Pintar zonas (Cultivo, Huerto, Vivienda, Almacén) como capa translúcida, solo visible en Modo Plano.
- Catálogo inicial: tienda de campaña, caja de envío, cobertizo y casa.
- Colocación sobre la cuadrícula, rotación de 90° (R), fantasma azul o rojo y lista de materiales que faltan.
- Nivelar el terreno bajo el edificio.
- Obra visible por etapas (cimientos → andamios → paredes → tejado) que dura días de juego.
- Mover y demoler.
- **Arte en paralelo:** modelos `.glb` de los cuatro edificios y sus etapas de obra en el estilo elegido en M0. Se conectan al juego al terminar el hito.

**Aceptación:** se diseña una pequeña granja con zonas y tres edificios; las reglas de colocación tienen tests; las obras avanzan al dormir.

### M6 — Vallas y caminos
**Objetivo:** dar forma a la granja a mano.
- Vallas que se dibujan arrastrando en Modo Plano (V): postes cada 2 m, esquinas automáticas y puertas que se abren al pasar.
- Caminos de grava que se pintan sobre la cuadrícula (C) y aumentan la velocidad del personaje.
- Coste en materiales (madera para vallas, piedra para caminos) y reembolso al borrar.
- Las vallas bloquean el paso; los caminos no.

**Aceptación:** se cierra una parcela con valla y puerta y se traza un camino de la casa a la caja de envío; las reglas tienen tests.

### M7 — Cultivos
**Objetivo:** el bucle de granja completo.
- Arar con la azada, plantar, regar con la regadera y cosechar los 5 cultivos de primavera de Raíces.
- Un modelo por fase de crecimiento, dibujado con `InstancedMesh`; las plantas se mecen con el viento.
- Tierra regada visiblemente más oscura.
- Regadera mejorable a 3×3 pronto (lección de Lightyear Frontier: regar a mano cansa).

**Aceptación:** un cultivo pasa de semilla a cosecha en los días previstos por `data/cultivos.json`; 2.000 plantas en pantalla mantienen 60 fps.

### M8 — Economía, guardado y publicación → **v0.1 "Primera cosecha 3D"**
**Objetivo:** cerrar el día y poder jugar varias sesiones.
- Caja de envío: vender a precio base, cobro al día siguiente.
- Dormir en la tienda o en la casa: resumen del día y guardado automático.
- Guardado en IndexedDB con copias de seguridad, exportar e importar partida (ADR 0001 de Raíces).
- Pantalla de título y ajustes básicos (sensibilidad del ratón, calidad gráfica, volumen).
- Despliegue en la URL de pruebas (Vercel o similar) desde la CI.

**Aceptación:** se juega una partida de varios días, se cierra el navegador y se continúa donde se dejó; la versión está desplegada y la prueban amigos.

---

## Fase 2 · Profundidad

| Hito | Contenido | Versión |
|---|---|---|
| **M9 — Estaciones y clima** | 4 estaciones con cultivos propios, nieve en tejados, hojas en otoño, lluvia que riega, niebla de mañana, tormentas raras | v0.2 |
| **M10 — Pueblo y mercado** | Pueblo modelado, mercado con precios dinámicos suaves, tienda de semillas y materiales, carpintero que levanta las obras | v0.2 |
| **M11 — Materiales y procesado** | Fibra y arcilla, aserradero, horno y telar; tablones, ladrillos y cuerda; almacén visible (la leñera se llena) | v0.3 |
| **M12 — Animales** | Gallinero y establo, gallinas, vacas y ovejas con IA de corral, productos y afinidad | v0.3 |
| **M13 — Vecinos y proyectos** | 8–12 vecinos con horario, amistad y encargos; proyectos que cambian el pueblo a la vista (reparar el puente) | v0.4 |
| **M14 — Decoración y carro** | Setos, farolas, bancos y macetas; el carro para moverse más rápido y cargar más; bienestar por decorar | v0.4 |
| **M15 — Exploración** | Ruinas con materiales escasos y fragmentos de historia, miradores con foto del progreso, recursos raros fuera del valle | v0.5 |

## Fase 3 · Online

| Hito | Contenido | Versión |
|---|---|---|
| **M16 — Nube** | Cuenta sencilla y partida guardada en la nube | v0.6 |
| **M17 — Social asíncrono** | Visitar la granja de un amigo en 3D (solo ver), regalos y tablón de pedidos | v0.8 |
| **M18 — Cooperativo (experimental)** | Dos jugadores en la misma granja en tiempo real | v1.0 |

---

## Transversal

### Arte
- **Estilo:** se decide en M0 con la prueba comparativa (low-poly plano, *toon* o pintado) y queda en un ADR.
- **Pipeline:** concepto en ComfyUI → modelo en Blender (o prototipo con Hunyuan3D 2.1 y retopología) → `.glb` con meshopt → ficha en `assets-src/fichas/`.
- **Regla:** todo recurso tiene ficha (prompt, semilla, modelo o `.blend`) para poder regenerarlo.
- **Orden:** el arte de cada hito se produce en paralelo al hito y se conecta al terminarlo.

### Audio
Música ambiental por estación y efectos por herramienta, de librerías CC0/CC-BY al principio. Sonido posicional 3D (`PositionalAudio`) para el río, los animales y las obras.

### Rendimiento
- Presupuesto orientativo: < 300 llamadas de dibujo y < 500.000 triángulos en pantalla.
- Medición en cada hito con el contador de fps y una escena de estrés en Playwright.
- Calidad gráfica ajustable (sombras, distancia de dibujo, densidad de hierba) desde M8.

### Accesibilidad
Teclas reasignables, sensibilidad e inversión del ratón, tamaño de texto de la UI, paletas aptas para el daltonismo en zonas e indicadores, y opción de reducir el movimiento de cámara.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El núcleo 2D no encaja en algún punto con el mundo 3D (alturas, colisiones) | La lógica sigue en la cuadrícula de 1 m; la altura y la colisión son solo de la vista. Revisarlo en M1–M2 |
| Rendimiento con mucha vegetación | `InstancedMesh`, LOD y chunks desde M1; escena de estrés en la CI |
| Arte 3D lento de producir | *Placeholders* siempre; estilo sencillo; modelos generados por script en Blender |
| La cámara libre marea o molesta al construir | El Modo Plano tiene su propia cámara; probar con jugadores en M4 |
| El estilo visual elegido no convence tras el MVP | La prueba de estilo de M0 se hace antes de producir arte final |
